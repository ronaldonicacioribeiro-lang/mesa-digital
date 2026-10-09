import { Suspense } from "react";
import Link from "next/link";
import { requireOwner } from "@/lib/owner-page";
import { buildReport, fmtDuration } from "@/lib/reports";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ dias?: string }>;

export default function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Relatorios params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const PERIODS = [
  { dias: 1, label: "Hoje" },
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
];

async function Relatorios({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { dias } = await searchParams;
  const r = await requireOwner(slug);
  const days = PERIODS.some((p) => String(p.dias) === dias) ? Number(dias) : 7;
  const rep = await buildReport(r._id, days);

  const card = "rounded-2xl bg-white p-5 shadow-sm";
  const maxHour = Math.max(1, ...rep.byHour);
  const peak = rep.total ? rep.byHour.indexOf(Math.max(...rep.byHour)) : -1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Relatórios</h2>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          {PERIODS.map((p) => (
            <Link
              key={p.dias}
              href={`/dono/${r.slug}/relatorios?dias=${p.dias}`}
              className="rounded-full px-4 py-2"
              style={p.dias === days ? { background: r.colors.primary, color: "#fff" } : { background: "#e5e5e5" }}
            >
              {p.label}
            </Link>
          ))}
          <a href={`/dono/${r.slug}/relatorios/csv?dias=${days}`} className="rounded-full bg-black/10 px-4 py-2">
            Baixar CSV (Excel)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={card}>
          <p className="text-sm opacity-60">Chamados</p>
          <p className="text-3xl font-extrabold">{rep.total}</p>
          <p className="text-xs opacity-50">{rep.waiter} garçom · {rep.bill} conta</p>
        </div>
        <div className={card}>
          <p className="text-sm opacity-60">Tempo médio de resposta</p>
          <p className="text-3xl font-extrabold">{fmtDuration(rep.avgResponseMs)}</p>
        </div>
        <div className={card}>
          <p className="text-sm opacity-60">Atendidos</p>
          <p className="text-3xl font-extrabold">{rep.done}</p>
          <p className="text-xs opacity-50">{rep.canceled} cancelados</p>
        </div>
        <div className={card}>
          <p className="text-sm opacity-60">Horário de pico</p>
          <p className="text-3xl font-extrabold">{peak >= 0 ? `${String(peak).padStart(2, "0")}h` : "—"}</p>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 font-bold">Chamados por hora do dia</p>
        <div className="flex h-40 gap-1">
          {rep.byHour.map((n, h) => (
            <div key={h} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${h}h: ${n}`}>
              <span className="text-[10px] opacity-60">{n || ""}</span>
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t" style={{ height: `${(n / maxHour) * 100}%`, minHeight: n ? 3 : 0, background: r.colors.primary }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1 text-[10px] opacity-60">
          {rep.byHour.map((_, h) => (
            <span key={h} className="flex-1 text-center">{h % 3 === 0 ? h : ""}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={card}>
          <p className="mb-3 font-bold">Por mesa</p>
          <table className="w-full text-sm">
            <thead className="text-left opacity-60">
              <tr><th className="pb-1">Mesa</th><th>Chamados</th><th>Resposta média</th></tr>
            </thead>
            <tbody>
              {rep.byTable.slice(0, 10).map((t) => (
                <tr key={t.table} className="border-t">
                  <td className="py-1.5 font-semibold">{String(t.table).padStart(2, "0")}</td>
                  <td>{t.count}</td>
                  <td>{fmtDuration(t.avgMs)}</td>
                </tr>
              ))}
              {rep.byTable.length === 0 && <tr><td colSpan={3} className="py-3 opacity-60">Sem dados no período.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className={card}>
          <p className="mb-3 font-bold">Por garçom</p>
          <table className="w-full text-sm">
            <thead className="text-left opacity-60">
              <tr><th className="pb-1">Garçom</th><th>Atendimentos</th><th>Resposta média</th></tr>
            </thead>
            <tbody>
              {rep.byStaff.map((s) => (
                <tr key={s.name} className="border-t">
                  <td className="py-1.5 font-semibold">{s.name}</td>
                  <td>{s.count}</td>
                  <td>{fmtDuration(s.avgMs)}</td>
                </tr>
              ))}
              {rep.byStaff.length === 0 && <tr><td colSpan={3} className="py-3 opacity-60">Sem dados no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {rep.byDay.length > 1 && (
        <div className={card}>
          <p className="mb-3 font-bold">Por dia</p>
          <ul className="flex flex-col gap-1 text-sm">
            {rep.byDay.map((d) => (
              <li key={d.day} className="flex items-center gap-3">
                <span className="w-24 shrink-0 opacity-70">{d.day.split("-").reverse().join("/")}</span>
                <div className="h-3 rounded" style={{ width: `${(d.count / Math.max(...rep.byDay.map((x) => x.count))) * 100}%`, background: r.colors.primary }} />
                <span className="font-semibold">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
