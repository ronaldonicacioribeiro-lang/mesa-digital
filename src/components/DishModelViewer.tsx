"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  glb: string; // modelo 3D (obrigatório)
  usdz?: string; // versão para iPhone (opcional: sem ela, o iPhone converte o GLB sozinho)
  poster?: string;
  name: string;
  colors: { primary: string; secondary: string };
};

type ArElement = HTMLElement & { canActivateAR?: boolean };

// Avisos escolhidos pelo motivo real de a AR não estar disponível. Nada é simulado.
function whyNoAr(): string {
  if (!window.isSecureContext) {
    return "A realidade aumentada só funciona em conexão segura (HTTPS). Neste endereço você ainda pode girar o prato em 3D.";
  }
  if (/Instagram|FBAN|FBAV|Line\/|MicroMessenger|TikTok|Snapchat/i.test(navigator.userAgent)) {
    return "Você está num navegador dentro de outro aplicativo. Abra este link no Chrome (Android) ou no Safari (iPhone) para usar a realidade aumentada.";
  }
  return "Seu aparelho ou navegador não é compatível com realidade aumentada. Você ainda pode girar o prato em 3D. Para ver na mesa, use um celular recente com Chrome (Android) ou Safari (iPhone).";
}

export function DishModelViewer({ glb, usdz, poster, name, colors: c }: Props) {
  const ref = useRef<ArElement>(null);
  const [libReady, setLibReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [noArMessage, setNoArMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // A biblioteca é pesada e usa recursos do navegador: só é carregada quando a pessoa abre o 3D.
  useEffect(() => {
    let alive = true;
    import("@google/model-viewer")
      .then(() => alive && setLibReady(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!libReady || !el) return;
    let timer: ReturnType<typeof setTimeout>;

    const onLoad = () => {
      setModelReady(true);
      // O navegador decide se a AR é possível logo depois de o modelo carregar.
      timer = setTimeout(() => {
        setNoArMessage(el.canActivateAR ? "" : whyNoAr());
      }, 600);
    };
    const onError = () => setFailed(true);

    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  }, [libReady]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (failed) {
    return (
      <p className="rounded-xl bg-white/10 p-4 text-sm">
        Não foi possível carregar o modelo 3D deste prato agora. Tente novamente em instantes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-white/5">
        {libReady && (
          <model-viewer
            ref={ref}
            src={glb}
            ios-src={usdz || undefined}
            poster={poster || undefined}
            alt={`Modelo 3D de ${name}`}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            touch-action="pan-y"
            loading="eager"
            style={{ width: "100%", height: "55dvh", background: "transparent" }}
          >
            {/* Este botão só aparece se o aparelho realmente suporta AR (a própria biblioteca decide). */}
            <button
              slot="ar-button"
              type="button"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-5 py-3 text-sm font-bold shadow-lg"
              style={{ background: c.secondary, color: "#111" }}
            >
              Abrir câmera e ver na mesa
            </button>
          </model-viewer>
        )}
        {!modelReady && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            Carregando modelo 3D…
          </div>
        )}
      </div>

      {modelReady && noArMessage && (
        <div className="flex flex-col gap-2 rounded-xl bg-white/10 p-4 text-sm">
          <p>{noArMessage}</p>
          <button
            type="button"
            onClick={copyLink}
            className="w-fit rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold"
          >
            {copied ? "Link copiado!" : "Copiar link desta página"}
          </button>
        </div>
      )}

      {modelReady && !noArMessage && (
        <p className="text-center text-xs text-white/60">
          Arraste para girar. Toque em “Abrir câmera e ver na mesa”, aponte a câmera para a mesa e mova o celular devagar
          até a superfície ser reconhecida.
        </p>
      )}
    </div>
  );
}
