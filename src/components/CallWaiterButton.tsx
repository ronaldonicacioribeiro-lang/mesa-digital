"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { createCall } from "@/app/r/[slug]/t/[token]/atendimento/actions";

type Props = {
  slug: string;
  token: string;
  href: string; // tela de acompanhamento do chamado
  colors: { primary: string; secondary: string };
};

// Botão grande da tela da mesa: um toque chama o garçom e leva para a tela de acompanhamento.
export function CallWaiterButton({ slug, token, href, colors: c }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function onClick() {
    setError("");
    start(async () => {
      const res = await createCall(slug, token, "waiter");
      if (res.ok) router.push(res.created ? `${href}?novo=1` : href);
      else setError(res.error ?? "Não foi possível chamar. Tente de novo.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-7 text-xl font-bold shadow-md disabled:opacity-70"
        style={{ background: c.primary, color: c.secondary }}
      >
        <Icon name="bell" className="h-8 w-8" />
        {pending ? "Chamando…" : "Chamar garçom"}
      </button>
      {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
