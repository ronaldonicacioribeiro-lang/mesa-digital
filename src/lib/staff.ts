import { createHmac, timingSafeEqual } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";

// Sessão do garçom: um cookie assinado (ninguém consegue forjar sem o segredo do servidor).
// O segredo é SESSION_SECRET; se não existir, usa FEEDBACK_SALT (já configurado na Netlify).
const secret = () => process.env.SESSION_SECRET ?? process.env.FEEDBACK_SALT ?? "dev-secret";
const sign = (v: string) => createHmac("sha256", `staff-session|${secret()}`).update(v).digest("base64url");

export const staffCookie = (slug: string) => `staff_${slug}`;
export const SESSION_HOURS = 12;

export function makeSession(staffId: string): string {
  const payload = Buffer.from(JSON.stringify({ s: staffId, e: Date.now() + SESSION_HOURS * 3_600_000 })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

function readSession(raw?: string): string | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.s === "string" && data.e > Date.now() ? data.s : null;
  } catch {
    return null;
  }
}

// Devolve o funcionário logado neste restaurante (ou null).
export async function getStaff(restaurantId: unknown, slug: string) {
  const raw = (await cookies()).get(staffCookie(slug))?.value; // lê o cookie antes de qualquer data/hora
  const id = readSession(raw);
  if (!id || !isValidObjectId(id)) return null;
  await connectDB();
  return Staff.findOne({ _id: id, restaurant: restaurantId, active: true }).lean();
}
