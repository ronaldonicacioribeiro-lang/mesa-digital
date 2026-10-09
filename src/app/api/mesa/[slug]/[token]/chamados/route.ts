import { findTable } from "@/lib/tables";
import { getTableCalls } from "@/lib/table-calls";

// A tela da mesa consulta este endereço a cada poucos segundos para saber o estado do chamado.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await ctx.params;
  const found = await findTable(slug, token);
  if (!found) return Response.json({ error: "mesa inválida" }, { status: 404 });

  const data = await getTableCalls(found.restaurant._id, found.table.number);
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
