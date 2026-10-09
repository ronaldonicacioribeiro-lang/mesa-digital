"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { attendCall, finishCall, logoutStaff, type StaffResult } from "@/app/equipe/[slug]/actions";
import { callLabel, type StaffCallView } from "@/lib/calls";

type Data = { now: number; staff: { name: string }; calls: StaffCallView[]; done: StaffCallView[] };

type Props = {
  slug: string;
  restaurantName: string;
  mode: "panel" | "tv";
  colors: { primary: string; secondary: string };
};

const POLL_MS = 3000; // aba visível
const HIDDEN_POLL_MS = 15000; // aba escondida: mais devagar, mas sem parar (o alerta continua chegando)

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// Cor do cartão conforme o tempo de espera: tranquilo, atenção (2 min), urgente (5 min).
function urgency(waitMs: number): "ok" | "warn" | "late" {
  if (waitMs >= 5 * 60_000) return "late";
  if (waitMs >= 2 * 60_000) return "warn";
  return "ok";
}
const URGENCY_STYLE = {
  ok: "border-emerald-400 bg-emerald-50 text-emerald-950",
  warn: "border-amber-400 bg-amber-50 text-amber-950",
  late: "border-red-500 bg-red-50 text-red-950",
};
const URGENCY_STYLE_TV = {
  ok: "border-emerald-400 bg-emerald-900/40 text-white",
  warn: "border-amber-400 bg-amber-900/40 text-white",
  late: "border-red-500 bg-red-900/50 text-white",
};

// Três "blips" curtos, gerados pelo próprio navegador (não precisa de arquivo de áudio).
function beep(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  [880, 1175, 880].forEach((freq, i) => {
    const start = t0 + i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.21);
  });
}

