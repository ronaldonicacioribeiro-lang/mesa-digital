import { connection } from "next/server";
import { getOwnerRestaurant } from "@/lib/owner";
import { startOfDayBR } from "@/lib/reports";
import { ServiceCall } from "@/models/ServiceCall";
import { BILL_LABEL } from "@/lib/calls";

// Planilha com todos os chamados do período (abre direto no Excel).
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await ctx.params;
  const r = await getOwnerRestaurant(slug);
  if (!r) return new Response("Não autorizado", { status: 401 });

  const dias = Number(new URL(req.url).searchParams.get("dias"));
  const days = [1, 7, 30].includes(dias) ? dias : 7;
  const calls = await ServiceCall.find({ restaurant: r._id, createdAt: { $gte: startOfDayBR(days - 1) } })
    .sort({ createdAt: 1 })
    .limit(20_000)
    .lean();

  const when = (d?: Date | null) => (d ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
  const secs = (a?: Date | null, b?: Date | null) => (a && b ? Math.round((b.getTime() - a.getTime()) / 1000) : "");
  const status: Record<string, string> = { waiting: "Aguardando", attending: "Em atendimento", done: "Atendido", canceled: "Cancelado" };
  // Protege contra fórmulas do Excel em texto livre (nome do garçom).
  const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);

  const rows = [
    ["Data e hora", "Mesa", "Tipo", "Pagamento", "Situação", "Atendido por", "Resposta (s)", "Total até concluir (s)"],
    ...calls.map((c) => [
      when(c.createdAt),
      c.tableNumber,
      c.type === "waiter" ? "Garçom" : "Conta",
      c.billMethod ? BILL_LABEL[c.billMethod] : "",
      status[c.status] ?? c.status,
      safe(c.attendedBy ?? ""),
      secs(c.createdAt, c.attendedAt),
      secs(c.createdAt, c.doneAt),
    ]),
  ];
  const csv = "﻿" + rows.map((row) => row.join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chamados-${r.slug}-${days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
