import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";

// Sessão do dono: cookie assinado, ligado ao restaurante e à senha atual
// (trocar a senha derruba todas as sessões antigas).
const secret = () => process.env.SESSION_SECRET ?? process.env.FEEDBACK_SALT ?? "dev-secret";
const sign = (v: string) => createHmac("sha256", `owner-session|${secret()}`).update(v).digest("base64url");
const stamp = (hash: string) => createHash("sha256").update(hash).digest("hex").slice(0, 16);

export const ownerCookie = (slug: string) => `owner_${slug}`;
export const OWNER_SESSION_HOURS = 12;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calc = scryptSync(password, salt, 32);
  const real = Buffer.from(hash, "hex");
  return calc.length === real.length && timingSafeEqual(calc, real);
}

export function makeOwnerSession(restaurantId: string, passwordHash: string): string {
  const payload = Buffer.from(
    JSON.stringify({ r: restaurantId, p: stamp(passwordHash), e: Date.now() + OWNER_SESSION_HOURS * 3_600_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSession(raw?: string): { r: string; p: string } | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    return d.e > Date.now() ? { r: d.r, p: d.p } : null;
  } catch {
    return null;
  }
}

// Devolve o restaurante se quem acessa está logado como dono dele; senão, null.
export async function getOwnerRestaurant(slug: string) {
  const clean = slug.toLowerCase();
  const raw = (await cookies()).get(ownerCookie(clean))?.value; // lê o cookie antes de qualquer data/hora
  const session = readSession(raw);
  if (!session) return null;
  await connectDB();
  const r = await Restaurant.findOne({ slug: clean, active: true }).lean();
  if (!r || !r.ownerPasswordHash) return null;
  if (String(r._id) !== session.r || session.p !== stamp(r.ownerPasswordHash)) return null;
  return r;
}
