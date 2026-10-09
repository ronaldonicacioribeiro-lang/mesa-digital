"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addTables, rotateTableToken, setTableActive, type OwnerResult } from "@/app/dono/[slug]/actions";

export type TableRow = { id: string; number: number; token: string; active: boolean };
type Props = { slug: string; tables: TableRow[]; primary: string };

export function TablesManager({ slug, tables, primary }: Props) {
  const router = useRouter();
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<OwnerResult>) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Algo deu errado.");
      else router.refresh();
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Mesas ({tables.length})</h2>
        <a href={`/dono/${slug}/placas`} className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: primary }}>
          Imprimir placas com QR
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Adicionar mesas
          <input
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 2))}
            inputMode="numeric"
            className="w-24 rounded-xl border p-2.5"
          />
        </label>
        <button type="button" disabled={busy || !count} onClick={() => run(() => addTables(slug, Number(count)))} className="rounded-xl bg-black/10 px-4 py-2.5 text-sm font-bold">
          Adicionar
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <ul className="grid gap-2 md:grid-cols-2">
        {tables.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <span className="text-2xl font-extrabold">{String(t.number).padStart(2, "0")}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className={t.active ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{t.active ? "Ativa" : "Desativada"}</p>
              <a className="underline opacity-70" href={`/r/${slug}/t/${t.token}`} target="_blank" rel="noopener noreferrer">
                Abrir a página da mesa
              </a>
            </div>
            <div className="flex gap-1.5 text-sm font-semibold">
              <button type="button" disabled={busy} onClick={() => run(() => setTableActive(slug, t.id, !t.active))} className="rounded-full bg-black/10 px-3 py-1.5">
                {t.active ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  confirm(`Trocar o QR da mesa ${t.number}? O QR impresso atual deixa de funcionar e a placa precisa ser reimpressa.`) &&
                  run(() => rotateTableToken(slug, t.id))
                }
                className="rounded-full bg-black/10 px-3 py-1.5"
              >
                Trocar QR
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
