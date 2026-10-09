"use client";

import { useActionState, useState } from "react";
import { sendFeedback, type FeedbackState } from "@/app/r/[slug]/t/[token]/feedback/actions";

type Props = {
  slug: string;
  token: string;
  backHref: string;
  colors: { primary: string; secondary: string; text: string };
};

// Reduz a foto no próprio celular (máx. 1000 px, JPEG) antes de enviar, para ficar leve.
async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function FeedbackForm({ slug, token, backHref, colors: c }: Props) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback.bind(null, slug, token), {
    ok: false,
  });
  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError("");
    if (!file) return setPhoto("");
    try {
      setPhoto(await shrinkImage(file));
    } catch {
      setPhoto("");
      setPhotoError("Não consegui usar essa foto. Tente outra.");
    }
  }

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">💬</div>
        <h2 className="text-xl font-bold">Obrigado!</h2>
        <p className="opacity-70">Sua mensagem chegou ao dono, de forma anônima.</p>
        <a href={backHref} className="rounded-full px-6 py-2 font-semibold" style={{ background: c.primary, color: c.secondary }}>
          Voltar para a mesa
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="rounded-xl bg-white p-3 text-sm shadow-sm">
        🔒 Este envio é <strong>anônimo</strong>: não guardamos seu nome, sua mesa nem seu celular. A mensagem chega
        só ao dono.
      </p>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Sua mensagem
        <textarea
          name="message"
          required
          minLength={3}
          maxLength={1000}
          rows={6}
          placeholder="Conte o que você achou: elogio, sugestão ou reclamação."
          className="rounded-xl border bg-white p-3 text-base font-normal outline-none"
          style={{ borderColor: `${c.primary}44` }}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Foto (opcional)
        <input type="file" accept="image/*" onChange={onPick} className="text-sm font-normal" />
      </label>
      <input type="hidden" name="photo" value={photo} />
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Prévia da foto" className="max-h-48 rounded-xl object-contain" />
      )}
      {photoError && <p className="text-sm text-red-600">{photoError}</p>}
      {state.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl px-6 py-4 text-lg font-bold shadow-md disabled:opacity-60"
        style={{ background: c.primary, color: c.secondary }}
      >
        {pending ? "Enviando…" : "Enviar feedback"}
      </button>
    </form>
  );
}
