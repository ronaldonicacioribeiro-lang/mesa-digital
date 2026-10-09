import { signUpload } from "@/app/dono/[slug]/actions";

// Envio de fotos, vídeos e modelos 3D direto do navegador para o Cloudinary.
// A foto é reduzida aqui mesmo antes de subir. Vídeo e modelo vão como estão; no vídeo, o Cloudinary
// entrega já comprimido (720p, MP4) e gera a miniatura, pelos endereços montados abaixo.

export type UploadKind = "image" | "video" | "model";
export type Uploaded = { url: string; posterUrl?: string };

const LIMITS: Record<UploadKind, number> = { image: 15, video: 60, model: 10 }; // MB, antes de reduzir

async function shrinkImage(file: File, maxSide = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha ao reduzir a foto"))), "image/jpeg", 0.82),
  );
}

// Coloca as instruções de otimização no endereço do Cloudinary.
const withT = (url: string, t: string) => url.replace("/upload/", `/upload/${t}/`);
const ext = (url: string, e: string) => url.replace(/\.[a-z0-9]+$/i, `.${e}`);

export async function uploadMedia(slug: string, file: File, kind: UploadKind): Promise<Uploaded> {
  if (file.size > LIMITS[kind] * 1024 * 1024) throw new Error(`Arquivo muito grande (máximo ${LIMITS[kind]} MB).`);

  const sig = await signUpload(slug);
  if (!sig.ok) throw new Error(sig.error ?? "Não foi possível enviar.");

  const body = new FormData();
  body.append("file", kind === "image" ? await shrinkImage(file) : file);
  body.append("api_key", sig.apiKey!);
  body.append("timestamp", String(sig.timestamp));
  body.append("folder", sig.folder!);
  body.append("signature", sig.signature!);

  const resource = kind === "model" ? "raw" : kind;
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${resource}/upload`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message ?? "O envio falhou. Tente de novo.");

  const url: string = data.secure_url;
  if (kind === "image") return { url: withT(url, "f_auto,q_auto,w_1000,c_limit") };
  if (kind === "video") {
    return {
      url: ext(withT(url, "f_mp4,q_auto,w_720,c_limit"), "mp4"),
      posterUrl: ext(withT(url, "so_0,f_webp,q_auto,w_720,c_limit"), "webp"),
    };
  }
  return { url };
}
