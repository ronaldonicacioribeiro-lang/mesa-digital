"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Confetti } from "@/components/Confetti";
import { cancelCall, createCall, type CallResult } from "@/app/r/[slug]/t/[token]/atendimento/actions";
import { ACTIVE, BILL_LABEL, type BillMethod, type CallView } from "@/lib/calls";

type Props = {
  slug: string;
  token: string;
  initial: { now: number; calls: CallView[] };
  celebrateOnLoad?: boolean;
  colors: { primary: string; secondary: string; text: string };
};

const POLL_MS = 4000;

export function ServiceStatus({ slug, token, initial, celebrateOnLoad = false, colors: c }: Props) {
  const [calls, setCalls] = useState<CallView[]>(initial.calls);
  const [skew, setSkew] = useState(0); // diferença entre o relógio do servidor e o do celular
  const [tick, setTick] = useState(0);
  const [celebrate, setCelebrate] = useState(celebrateOnLoad);
  const [error, setError] = useState("");
  const [choosingBill, setChoosingBill] = useState(false);
  const [pending, setPending] = useState(false);

  const waiter = calls.find((x) => x.type === "waiter" && ACTIVE.includes(x.status));
  const bill = calls.find((x) => x.type === "bill" && ACTIVE.includes(x.status));
  const hasActive = Boolean(waiter || bill);

  // Relógio para o "há N min".
  useEffect(() => {
    const first = setTimeout(() => {
      setSkew(initial.now - Date.now());
      setTick(Date.now());
    }, 0);
    const t = setInterval(() => setTick(Date.now()), 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [initial.now]);

  // Confete de boas-vindas quando o cliente acabou de chamar pela tela da mesa.
  useEffect(() => {
    if (!celebrateOnLoad) return;
    const t = setTimeout(() => setCelebrate(false), 4500);
    return () => clearTimeout(t);
  }, [celebrateOnLoad]);

  // Enquanto houver chamado ativo, pergunta ao servidor como ele está (pausa se a aba estiver escondida).
  useEffect(() => {
    if (!hasActive) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/api/mesa/${slug}/${token}/chamados`, { cache: "no-store" });
          if (res.ok && alive) {
            const data: { now: number; calls: CallView[] } = await res.json();
            setCalls(data.calls);
            setSkew(data.now - Date.now());
          }
        } catch {
          /* sem internet por um instante: tenta de novo no próximo ciclo */
        }
      }
      if (alive) timer = setTimeout(poll, POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [hasActive, slug, token]);

  function apply(res: CallResult) {
    if (res.calls) setCalls(res.calls);
    if (!res.ok) setError(res.error ?? "Algo deu errado. Tente de novo.");
  }

  async function run(action: () => Promise<CallResult>, onOk?: (res: CallResult) => void) {
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const res = await action();
      apply(res);
      if (res.ok) onOk?.(res);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  function call(type: "waiter" | "bill", method: BillMethod = "") {
    run(
      () => createCall(slug, token, type, method),
      (res) => {
        setChoosingBill(false);
        if (res.created && type === "waiter") {
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 4500);
        }
      },
    );
  }

  function cancel(id: string) {
    run(() => cancelCall(slug, token, id));
  }

  const nowMs = tick ? tick + skew : 0;
  const waited = (iso: string) => {
    if (!nowMs) return "";
    const min = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60_000));
    return min < 1 ? "agora mesmo" : `há ${min} min`;
  };

  // Último chamado concluído nos últimos 3 minutos (para mostrar "Atendido").
  const justDone = calls.find(
    (x) => x.status === "done" && x.doneAt && nowMs && nowMs - new Date(x.doneAt).getTime() < 3 * 60_000,
  );

  const box = "rounded-2xl bg-white p-5 shadow-sm";
  const big = "flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-xl font-bold shadow-md disabled:opacity-50";

  function activeCard(x: CallView, waitingText: string, attendingText: string, title: string, attendingTitle: string) {
    return (
      <div className={`${box} flex flex-col gap-3`}>
        <p className="text-lg font-bold">{x.status === "attending" ? attendingTitle : title}</p>
        {x.status === "waiting" ? (
          <p>
            {waitingText} <span className="opacity-60">({waited(x.createdAt)})</span>
          </p>
        ) : (
          <p className="font-semibold" style={{ color: c.primary }}>
            {x.attendedBy ? `${x.attendedBy} ${attendingText}` : "Já estamos indo até você!"}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => cancel(x.id)}
          className="w-fit rounded-full bg-black/10 px-4 py-1.5 text-sm font-semibold"
        >
          Cancelar chamado
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {celebrate && <Confetti primary={c.primary} secondary={c.secondary} />}

      {justDone && !hasActive && (
        <div className={`${box} text-center`}>
          <p className="text-lg font-bold">Atendido ✓</p>
          <p className="text-sm opacity-70">Se precisar de mais alguma coisa, é só chamar de novo.</p>
        </div>
      )}

      {waiter ? (
        activeCard(
          waiter,
          "Já notificamos a equipe.",
          "está a caminho!",
          celebrate ? "Garçom chamado! 🎉" : "Aguardando atendimento",
          "Atendimento a caminho",
        )
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => call("waiter")}
          className={big}
          style={{ background: c.primary, color: c.secondary }}
        >
          <Icon name="bell" className="h-8 w-8" />
          Chamar garçom
        </button>
      )}

      {bill ? (
        activeCard(
          bill,
          `Pagamento: ${BILL_LABEL[bill.billMethod] ?? ""}. A equipe já foi avisada.`,
          "está levando a sua conta.",
          "Conta pedida",
          "Sua conta está a caminho",
        )
      ) : choosingBill ? (
        <div className={`${box} flex flex-col gap-3`}>
          <p className="font-bold">Como você prefere pagar?</p>
          <div className="grid grid-cols-3 gap-2">
            {(["pix", "card", "cash"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={pending}
                onClick={() => call("bill", m)}
                className="rounded-xl py-4 font-bold shadow-sm disabled:opacity-50"
                style={{ background: c.primary, color: c.secondary }}
              >
                {BILL_LABEL[m]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setChoosingBill(false)} className="w-fit text-sm underline opacity-70">
            Voltar
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setChoosingBill(true)}
          className={`${big} !text-lg`}
          style={{ background: "#fff", color: c.text, border: `2px solid ${c.primary}` }}
        >
          <span style={{ color: c.primary }}>
            <Icon name="receipt" className="h-7 w-7" />
          </span>
          Pedir a conta
        </button>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
