"use server";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { findTable } from "@/lib/tables";
import {
  POLICY_VERSION,
  cookieName,
  getCustomer,
  hashPin,
  hashToken,
  todayBR,
  toCardView,
  type CardView,
} from "@/lib/loyalty";
import { Customer } from "@/models/Customer";

export type CardResult = { ok: boolean; error?: string; card?: CardView | null };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_SIGNUPS_PER_DAY = 5; // cadastros por pessoa (mesmo celular/rede) por dia
const MAX_PIN_FAILS = 5;
const LOCK_MINUTES = 60;

const fail = (error: string): CardResult => ({ ok: false, error });

// Toda ação confere o QR da mesa: só quem está no local consegue mexer no cartão.
async function context(slug: string, token: string) {
  const found = await findTable(slug, token);
  if (!found) return null;
  return { ...found, customer: await getCustomer(found.restaurant._id, found.restaurant.slug) };
}

export async function registerCard(slug: string, token: string, formData: FormData): Promise<CardResult> {
  const ctx = await context(slug, token);
  if (!ctx) return fail("Mesa inválida. Escaneie o QR Code novamente.");
  if (ctx.customer) return { ok: true, card: toCardView(ctx.customer, ctx.restaurant.loyalty) };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const consent = formData.get("consent") === "on";

  if (name.length < 2 || name.length > 60) return fail("Digite seu nome (entre 2 e 60 letras).");
  if (!EMAIL.test(email) || email.length > 120) return fail("Digite um e-mail válido.");
  if (!consent) return fail("Para criar o cartão, é preciso aceitar o uso dos seus dados.");

  // Limite de cadastros por pessoa/dia (código embaralhado, não guarda o IP).
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
  const salt = process.env.FEEDBACK_SALT ?? "dev-salt";
  const rateKey = createHash("sha256").update(`card|${ip}|${todayBR()}|${salt}`).digest("hex");

  await connectDB();
  if ((await Customer.countDocuments({ rateKey })) >= MAX_SIGNUPS_PER_DAY) {
    return fail("Muitos cadastros por hoje neste aparelho. Fale com um atendente.");
  }

  const emailLower = email.toLowerCase();
  if (await Customer.exists({ restaurant: ctx.restaurant._id, emailLower })) {
    // Sem verificação de e-mail não dá para entregar o cartão de outra pessoa.
    return fail("Este e-mail já tem um cartão. Abra pelo mesmo celular em que você se cadastrou.");
  }

  const code = randomBytes(32).toString("base64url");
  await Customer.create({
    restaurant: ctx.restaurant._id,
    name,
    email,
    emailLower,
    consentAt: new Date(),
    consentVersion: POLICY_VERSION,
    cardTokenHash: hashToken(code),
    rateKey,
  });

  (await cookies()).set(cookieName(ctx.restaurant.slug), code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, card: toCardView({ name, stamps: 0, lastStampDay: "", totalRedeemed: 0 }, ctx.restaurant.loyalty) };
}

export async function stampVisit(slug: string, token: string): Promise<CardResult> {
  const ctx = await context(slug, token);
  if (!ctx) return fail("Mesa inválida. Escaneie o QR Code novamente.");
  if (!ctx.customer) return fail("Crie seu cartão primeiro.");

  const required = ctx.restaurant.loyalty?.stampsRequired ?? 9;
  const today = todayBR();

  // Atualização única e condicional: impede dois carimbos no mesmo dia, mesmo com toques repetidos.
  const updated = await Customer.findOneAndUpdate(
    { _id: ctx.customer._id, lastStampDay: { $ne: today }, stamps: { $lt: required } },
    { $inc: { stamps: 1 }, $set: { lastStampDay: today } },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    const msg =
      ctx.customer.stamps >= required
        ? "Seu prêmio já está liberado! Chame um atendente para resgatar."
        : "Você já carimbou hoje. Volte na próxima visita!";
    return { ok: false, error: msg, card: toCardView(ctx.customer, ctx.restaurant.loyalty) };
  }
  return { ok: true, card: toCardView(updated, ctx.restaurant.loyalty) };
}

// O atendente digita o PIN no celular do cliente para confirmar a entrega do prêmio.
export async function redeemReward(slug: string, token: string, pin: string): Promise<CardResult> {
  const ctx = await context(slug, token);
  if (!ctx) return fail("Mesa inválida. Escaneie o QR Code novamente.");
  if (!ctx.customer) return fail("Crie seu cartão primeiro.");

  const required = ctx.restaurant.loyalty?.stampsRequired ?? 9;
  if (ctx.customer.stamps < required) return fail("O prêmio ainda não foi liberado.");
  if (!ctx.restaurant.staffPinHash) return fail("O resgate ainda não está configurado neste restaurante.");

  const lockedUntil = ctx.customer.pinLockedUntil;
  if (lockedUntil && lockedUntil > new Date()) {
    return fail("Muitas tentativas. Tente de novo mais tarde ou chame o gerente.");
  }

  const given = Buffer.from(hashPin(String(pin).trim(), ctx.restaurant.slug));
  const real = Buffer.from(ctx.restaurant.staffPinHash);
  const correct = given.length === real.length && timingSafeEqual(given, real);

  if (!correct) {
    const fails = (ctx.customer.pinFails ?? 0) + 1;
    const lock = fails >= MAX_PIN_FAILS;
    await Customer.updateOne(
      { _id: ctx.customer._id },
      lock
        ? { $set: { pinFails: 0, pinLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } }
        : { $set: { pinFails: fails } },
    );
    return fail(lock ? "Muitas tentativas. Tente de novo mais tarde ou chame o gerente." : "PIN incorreto.");
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: ctx.customer._id, stamps: { $gte: required } },
    { $set: { stamps: 0, pinFails: 0, pinLockedUntil: null }, $inc: { totalRedeemed: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) return fail("Não foi possível resgatar. Tente de novo.");
  return { ok: true, card: toCardView(updated, ctx.restaurant.loyalty) };
}

// Direito de eliminação (LGPD): apaga o cartão e os dados pessoais do cliente.
export async function deleteCard(slug: string, token: string): Promise<CardResult> {
  const ctx = await context(slug, token);
  if (!ctx) return fail("Mesa inválida. Escaneie o QR Code novamente.");
  if (ctx.customer) await Customer.deleteOne({ _id: ctx.customer._id });
  (await cookies()).delete(cookieName(ctx.restaurant.slug));
  return { ok: true, card: null };
}
