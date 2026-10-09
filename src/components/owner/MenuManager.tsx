"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteItem, moveItem, saveItem, setItemAvailable, type ItemInput, type OwnerResult } from "@/app/dono/[slug]/actions";
import { uploadMedia, type UploadKind } from "@/lib/upload-client";
import { formatPrice } from "@/lib/format";
import type { MenuItemDTO } from "@/lib/menu";

type Props = { slug: string; items: MenuItemDTO[]; mediaReady: boolean; primary: string };

const centsToField = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));

const blank = (category: string): ItemInput => ({
  name: "",
  category,
  description: "",
  price: "",
  promoPrice: "",
  featured: false,
  available: true,
  imageUrl: "",
  videoUrl: "",
  posterUrl: "",
  modelGlbUrl: "",
  modelUsdzUrl: "",
});

const fromItem = (i: MenuItemDTO): ItemInput => ({
  id: i.id,
  name: i.name,
  category: i.category,
  description: i.description,
  price: centsToField(i.priceCents),
  promoPrice: centsToField(i.promoPriceCents),
  featured: i.featured,
  available: i.available,
  imageUrl: i.imageUrl,
  videoUrl: i.videoUrl,
  posterUrl: i.posterUrl,
  modelGlbUrl: i.modelGlbUrl,
  modelUsdzUrl: i.modelUsdzUrl,
});

