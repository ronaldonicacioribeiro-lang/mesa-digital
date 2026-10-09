"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markFeedbackRead } from "@/app/dono/[slug]/actions";

export type FeedbackRow = { id: string; message: string; photo: string; read: boolean; when: string };
type Props = { slug: string; items: FeedbackRow[]; primary: string };

export function FeedbackList({ slug, items, primary }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((i) => !i.read).length;

  async function mark(id: string | "all") {
    if (busy) return;
    setBusy(true);
    try {
      await markFeedbackRead(slug, id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">
          Feedbacks <span className="text-base font-normal opacity-60">({unread} novos)</span>
        </h2>
        {unread > 0 && (
          <button type="button" disabled={busy} onClick={() => mark("all")} className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: primary }}>
            Marcar todos como lidos
          </button>
        )}
      </div>
      <p className="text-sm opacity-70">Mensagens anônimas enviadas pelos clientes. Não há nome, mesa nem contato, de propósito.</p>

      <ul className="flex flex-col gap-3">
        {items.map((f) => (
          <li key={f.id} className={`rounded-2xl p-4 shadow-sm ${f.read ? "bg-white" : "border-l-4 bg-white"}`} style={f.read ? undefined : { borderColor: primary }}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs opacity-60">
              <span>{f.when}</span>
              {!f.read && (
                <button type="button" disabled={busy} onClick={() => mark(f.id)} className="rounded-full bg-black/10 px-3 py-1 font-semibold opacity-100">
                  Marcar como lido
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap">{f.message}</p>
            {f.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.photo} alt="Foto enviada pelo cliente" className="mt-3 max-h-72 rounded-xl" />
            )}
          </li>
        ))}
        {items.length === 0 && <li className="rounded-2xl bg-white p-8 text-center opacity-60">Nenhum feedback ainda.</li>}
      </ul>
    </div>
  );
}
