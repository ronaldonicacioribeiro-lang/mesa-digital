"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveStaff, setStaffActive, type OwnerResult } from "@/app/dono/[slug]/actions";

export type StaffRow = { id: string; name: string; active: boolean };
type Props = { slug: string; staff: StaffRow[]; primary: string };

export function StaffManager({ slug, staff, primary }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id?: string; name: string; pin: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<OwnerResult>, onOk?: () => void) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Algo deu errado.");
      else {
        onOk?.();
        router.refresh();
      }
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const field = "rounded-xl border bg-white p-3 text-base outline-none";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Equipe ({staff.filter((s) => s.active).length} ativos)</h2>
        <button type="button" onClick={() => setEditing({ name: "", pin: "" })} className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: primary }}>
          + Novo funcionário
        </button>
      </div>
      <p className="text-sm opacity-70">
        Cada garçom entra no painel da equipe com o <strong>PIN pessoal</strong>. O mesmo PIN confirma o resgate de prêmios do
        cartão fidelidade. Os PINs ficam guardados embaralhados: nem você consegue vê-los depois, só trocar.
      </p>

      {error && <p className="rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveStaff(slug, editing), () => setEditing(null));
          }}
          className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm"
        >
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Nome
            <input className={field} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={40} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {editing.id ? "Novo PIN (deixe em branco para manter)" : "PIN (4 a 8 números)"}
            <input
              className={field}
              value={editing.pin}
              onChange={(e) => setEditing({ ...editing, pin: e.target.value.replace(/\D/g, "").slice(0, 8) })}
              inputMode="numeric"
              autoComplete="off"
              required={!editing.id}
            />
          </label>
          <button type="submit" disabled={busy} className="rounded-xl px-5 py-3 font-bold text-white" style={{ background: primary }}>
            Salvar
          </button>
          <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-black/10 px-5 py-3 font-bold">
            Cancelar
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {staff.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{s.name}</p>
              <p className={`text-sm font-semibold ${s.active ? "text-green-700" : "text-red-700"}`}>{s.active ? "Ativo" : "Desativado"}</p>
            </div>
            <div className="flex gap-1.5 text-sm font-semibold">
              <button type="button" onClick={() => setEditing({ id: s.id, name: s.name, pin: "" })} className="rounded-full bg-black/10 px-3 py-1.5">
                Editar / trocar PIN
              </button>
              <button type="button" disabled={busy} onClick={() => run(() => setStaffActive(slug, s.id, !s.active))} className="rounded-full bg-black/10 px-3 py-1.5">
                {s.active ? "Desativar" : "Reativar"}
              </button>
            </div>
          </li>
        ))}
        {staff.length === 0 && <li className="rounded-2xl bg-white p-8 text-center opacity-60">Nenhum funcionário cadastrado.</li>}
      </ul>
    </div>
  );
}