export function MenuManager({ slug, items, mediaReady, primary }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<ItemInput | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const categories = [...new Set(items.map((i) => i.category))];

  async function run(action: () => Promise<OwnerResult>, onOk?: () => void) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Algo deu errado.");
      else {
        onOk?.();
        router.refresh();
      }
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <ItemEditor
        slug={slug}
        value={editing}
        categories={categories}
        mediaReady={mediaReady}
        primary={primary}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cardápio ({items.length} pratos)</h2>
        <button
          type="button"
          onClick={() => setEditing(blank(categories[0] ?? ""))}
          className="rounded-full px-5 py-2.5 text-sm font-bold text-white"
          style={{ background: primary }}
        >
          + Novo prato
        </button>
      </div>
      {error && <p className="rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {categories.map((cat) => {
        const list = items.filter((i) => i.category === cat);
        return (
          <section key={cat}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-60">{cat}</h3>
            <ul className="flex flex-col gap-2">
              {list.map((i, idx) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  {i.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-black/5 text-xs opacity-50">sem foto</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-tight">
                      {i.name} {i.featured && <span title="Destaque">⭐</span>}
                    </p>
                    <p className="text-sm opacity-70">
                      {i.promoPriceCents !== null ? (
                        <>
                          <strong className="text-green-700">{formatPrice(i.promoPriceCents)}</strong>{" "}
                          <s className="opacity-60">{formatPrice(i.priceCents)}</s>
                        </>
                      ) : (
                        formatPrice(i.priceCents)
                      )}
                      {i.videoUrl && " · 🎬"}
                      {i.modelGlbUrl && " · 3D"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => setItemAvailable(slug, i.id, !i.available))}
                      className={`rounded-full px-3 py-1.5 ${i.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {i.available ? "Disponível" : "Esgotado"}
                    </button>
                    <button type="button" disabled={busy || idx === 0} onClick={() => run(() => moveItem(slug, i.id, "up"))} className="rounded-full bg-black/10 px-3 py-1.5 disabled:opacity-30" aria-label="Subir">
                      ↑
                    </button>
                    <button type="button" disabled={busy || idx === list.length - 1} onClick={() => run(() => moveItem(slug, i.id, "down"))} className="rounded-full bg-black/10 px-3 py-1.5 disabled:opacity-30" aria-label="Descer">
                      ↓
                    </button>
                    <button type="button" onClick={() => setEditing(fromItem(i))} className="rounded-full bg-black/10 px-3 py-1.5">
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => confirm(`Apagar "${i.name}"? Não dá para desfazer.`) && run(() => deleteItem(slug, i.id))}
                      className="rounded-full bg-black/10 px-3 py-1.5 text-red-700"
                    >
                      Apagar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {items.length === 0 && <p className="rounded-2xl bg-white p-8 text-center opacity-60">Nenhum prato ainda. Toque em “Novo prato”.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

type EditorProps = {
  slug: string;
  value: ItemInput;
  categories: string[];
  mediaReady: boolean;
  primary: string;
  onCancel: () => void;
  onSaved: () => void;
};

function ItemEditor({ slug, value, categories, mediaReady, primary, onCancel, onSaved }: EditorProps) {
  const [f, setF] = useState<ItemInput>(value);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<UploadKind | null>(null);

  const set = <K extends keyof ItemInput>(k: K, v: ItemInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function onFile(kind: UploadKind, file?: File) {
    if (!file) return;
    setError("");
    setUploading(kind);
    try {
      const up = await uploadMedia(slug, file, kind);
      if (kind === "image") set("imageUrl", up.url);
      if (kind === "video") setF((p) => ({ ...p, videoUrl: up.url, posterUrl: up.posterUrl ?? "" }));
      if (kind === "model") set("modelGlbUrl", up.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "O envio falhou.");
    } finally {
      setUploading(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await saveItem(slug, f);
      if (res.ok) onSaved();
      else setError(res.error ?? "Não foi possível salvar.");
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const field = "rounded-xl border bg-white p-3 text-base outline-none";
  const label = "flex flex-col gap-1.5 text-sm font-semibold";
  const mediaBox = "flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{f.id ? "Editar prato" : "Novo prato"}</h2>

      <label className={label}>
        Nome
        <input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} required />
      </label>
      <label className={label}>
        Categoria
        <input className={field} list="cats" value={f.category} onChange={(e) => set("category", e.target.value)} maxLength={40} required />
        <datalist id="cats">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className={label}>
        Descrição
        <textarea className={field} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Preço (R$)
          <input className={field} inputMode="decimal" placeholder="32,00" value={f.price} onChange={(e) => set("price", e.target.value)} required />
        </label>
        <label className={label}>
          Preço promocional (opcional)
          <input className={field} inputMode="decimal" placeholder="29,90" value={f.promoPrice} onChange={(e) => set("promoPrice", e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap gap-5 text-sm font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Destaque ⭐
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5" checked={f.available} onChange={(e) => set("available", e.target.checked)} /> Disponível
        </label>
      </div>

      {!mediaReady && (
        <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          O envio de fotos, vídeos e modelos 3D ainda não foi configurado (Cloudinary). Você pode salvar o prato sem mídia por enquanto.
        </p>
      )}

      <div className={mediaBox}>
        <p className="font-bold">Foto</p>
        {f.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.imageUrl} alt="Foto do prato" className="max-h-48 w-fit rounded-xl" />
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input type="file" accept="image/*" disabled={!mediaReady || uploading !== null} onChange={(e) => onFile("image", e.target.files?.[0])} />
          {f.imageUrl && <button type="button" className="underline" onClick={() => set("imageUrl", "")}>Remover foto</button>}
          {uploading === "image" && <span>Enviando…</span>}
        </div>
        <p className="text-xs opacity-60">A foto é reduzida automaticamente antes do envio.</p>
      </div>

      <div className={mediaBox}>
        <p className="font-bold">Vídeo curto do prato (opcional)</p>
        {f.videoUrl && <video src={f.videoUrl} poster={f.posterUrl || undefined} muted loop playsInline controls className="max-h-64 w-fit rounded-xl" />}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input type="file" accept="video/*" disabled={!mediaReady || uploading !== null} onChange={(e) => onFile("video", e.target.files?.[0])} />
          {f.videoUrl && <button type="button" className="underline" onClick={() => setF((p) => ({ ...p, videoUrl: "", posterUrl: "" }))}>Remover vídeo</button>}
          {uploading === "video" && <span>Enviando… (pode levar um pouco)</span>}
        </div>
        <p className="text-xs opacity-60">Vídeo vertical de 5 a 8 segundos, até 60 MB. É comprimido (720p) e a miniatura é criada automaticamente.</p>
      </div>

      <div className={mediaBox}>
        <p className="font-bold">Modelo 3D para realidade aumentada (opcional)</p>
        {f.modelGlbUrl && <p className="break-all text-xs opacity-70">Arquivo atual: {f.modelGlbUrl}</p>}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input type="file" accept=".glb,model/gltf-binary" disabled={!mediaReady || uploading !== null} onChange={(e) => onFile("model", e.target.files?.[0])} />
          {f.modelGlbUrl && <button type="button" className="underline" onClick={() => set("modelGlbUrl", "")}>Remover modelo</button>}
          {uploading === "model" && <span>Enviando…</span>}
        </div>
        <p className="text-xs opacity-60">Arquivo .glb de até 10 MB. No iPhone o sistema converte sozinho.</p>
      </div>

      {error && <p className="rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={busy || uploading !== null} className="rounded-xl px-6 py-3 font-bold text-white disabled:opacity-50" style={{ background: primary }}>
          {busy ? "Salvando…" : "Salvar prato"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-black/10 px-6 py-3 font-bold">
          Cancelar
        </button>
      </div>
    </form>
  );
}
