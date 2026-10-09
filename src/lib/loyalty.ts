import { createHash, scryptSync } from "node:crypto";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";

// Versão do texto da política de privacidade aceita no cadastro (mude ao alterar a política).
export const POLICY_VERSION = "2026-10";

// O que a tela do cartão precisa saber (nada além disso vai para o celular).
export type CardView = {
  name: string;
  stamps: number;
  required: number;
  reward: string;
  stampedToday: boolean;
  totalRedeemed: number;
};

export const cookieName = (slug: string) => `card_${slug}`;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const hashPin = (pin: string, slug: string) => scryptSync(pin, `pin:${slug}`, 32).toString("hex");

// Data de hoje no horário de Brasília (um carimbo por dia).
export const todayBR = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Acha o cartão deste celular pelo cookie.
export async function getCustomer(restaurantId: unknown, slug: string) {
  const code = (await cookies()).get(cookieName(slug))?.value;
  if (!code) return null;
  await connectDB();
  return Customer.findOne({ restaurant: restaurantId, cardTokenHash: hashToken(code) }).lean();
}

export function toCardView(
  c: { name: string; stamps: number; lastStampDay?: string | null; totalRedeemed?: number | null },
  loyalty: { stampsRequired?: number | null; reward?: string | null } | undefined,
): CardView {
  return {
    name: c.name,
    stamps: c.stamps,
    required: loyalty?.stampsRequired ?? 9,
    reward: loyalty?.reward ?? "",
    stampedToday: c.lastStampDay === todayBR(),
    totalRedeemed: c.totalRedeemed ?? 0,
  };
}
