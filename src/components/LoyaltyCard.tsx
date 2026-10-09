"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { deleteCard, redeemReward, registerCard, stampVisit, type CardResult } from "@/app/r/[slug]/t/[token]/fidelidade/actions";
import type { CardView } from "@/lib/loyalty";

type Props = {
  slug: string;
  token: string;
  initial: CardView | null;
  policyHref: string;
  colors: { primary: string; secondary: string; text: string };
};

export function LoyaltyCard({ slug, token, initial, policyHref, colors: c }: Props) {
  const [card, setCard] = useState<CardView | null>(initial);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  // Roda uma ação do servidor e atualiza a tela com o resultado.
  function run(action: () => Promise<CardResult>, onOk?: () => void) {
    setError("");
    start(async () => {
      const res = await action();
      if (res.card !== undefined) setCard(res.card);
      if (res.ok) onOk?.();
      else setError(res.error ?? "Algo deu errado. Tente de novo.");
    });
  }

  const card_ = "rounded-2xl bg-white p-5 shadow-sm";
  const btn = "rounded-2xl px-6 py-4 text-lg font-bold shadow-md disabled:opacity-50";

  // ---------- Sem cartão: cadastro com consentimento ----------
  if (!card) {
    return (
      <form
        action={(fd) => run(() => registerCard(slug, token, fd))}
        className="flex flex-col gap-4"
      >
        <p className={card_}>
          Ganhe um carimbo a cada visita e, no <strong>9º</strong>, um prêmio. Basta criar seu cartão:
        </p>

        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Seu nome
          <input
            name="name"
            required
            minLength={2}
            maxLength={60}
            autoComplete="given-name"
            className="rounded-xl border bg-white p-3 text-base font-normal outline-none"
            style={{ borderColor: `${c.primary}44` }}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Seu e-mail
          <input
            name="email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            className="rounded-xl border bg-white p-3 text-base font-normal outline-none"
            style={{ borderColor: `${c.primary}44` }}
          />
        </label>

        <label className="flex items-start gap-3 rounded-xl bg-white p-3 text-sm shadow-sm">
          <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0" />
          <span>
            Concordo que meu nome e e-mail sejam usados <strong>somente</strong> para o cartão fidelidade deste
            restaurante, como descrito na{" "}
            <a href={policyHref} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: c.primary }}>
              política de privacidade
            </a>
            . Posso apagar meus dados a qualquer momento.
          </span>
        </label>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className={btn} style={{ background: c.primary, color: c.secondary }}>
          {pending ? "Criando…" : "Criar meu cartão"}
        </button>
      </form>
    );
  }

  // ---------- Com cartão ----------
  const ready = card.stamps >= card.required;

  return (
    <div className="flex flex-col gap-4">
      <div className={card_}>
        <p className="text-sm opacity-70">Olá, {card.name}!</p>
        <p className="mb-3 text-lg font-bold">
          {card.stamps} de {card.required} carimbos
        </p>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: card.required }, (_, i) => {
            const filled = i < card.stamps;
            const last = i === card.required - 1;
            return (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-full border-2"
                style={{
                  borderColor: c.primary,
                  background: filled ? c.primary : "transparent",
                  color: filled ? c.secondary : c.primary,
                }}
                aria-label={filled ? `Carimbo ${i + 1} recebido` : `Carimbo ${i + 1} pendente`}
              >
                {filled ? <Icon name="check" className="h-5 w-5" /> : last ? <Icon name="gift" className="h-5 w-5" /> : null}
              </div>
            );
          })}
        </div>

        {card.reward && (
          <p className="mt-3 text-sm">
            Prêmio: <strong>{card.reward}</strong>
          </p>
        )}
        {card.totalRedeemed > 0 && (
          <p className="mt-1 text-xs opacity-60">Prêmios já resgatados: {card.totalRedeemed}</p>
        )}
      </div>

      {ready ? (
        <div className={`${card_} flex flex-col gap-3`}>
          <p className="text-lg font-bold">🎉 Prêmio liberado!</p>
          <p className="text-sm">Chame um atendente: ele digita o PIN dele aqui para confirmar a entrega.</p>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            placeholder="PIN do atendente"
            aria-label="PIN do atendente"
            className="rounded-xl border bg-white p-3 text-center text-lg tracking-widest outline-none"
            style={{ borderColor: `${c.primary}44` }}
          />
          <button
            type="button"
            disabled={pending || pin.length < 4}
            onClick={() => run(() => redeemReward(slug, token, pin), () => setPin(""))}
            className={btn}
            style={{ background: c.primary, color: c.secondary }}
          >
            Confirmar resgate
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending || card.stampedToday}
          onClick={() => run(() => stampVisit(slug, token))}
          className={btn}
          style={{ background: c.primary, color: c.secondary }}
        >
          {card.stampedToday ? "Carimbo de hoje já registrado ✓" : "Carimbar minha visita de hoje"}
        </button>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-2 flex flex-col items-center gap-2 text-sm">
        <a href={policyHref} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: c.primary }}>
          Política de privacidade
        </a>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="underline opacity-70">
            Apagar meus dados
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 text-center shadow-sm">
            <p>Isso apaga seu cartão e seus carimbos. Não dá para desfazer.</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteCard(slug, token), () => setConfirmDelete(false))}
                className="rounded-full bg-red-600 px-4 py-1.5 font-semibold text-white"
              >
                Apagar tudo
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full bg-black/10 px-4 py-1.5 font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
