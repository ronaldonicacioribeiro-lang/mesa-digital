"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginStaff } from "@/app/equipe/[slug]/actions";

type Props = { slug: string; restaurantName: string; colors: { primary: string; secondary: string } };

export function StaffLogin({ slug, restaurantName, colors: c }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await loginStaff(slug, pin);
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? "Não foi possível entrar.");
        setPin("");
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 p-6">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest opacity-60">Painel da equipe</p>
        <h1 className="text-2xl font-bold">{restaurantName}</h1>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="Seu PIN"
          aria-label="Seu PIN"
          className="rounded-xl border bg-white p-4 text-center text-2xl tracking-[0.4em] outline-none"
        />
        {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending || pin.length < 4}
          className="rounded-xl px-6 py-4 text-lg font-bold disabled:opacity-50"
          style={{ background: c.primary, color: c.secondary }}
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
