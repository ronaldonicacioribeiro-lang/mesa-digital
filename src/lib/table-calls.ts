import { connectDB } from "@/lib/mongodb";
import { ServiceCall } from "@/models/ServiceCall";
import { toCallView, type CallView } from "@/lib/calls";

// Chamados recentes desta mesa (ativos + os últimos concluídos/cancelados), para a tela do cliente.
export async function getTableCalls(restaurantId: unknown, tableNumber: number): Promise<{ now: number; calls: CallView[] }> {
  await connectDB();
  const since = new Date(Date.now() - 10 * 60_000);
  const docs = await ServiceCall.find({
    restaurant: restaurantId,
    tableNumber,
    $or: [{ status: { $in: ["waiting", "attending"] } }, { createdAt: { $gte: since } }],
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return { now: Date.now(), calls: docs.map(toCallView) };
}
