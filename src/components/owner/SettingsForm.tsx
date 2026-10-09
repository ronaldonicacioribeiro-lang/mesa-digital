"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changePassword, saveSettings, type SettingsInput } from "@/app/dono/[slug]/actions";

type Props = { slug: string; initial: SettingsInput; primary: string };

export function SettingsForm({ slug, initial, primary }: Props) {
  const router = useRouter();
  const [f, setF] = useState<SettingsInput>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof SettingsInput>(k: K, v: SettingsInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await saveSettings(slug, f);
      setMsg(res.ok ? { ok: true, text: "Ajustes salvos! As mudanças já valem para os clientes." } : { ok: false, text: res.error ?? "Não foi possível salvar." });
      if (res.ok) router.refresh();
    } catch {
      setMsg({ ok: false, text: "Sem conexão. Tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    try {
      const res = await changePassword(slug, pw.current, pw.next);
      setPwMsg(res.ok ? { ok: true, text: "Senha alterada." } : { ok: false, text: res.error ?? "Não foi possível alterar." });
      if (res.ok) setPw({ current: "", next: "" });
    } catch {
      setPwMsg({ ok: false, text: "Sem conexão. Tente de novo." });
    }
  }

  const field = "rounded-xl border bg-white p-3 text-base outline-none";
  const label = "flex flex-col gap-1.5 text-sm font-semibold";
  const box = "flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm";
  const color = (k: "primary" | "secondary" | "background" | "text", name: string) => (
    <label className={label}>
      {name}
      <div className="flex items-center gap-2">
        <input type="color" value={f[k]} onChange={(e) => set(k, e.target.value)} className="h-11 w-14 rounded-lg border" />
        <input className={`${field} w-28`} value={f[k]} onChange={(e) => set(k, e.target.value)} maxLength={7} />
      </div>
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-xl font-bold">Ajustes</h2>

        <section className={box}>
          <p className="font-bold">Identidade</p>
          <label className={label}>Nome do restaurante<input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} required /></label>
          <label className={label}>Frase curta<input className={field} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={80} /></label>
          <label className={label}>Iniciais do logo (até 4 letras)<input className={`${field} w-28`} value={f.logoText} onChange={(e) => set("logoText", e.target.value)} maxLength={4} /></label>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {color("primary", "Cor principal")}
            {color("secondary", "Cor de destaque")}
            {color("background", "Fundo")}
            {color("text", "Texto")}
          </div>
        </section>

        <section className={box}>
          <p className="font-bold">Links</p>
          <label className={label}>Instagram (link completo)<input className={field} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/seurestaurante" /></label>
          <label className={label}>Link para avaliar no Google<input className={field} value={f.googleReviewUrl} onChange={(e) => set("googleReviewUrl", e.target.value)} placeholder="https://search.google.com/local/writereview?placeid=..." /></label>
          <p className="text-xs opacity-60">O link da avaliação é o mesmo para todos os clientes. O Google não permite premiar nem filtrar quem avalia.</p>
        </section>

        <section className={box}>
          <p className="font-bold">Wi-Fi dos clientes</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={label}>Nome da rede<input className={field} value={f.wifiSsid} onChange={(e) => set("wifiSsid", e.target.value)} maxLength={32} /></label>
            <label className={label}>Senha<input className={field} value={f.wifiPassword} onChange={(e) => set("wifiPassword", e.target.value)} maxLength={64} /></label>
          </div>
          <p className="text-xs opacity-60">Deixe o nome da rede em branco para esconder o botão de Wi-Fi.</p>
        </section>

        <section className={box}>
          <p className="font-bold">Cartão fidelidade</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={label}>Carimbos para ganhar o prêmio<input className={`${field} w-28`} type="number" min={3} max={20} value={f.stampsRequired} onChange={(e) => set("stampsRequired", Number(e.target.value))} /></label>
            <label className={label}>Prêmio<input className={field} value={f.reward} onChange={(e) => set("reward", e.target.value)} maxLength={100} placeholder="Uma sobremesa por conta da casa" /></label>
          </div>
          <label className={label}>E-mail de contato para pedidos de privacidade (LGPD)<input className={field} type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></label>
        </section>

        <section className={box}>
          <p className="font-bold">Validação de presença (avançado)</p>
          <label className={label}>
            IPs públicos do Wi-Fi do restaurante, separados por vírgula
            <input className={field} value={f.allowedIps} onChange={(e) => set("allowedIps", e.target.value)} placeholder="Deixe em branco para desligar" />
          </label>
          <p className="text-xs opacity-60">Se preencher, só quem estiver no Wi-Fi do restaurante consegue chamar o garçom. Use com cuidado: se o IP da internet do restaurante mudar, os chamados deixam de funcionar até você atualizar.</p>
        </section>

        {msg && <p className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className="w-fit rounded-xl px-8 py-3 font-bold text-white disabled:opacity-50" style={{ background: primary }}>
          {busy ? "Salvando…" : "Salvar ajustes"}
        </button>
      </form>

      <form onSubmit={submitPassword} className={box}>
        <p className="font-bold">Trocar a senha do painel</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={label}>Senha atual<input className={field} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></label>
          <label className={label}>Nova senha (mínimo 8 caracteres)<input className={field} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} minLength={8} required /></label>
        </div>
        {pwMsg && <p className={`rounded-xl p-3 text-sm font-semibold ${pwMsg.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{pwMsg.text}</p>}
        <button type="submit" className="w-fit rounded-xl bg-black/10 px-6 py-3 font-bold">Alterar senha</button>
      </form>
    </div>
  );
}
