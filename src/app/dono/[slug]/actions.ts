"use server";

import { createHash, randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { cookies, headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { isAllowedMediaUrl, mediaConfigured } from "@/lib/media";
import { OWNER_SESSION_HOURS, getOwnerRestaurant, hashPassword, makeOwnerSession, ownerCookie, verifyPassword } from "@/lib/owner";
import { hashPin } from "@/lib/loyalty";
import { AuthAttempt } from "@/models/AuthAttempt";
import { Feedback } from "@/models/Feedback";
import { MenuItem } from "@/models/MenuItem";
import { Restaurant } from "@/models/Restaurant";
import { Staff } from "@/models/Staff";
import { Table } from "@/models/Table";

export type OwnerResult = { ok: boolean; error?: string };
const fail = (error: string): OwnerResult => ({ ok: false, error });
const NOT_LOGGED = "Sessão expirada. Entre de novo.";

const MAX_FAILS = 6;
const LOCK_MINUTES = 15;

// ---------- Entrar e sair ----------

export async function loginOwner(slug: string, password: string): Promise<OwnerResult> {
  const clean = slug.toLowerCase();
  await connectDB();
  const restaurant = await Restaurant.findOne({ slug: clean, active: true }).lean();
  if (!restaurant || !restaurant.ownerPasswordHash) return fail("Acesso não configurado para este restaurante.");

  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const salt = process.env.FEEDBACK_SALT ?? "dev-salt";
  const key = createHash("sha256").update(`owner|${ip}|${clean}|${salt}`).digest("hex");

  const attempt = await AuthAttempt.findOne({ key }).lean();
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    return fail(`Muitas tentativas. Tente de novo em ${LOCK_MINUTES} minutos.`);
  }

  if (!verifyPassword(password, restaurant.ownerPasswordHash)) {
    const updated = await AuthAttempt.findOneAndUpdate(
      { key },
      { $inc: { fails: 1 }, $set: { expiresAt: new Date(Date.now() + 60 * 60_000) } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    if (updated && updated.fails >= MAX_FAILS) {
      await AuthAttempt.updateOne({ key }, { $set: { fails: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } });
      return fail(`Muitas tentativas. Tente de novo em ${LOCK_MINUTES} minutos.`);
    }
    return fail("Senha incorreta.");
  }

  await AuthAttempt.deleteOne({ key });
  (await cookies()).set(ownerCookie(clean), makeOwnerSession(String(restaurant._id), restaurant.ownerPasswordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logoutOwner(slug: string): Promise<OwnerResult> {
  (await cookies()).delete(ownerCookie(slug.toLowerCase()));
  return { ok: true };
}

// ---------- Cardápio ----------

export type ItemInput = {
  id?: string;
  name: string;
  category: string;
  description: string;
  price: string; // "32,00"
  promoPrice: string; // "" = sem promoção
  featured: boolean;
  available: boolean;
  imageUrl: string;
  videoUrl: string;
  posterUrl: string;
  modelGlbUrl: string;
  modelUsdzUrl: string;
};

const toCents = (v: string): number | null => {
  const n = Number(v.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100_000 ? Math.round(n * 100) : null;
};

export async function saveItem(slug: string, input: ItemInput): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);

  const name = input.name.trim();
  const category = input.category.trim();
  if (name.length < 2 || name.length > 60) return fail("O nome do prato deve ter de 2 a 60 letras.");
  if (category.length < 2 || category.length > 40) return fail("Informe a categoria (ex.: Hambúrgueres).");
  if (input.description.length > 300) return fail("A descrição pode ter no máximo 300 letras.");

  const priceCents = toCents(input.price);
  if (priceCents === null) return fail("Preço inválido. Use o formato 32,00.");
  let promoPriceCents: number | null = null;
  if (input.promoPrice.trim()) {
    promoPriceCents = toCents(input.promoPrice);
    if (promoPriceCents === null) return fail("Preço promocional inválido.");
    if (promoPriceCents >= priceCents) return fail("O preço promocional deve ser menor que o preço normal.");
  }

  for (const url of [input.imageUrl, input.videoUrl, input.posterUrl, input.modelGlbUrl, input.modelUsdzUrl]) {
    if (!isAllowedMediaUrl(url)) return fail("Endereço de arquivo não permitido. Envie o arquivo pelo painel.");
  }

  // A categoria já existente mantém a posição dela; categoria nova vai para o fim.
  const sameCat = await MenuItem.findOne({ restaurant: r._id, category }).lean();
  let categoryOrder = sameCat?.categoryOrder;
  if (categoryOrder === undefined) {
    const last = await MenuItem.findOne({ restaurant: r._id }).sort({ categoryOrder: -1 }).lean();
    categoryOrder = (last?.categoryOrder ?? -1) + 1;
  }

  const data = {
    category,
    categoryOrder,
    name,
    description: input.description.trim(),
    priceCents,
    promoPriceCents,
    featured: input.featured,
    available: input.available,
    imageUrl: input.imageUrl,
    videoUrl: input.videoUrl,
    posterUrl: input.posterUrl,
    modelGlbUrl: input.modelGlbUrl,
    modelUsdzUrl: input.modelUsdzUrl,
  };

  if (input.id) {
    if (!isValidObjectId(input.id)) return fail("Prato inválido.");
    const res = await MenuItem.updateOne({ _id: input.id, restaurant: r._id }, { $set: data });
    return res.matchedCount ? { ok: true } : fail("Prato não encontrado.");
  }

  const lastInCat = await MenuItem.findOne({ restaurant: r._id, category }).sort({ order: -1 }).lean();
  await MenuItem.create({ restaurant: r._id, ...data, order: (lastInCat?.order ?? -1) + 1 });
  return { ok: true };
}

export async function deleteItem(slug: string, id: string): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!isValidObjectId(id)) return fail("Prato inválido.");
  await MenuItem.deleteOne({ _id: id, restaurant: r._id });
  return { ok: true };
}

export async function setItemAvailable(slug: string, id: string, available: boolean): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!isValidObjectId(id)) return fail("Prato inválido.");
  await MenuItem.updateOne({ _id: id, restaurant: r._id }, { $set: { available } });
  return { ok: true };
}

// Sobe ou desce o prato dentro da categoria (troca a posição com o vizinho).
export async function moveItem(slug: string, id: string, dir: "up" | "down"): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!isValidObjectId(id)) return fail("Prato inválido.");
  const item = await MenuItem.findOne({ _id: id, restaurant: r._id }).lean();
  if (!item) return fail("Prato não encontrado.");

  const siblings = await MenuItem.find({ restaurant: r._id, category: item.category }).sort({ order: 1, _id: 1 }).lean();
  const i = siblings.findIndex((s) => String(s._id) === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= siblings.length) return { ok: true };

  // Renumera 0..n-1 com a troca feita, para não ficar posição repetida.
  const ids = siblings.map((s) => String(s._id));
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((sid, pos) => MenuItem.updateOne({ _id: sid }, { $set: { order: pos } })));
  return { ok: true };
}

