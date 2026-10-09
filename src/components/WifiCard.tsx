"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

type Props = {
  ssid: string;
  password: string;
  colors: { primary: string; secondary: string; text: string };
};

// Uma página web não consegue conectar o celular ao Wi-Fi. O que ela faz é mostrar os dados
// e facilitar copiar a senha; a pessoa escolhe a rede nos ajustes do celular.
export function WifiCard({ ssid, password, colors: c }: Props) {
  const [copied, setCopied] = useState<"ssid" | "password" | "">("");
  const [failed, setFailed] = useState(false);

  async function copy(what: "ssid" | "password", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(what);
      setTimeout(() => setCopied(""), 2500);
    } catch {
      setFailed(true); // sem permissão de copiar: a pessoa pode selecionar o texto
    }
  }

  const row = (label: string, value: string, what: "ssid" | "password") => (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold opacity-70">{label}</span>
      <div className="flex flex-col gap-2">
        <span className="select-all break-words rounded-xl bg-black/5 px-3 py-3 font-mono text-lg">
          {value}
        </span>
        <button
          type="button"
          onClick={() => copy(what, value)}
          className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold"
          style={{ background: c.primary, color: c.secondary }}
        >
          <Icon name={copied === what ? "check" : "copy"} className="h-5 w-5" />
          {copied === what ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
        {row("Nome da rede", ssid, "ssid")}
        {password ? row("Senha", password, "password") : <p className="text-sm">Esta rede não tem senha.</p>}
        {failed && (
          <p className="text-sm text-red-600">Não consegui copiar. Toque e segure o texto para copiar.</p>
        )}
      </div>

      <ol className="flex list-decimal flex-col gap-1 rounded-2xl bg-white p-5 pl-9 text-sm shadow-sm">
        <li>Copie a senha acima.</li>
        <li>Abra os <strong>Ajustes</strong> (ou Configurações) do celular e entre em <strong>Wi-Fi</strong>.</li>
        <li>Toque na rede <strong>{ssid}</strong> e cole a senha.</li>
      </ol>
    </div>
  );
}
