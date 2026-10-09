import { connectDB } from "@/lib/mongodb";
import { ServiceCall } from "@/models/ServiceCall";

// Horário de Brasília = UTC-3 o ano todo (o Brasil não usa mais horário de verão).
const BR_OFFSET_MS = 3 * 3_600_000;
const DAY_MS = 86_400_000;

// Meia-noite de Brasília de `daysAgo` dias atrás, como data UTC.
export const startOfDayBR = (daysAgo = 0, now = Date.now()) =>
  new Date(Math.floor((now - BR_OFFSET_MS) / DAY_MS) * DAY_MS + BR_OFFSET_MS - daysAgo * DAY_MS);

export type Report = {
  days: number;
  total: number;
  waiter: number;
  bill: number;
  done: number;
  canceled: number;
  avgResponseMs: number | null;
  byHour: number[]; // 24 posições
  byTable: { table: number; count: number; avgMs: number | null }[];
  byStaff: { name: string; count: number; avgMs: number | null }[];
  byDay: { day: string; count: number }[];
};

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

// Relatório dos últimos `days` dias (1 = só hoje). Calculado a partir dos chamados do período.
export async function buildReport(restaurantId: unknown, days: number): Promise<Report> {
  await connectDB();
  const from = startOfDayBR(days - 1);
  const calls = await ServiceCall.find({ restaurant: restaurantId, createdAt: { $gte: from } })
    .sort({ createdAt: 1 })
    .limit(20_000)
    .lean();

  const byHour = new Array(24).fill(0);
  const tables = new Map<number, { count: number; ms: number[] }>();
  const staff = new Map<string, { count: number; ms: number[] }>();
  const perDay = new Map<string, number>();
  const all: number[] = [];
  let waiter = 0;
  let bill = 0;
  let done = 0;
  let canceled = 0;

  for (const c of calls) {
    if (c.type === "waiter") waiter++;
    else bill++;
    if (c.status === "done") done++;
    if (c.status === "canceled") canceled++;

    const local = new Date(c.createdAt.getTime() - BR_OFFSET_MS);
    byHour[local.getUTCHours()]++;
    const day = local.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);

    const t = tables.get(c.tableNumber) ?? { count: 0, ms: [] };
    t.count++;
    // Tempo de resposta: do pedido até o garçom assumir (só chamados que alguém atendeu).
    if (c.attendedAt) {
      const ms = c.attendedAt.getTime() - c.createdAt.getTime();
      all.push(ms);
      t.ms.push(ms);
      if (c.attendedBy) {
        const s = staff.get(c.attendedBy) ?? { count: 0, ms: [] };
        s.count++;
        s.ms.push(ms);
        staff.set(c.attendedBy, s);
      }
    }
    tables.set(c.tableNumber, t);
  }

  return {
    days,
    total: calls.length,
    waiter,
    bill,
    done,
    canceled,
    avgResponseMs: avg(all),
    byHour,
    byTable: [...tables.entries()]
      .map(([table, v]) => ({ table, count: v.count, avgMs: avg(v.ms) }))
      .sort((a, b) => b.count - a.count),
    byStaff: [...staff.entries()]
      .map(([name, v]) => ({ name, count: v.count, avgMs: avg(v.ms) }))
      .sort((a, b) => b.count - a.count),
    byDay: [...perDay.entries()].map(([day, count]) => ({ day, count })),
  };
}

export const fmtDuration = (ms: number | null) => {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s`;
};