// ---------- Mesas ----------

const newToken = () => randomBytes(9).toString("base64url");

export async function addTables(slug: string, count: number): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!Number.isInteger(count) || count < 1 || count > 50) return fail("Informe de 1 a 50 mesas.");

  const last = await Table.findOne({ restaurant: r._id }).sort({ number: -1 }).lean();
  const start = (last?.number ?? 0) + 1;
  if (start + count - 1 > 500) return fail("Limite de 500 mesas.");
  await Table.insertMany(
    Array.from({ length: count }, (_, k) => ({ restaurant: r._id, number: start + k, token: newToken(), active: true })),
  );
  return { ok: true };
}

export async function setTableActive(slug: string, id: string, active: boolean): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!isValidObjectId(id)) return fail("Mesa inválida.");
  await Table.updateOne({ _id: id, restaurant: r._id }, { $set: { active } });
  return { ok: true };
}

// Troca o código do QR: o QR impresso antigo deixa de funcionar na hora.
export async function rotateTableToken(slug: string, id: string): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!isValidObjectId(id)) return fail("Mesa inválida.");
  await Table.updateOne({ _id: id, restaurant: r._id }, { $set: { token: newToken() } });
  return { ok: true };
}

// ---------- Equipe ----------

export async function saveStaff(
  slug: string,
  input: { id?: string; name: string; pin: string },
): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);

  const name = input.name.trim();
  const pin = input.pin.trim();
  if (name.length < 2 || name.length > 40) return fail("O nome deve ter de 2 a 40 letras.");
  if (pin && !/^\d{4,8}$/.test(pin)) return fail("O PIN deve ter de 4 a 8 números.");

  try {
    if (input.id) {
      if (!isValidObjectId(input.id)) return fail("Funcionário inválido.");
      const set: Record<string, unknown> = { name };
      if (pin) set.pinHash = hashPin(pin, r.slug);
      const res = await Staff.updateOne({ _id: input.id, restaurant: r._id }, { $set: set });
      return res.matchedCount ? { ok: true } : fail("Funcionário não encontrado.");
    }
    if (!pin) return fail("Defina um PIN de 4 a 8 números.");
    await Staff.create({ restaurant: r._id, name, pinHash: hashPin(pin, r.slug), active: true });
    return { ok: true };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return fail("Já existe um funcionário com esse nome ou esse PIN.");
    throw e;
  }
}

