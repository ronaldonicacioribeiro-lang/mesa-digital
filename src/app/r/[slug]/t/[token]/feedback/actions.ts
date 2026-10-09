"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { findTable } from "@/lib/tables";
import { Feedback } from "@/models/Feedback";

export type FeedbackState = { ok: boolean; error?: string };

const MAX_MESSAGE = 1000;
const MAX_PHOTO_CHARS = 300_000; // ~220 KB de imagem depois de reduzida no celular
const MAX_PER_DAY = 3; // envios por pessoa, por restaurante, por dia

export async function sendFeedback(
  slug: string,
  token: string,
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const found = await findTable(slug, token); // só quem tem o QR da mesa consegue enviar
  if (!found) return { ok: false, error: "Mesa inválida. Escaneie o QR Code novamente." };

  const message = String(formData.get("message") ?? "").trim();
  const photo = String(formData.get("photo") ?? "");

  if (message.length < 3) return { ok: false, error: "Escreva uma mensagem um pouco maior." };
  if (message.length > MAX_MESSAGE) return { ok: false, error: `A mensagem passou de ${MAX_MESSAGE} letras.` };
  if (photo && (!photo.startsWith("data:image/jpeg;base64,") || photo.length > MAX_PHOTO_CHARS)) {
    return { ok: false, error: "A foto é inválida ou muito grande. Tente outra." };
  }

  // Código de limite: embaralhado e muda todo dia, não dá para voltar ao IP.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.FEEDBACK_SALT ?? "dev-salt";
  const rateKey = createHash("sha256").update(`${ip}|${found.restaurant._id}|${day}|${salt}`).digest("hex");

  await connectDB();
  const today = await Feedback.countDocuments({ rateKey });
  if (today >= MAX_PER_DAY) return { ok: false, error: "Você já enviou bastante hoje. Obrigado!" };

  await Feedback.create({ restaurant: found.restaurant._id, message, photo, rateKey });
  return { ok: true };
}
