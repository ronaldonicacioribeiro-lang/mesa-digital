"use server";

import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { findTable } from "@/lib/tables";
import { getTableCalls } from "@/lib/table-calls";
import { ServiceCall } from "@/models/ServiceCall";
import type { BillMethod, CallType, CallView } from "@/lib/calls";

export type CallResult = { ok: boolean; error?: string; created?: boolean; calls?: CallView[] };

const MAX_PER_HOUR = 8; // chamados por mesa por hora (contra brincadeira e abuso)
const fail = (error: string): CallResult => ({ ok: false, error });

// IP do cliente (a Netlify informa o IP real neste cabeçalho).
async function clientIp() {
  const h = await headers();
  return (h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
}

export async function createCall(
  slug: string,
  token: string,
  type: CallType,
  billMethod: BillMethod = "",
): Promise<CallResult> {
  const found = await findTable(slug, token); // o QR da mesa prova que a pessoa está no local
  if (!found) return fail("Mesa inválida. Escaneie o QR Code novamente.");
  const { restaurant, table } = found;

  if (type !== "waiter" && type !== "bill") return fail("Pedido inválido.");
  if (type === "bill" && !["pix", "card", "cash"].includes(billMethod)) return fail("Escolha a forma de pagamento.");

  // Validação de presença (opcional): só aceita pedidos vindos do Wi-Fi do restaurante.
  const allowed: string[] = restaurant.presence?.allowedIps ?? [];
  if (allowed.length > 0 && !allowed.includes(await clientIp())) {
    return fail("Conecte-se ao Wi-Fi do restaurante para chamar o atendimento, ou levante a mão para um garçom.");
  }

  await connectDB();

  const lastHour = new Date(Date.now() - 3_600_000);
  if ((await ServiceCall.countDocuments({ restaurant: restaurant._id, tableNumber: table.number, createdAt: { $gte: lastHour } })) >= MAX_PER_HOUR) {
    return fail("Muitos chamados nesta mesa. Acene para um garçom, por favor.");
  }

  // Um só chamado ativo por tipo e mesa: apertar de novo não cria duplicado.
  const res = await ServiceCall.updateOne(
    { restaurant: restaurant._id, tableNumber: table.number, type, status: { $in: ["waiting", "attending"] } },
    { $setOnInsert: { status: "waiting", billMethod: type === "bill" ? billMethod : "" } }, // datas: o Mongoose preenche
    { upsert: true },
  );

  const { calls } = await getTableCalls(restaurant._id, table.number);
  return { ok: true, created: res.upsertedCount > 0, calls };
}

export async function cancelCall(slug: string, token: string, id: string): Promise<CallResult> {
  const found = await findTable(slug, token);
  if (!found) return fail("Mesa inválida. Escaneie o QR Code novamente.");
  const { restaurant, table } = found;

  await connectDB();
  // Só cancela chamado desta mesma mesa e que ainda está ativo.
  await ServiceCall.updateOne(
    { _id: id, restaurant: restaurant._id, tableNumber: table.number, status: { $in: ["waiting", "attending"] } },
    { $set: { status: "canceled", doneAt: new Date() } },
  );
  const { calls } = await getTableCalls(restaurant._id, table.number);
  return { ok: true, calls };
}
