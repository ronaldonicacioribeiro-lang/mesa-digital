"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginOwner } from "@/app/dono/[slug]/actions";

type Props = { slug: string; restaurantName: string; colors: { primary: string; secondary: string } };

export function OwnerLogin({ slug, restaurantName, colors: c }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await loginOwner(slug, password);
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? "Não foi possível entrar.");
        setPassword("");
      }
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 p-6">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest opacity-60">Painel do dono</p>
        <h1 className="text-2xl font-bold">{restaurantName}</h1>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          autoFocus
          placeholder="Senha"
          aria-label="Senha"
          className="rounded-xl border bg-white p-4 text-lg outline-none"
        />
        {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || password.length < 4}
          className="rounded-xl px-6 py-4 text-lg font-bold disabled:opacity-50"
          style={{ background: c.primary, color: c.secondary }}
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