export function StaffPanel({ slug, restaurantName, mode, colors: c }: Props) {
  const router = useRouter();
  const tv = mode === "tv";
  const [data, setData] = useState<Data | null>(null);
  const [skew, setSkew] = useState(0);
  const [tick, setTick] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const load = useRef<() => Promise<void>>(async () => {});

  // Consulta o servidor a cada poucos segundos (pausa se a aba estiver escondida).
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    load.current = async () => {
      try {
        const res = await fetch(`/api/equipe/${slug}/chamados`, { cache: "no-store" });
        if (res.status === 401) {
          router.refresh(); // sessão acabou: a página volta para o login
          return;
        }
        const d: Data = await res.json();
        if (!alive) return;
        setOffline(false);
        setSkew(d.now - Date.now());
        setData(d);

        // Chamado novo (que a tela ainda não tinha visto): toca o alerta.
        if (seen.current === null) {
          seen.current = new Set(d.calls.map((x) => x.id)); // primeira carga: não apita pelo que já existia
        } else {
          const known = seen.current;
          const fresh = d.calls.filter((x) => x.status === "waiting" && !known.has(x.id));
          d.calls.forEach((x) => known.add(x.id));
          if (fresh.length > 0) {
            if (audio.current) beep(audio.current);
            navigator.vibrate?.([200, 100, 200]);
          }
        }
      } catch {
        if (alive) setOffline(true);
      }
    };

    const loop = async () => {
      await load.current();
      if (alive) timer = setTimeout(loop, document.visibilityState === "visible" ? POLL_MS : HIDDEN_POLL_MS);
    };
    loop();

    const onVisible = () => document.visibilityState === "visible" && load.current();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [slug, router]);

  // Relógio dos cronômetros (1 segundo).
  useEffect(() => {
    const first = setTimeout(() => setTick(Date.now()), 0);
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  // Modo TV: impede a tela de apagar, quando o navegador permite.
  useEffect(() => {
    if (!tv) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [tv]);

  function enableSound() {
    // O navegador só libera som depois de um toque da pessoa.
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio.current = audio.current ?? new Ctx();
    audio.current.resume().catch(() => {});
    beep(audio.current);
    setSoundOn(true);
  }

  // Controle simples de "ocupado" (evita clique duplo enquanto a ação roda).
  async function run(action: () => Promise<StaffResult>) {
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Algo deu errado.");
      await load.current();
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  const nowMs = tick ? tick + skew : 0;
  const since = (iso: string) => (nowMs ? nowMs - new Date(iso).getTime() : 0);

  const waiting = data?.calls.filter((x) => x.status === "waiting") ?? [];
  const attending = data?.calls.filter((x) => x.status === "attending") ?? [];
  const done = data?.done ?? [];

  const shell = tv ? "min-h-dvh bg-neutral-950 p-6 text-white" : "mx-auto min-h-dvh max-w-3xl p-4";

  const soundButton = (
    <button
      type="button"
      onClick={enableSound}
      disabled={soundOn}
      className={`rounded-full px-4 py-2 text-sm font-bold ${soundOn ? "bg-emerald-600 text-white" : "animate-pulse bg-amber-400 text-black"}`}
    >
      {soundOn ? "🔔 Som ativado" : "🔕 Ativar alerta sonoro"}
    </button>
  );

  function card(x: StaffCallView) {
    const wait = x.status === "waiting" ? since(x.createdAt) : 0;
    const style = x.status === "waiting" ? (tv ? URGENCY_STYLE_TV : URGENCY_STYLE)[urgency(wait)] : tv ? "border-sky-400 bg-sky-900/40 text-white" : "border-sky-400 bg-sky-50 text-sky-950";
    return (
      <li key={x.id} className={`flex items-center gap-4 rounded-2xl border-2 ${tv ? "p-5" : "p-4"} ${style}`}>
        <div className="text-center">
          <div className={`${tv ? "text-sm" : "text-xs"} font-bold uppercase opacity-70`}>Mesa</div>
          <div className={`${tv ? "text-6xl" : "text-4xl"} font-extrabold leading-none`}>{String(x.table).padStart(2, "0")}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`${tv ? "text-3xl" : "text-lg"} font-bold`}>{callLabel(x)}</div>
          <div className={`${tv ? "text-xl" : "text-sm"} opacity-80`}>
            {x.status === "waiting" ? `Aguardando há ${mmss(wait)}` : `${x.attendedBy || "Equipe"} atendendo`}
          </div>
        </div>
        {!tv && (
          <div className="flex shrink-0 flex-col gap-2">
            {x.status === "waiting" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => attendCall(slug, x.id))}
                className="rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
                style={{ background: c.primary, color: c.secondary }}
              >
                Atender
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => finishCall(slug, x.id))}
              className="rounded-xl bg-black/10 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              Concluir
            </button>
          </div>
        )}
        {tv && x.status === "waiting" && <div className="text-5xl font-extrabold tabular-nums">{mmss(wait)}</div>}
      </li>
    );
  }

  return (
    <main className={shell}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-60">{tv ? "Modo TV" : "Painel da equipe"}</p>
          <h1 className={`${tv ? "text-3xl" : "text-xl"} font-bold`}>{restaurantName}</h1>
          {!tv && data && <p className="text-sm opacity-70">Olá, {data.staff.name}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {soundButton}
          {!tv && (
            <>
              <a
                href={`/equipe/${slug}/tv`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-black/10 px-4 py-2 text-sm font-bold"
              >
                Modo TV
              </a>
              <button
                type="button"
                onClick={() => run(async () => { const r = await logoutStaff(slug); router.refresh(); return r; })}
                className="rounded-full bg-black/10 px-4 py-2 text-sm font-bold"
              >
                Sair
              </button>
            </>
          )}
        </div>
      </header>

      {offline && (
        <p className="mb-3 rounded-xl bg-red-600 p-3 text-center text-sm font-bold text-white">
          Sem conexão com o servidor. Tentando de novo…
        </p>
      )}
      {error && <p className="mb-3 rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {!data ? (
        <p className="py-16 text-center opacity-60">Carregando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className={`mb-2 font-bold ${tv ? "text-2xl" : "text-base"}`}>Aguardando ({waiting.length})</h2>
            <ul className="flex flex-col gap-3">
              {waiting.map(card)}
              {waiting.length === 0 && <li className="rounded-2xl border border-dashed p-5 text-center opacity-60">Nenhuma mesa esperando. 🎉</li>}
            </ul>
          </section>

          <section>
            <h2 className={`mb-2 font-bold ${tv ? "text-2xl" : "text-base"}`}>Em atendimento ({attending.length})</h2>
            <ul className="flex flex-col gap-3">
              {attending.map(card)}
              {attending.length === 0 && <li className="rounded-2xl border border-dashed p-5 text-center opacity-60">Ninguém sendo atendido agora.</li>}
            </ul>
          </section>

          {!tv && (
            <section>
              <h2 className="mb-2 text-base font-bold">Atendidos na última hora ({done.length})</h2>
              <ul className="flex flex-col gap-2">
                {done.map((x) => (
                  <li key={x.id} className="flex items-center justify-between rounded-xl bg-black/5 px-4 py-3 text-sm">
                    <span>
                      <strong>Mesa {String(x.table).padStart(2, "0")}</strong> · {callLabel(x)} · {x.attendedBy}
                    </span>
                    <span className="font-semibold">
                      resposta em {x.attendedAt ? mmss(new Date(x.attendedAt).getTime() - new Date(x.createdAt).getTime()) : "--:--"}
                    </span>
                  </li>
                ))}
                {done.length === 0 && <li className="opacity-60">Nada concluído ainda.</li>}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