export async function setStaffActive(slug: string, id: string, active: boolean): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!isValidObjectId(id)) return fail("Funcionário inválido.");
  await Staff.updateOne({ _id: id, restaurant: r._id }, { $set: { active } });
  return { ok: true };
}

// ---------- Feedbacks ----------

export async function markFeedbackRead(slug: string, id: string | "all"): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (id === "all") {
    await Feedback.updateMany({ restaurant: r._id, read: false }, { $set: { read: true } });
  } else {
    if (!isValidObjectId(id)) return fail("Feedback inválido.");
    await Feedback.updateOne({ _id: id, restaurant: r._id }, { $set: { read: true } });
  }
  return { ok: true };
}

// ---------- Ajustes ----------

export type SettingsInput = {
  name: string;
  tagline: string;
  logoText: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  instagram: string;
  googleReviewUrl: string;
  wifiSsid: string;
  wifiPassword: string;
  stampsRequired: number;
  reward: string;
  contactEmail: string;
  allowedIps: string; // separados por vírgula
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const isHttps = (u: string) => !u || /^https:\/\/[^\s]+$/.test(u);

export async function saveSettings(slug: string, s: SettingsInput): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);

  if (s.name.trim().length < 2 || s.name.length > 60) return fail("O nome deve ter de 2 a 60 letras.");
  if (s.tagline.length > 80) return fail("A frase pode ter até 80 letras.");
  if (s.logoText.length > 4) return fail("As iniciais do logo podem ter até 4 letras.");
  for (const c of [s.primary, s.secondary, s.background, s.text]) if (!HEX.test(c)) return fail("Cor inválida.");
  if (!isHttps(s.instagram) || !isHttps(s.googleReviewUrl)) return fail("Os links precisam começar com https://");
  if (s.wifiSsid.length > 32 || s.wifiPassword.length > 64) return fail("Dados do Wi-Fi muito longos.");
  if (!Number.isInteger(s.stampsRequired) || s.stampsRequired < 3 || s.stampsRequired > 20) {
    return fail("O cartão fidelidade deve ter de 3 a 20 carimbos.");
  }
  if (s.reward.length > 100) return fail("O prêmio pode ter até 100 letras.");
  if (s.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.contactEmail)) return fail("E-mail de contato inválido.");

  const ips = s.allowedIps
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (ips.length > 10 || ips.some((ip) => !/^[0-9a-fA-F:.]{3,45}$/.test(ip))) return fail("Lista de IPs inválida.");

  await Restaurant.updateOne(
    { _id: r._id },
    {
      $set: {
        name: s.name.trim(),
        tagline: s.tagline.trim(),
        logoText: s.logoText.trim(),
        colors: { primary: s.primary, secondary: s.secondary, background: s.background, text: s.text },
        instagram: s.instagram.trim(),
        googleReviewUrl: s.googleReviewUrl.trim(),
        wifi: { ssid: s.wifiSsid.trim(), password: s.wifiPassword },
        loyalty: { stampsRequired: s.stampsRequired, reward: s.reward.trim() },
        contactEmail: s.contactEmail.trim(),
        presence: { allowedIps: ips },
      },
    },
  );
  return { ok: true };
}

export async function changePassword(slug: string, current: string, next: string): Promise<OwnerResult> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return fail(NOT_LOGGED);
  if (!verifyPassword(current, r.ownerPasswordHash)) return fail("A senha atual está incorreta.");
  if (next.length < 8 || next.length > 100) return fail("A nova senha deve ter pelo menos 8 caracteres.");

  const hash = hashPassword(next);
  await Restaurant.updateOne({ _id: r._id }, { $set: { ownerPasswordHash: hash } });
  // A senha mudou: renova o cookie desta sessão (as outras sessões caem).
  (await cookies()).set(ownerCookie(r.slug), makeOwnerSession(String(r._id), hash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_SESSION_HOURS * 3600,
  });
  return { ok: true };
}

// ---------- Envio de arquivos (Cloudinary) ----------

export type UploadSignature = {
  ok: boolean;
  error?: string;
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  folder?: string;
  signature?: string;
};

// O navegador envia o arquivo direto para o Cloudinary (não passa pelo servidor, que tem limite de tamanho).
// Aqui só assinamos o pedido, com o segredo que fica guardado no servidor.
export async function signUpload(slug: string): Promise<UploadSignature> {
  const r = await getOwnerRestaurant(slug);
  if (!r) return { ok: false, error: NOT_LOGGED };
  if (!mediaConfigured()) {
    return { ok: false, error: "O envio de arquivos ainda não foi configurado (Cloudinary). Veja as instruções." };
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `mesa-digital/${r.slug}`;
  const toSign = `folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = createHash("sha1").update(toSign).digest("hex");
  return {
    ok: true,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  };
}
