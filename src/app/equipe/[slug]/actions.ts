"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { hashPin } from "@/lib/loyalty";
import { SESSION_HOURS, getStaff, makeSession, staffCookie } from "@/lib/staff";
import { AuthAttempt } from "@/models/AuthAttempt";
import { Restaurant } from "@/models/Restaurant";
import { ServiceCall } from "@/models/ServiceCall";
import { Staff } from "@/models/Staff";

export type StaffResult = { ok: boolean; error?: string };

const MAX_FAILS = 6; // erros de PIN antes de travar
const LOCK_MINUTES = 15;
const fail = (error: string): StaffResult => ({ ok: false, error });

async function restaurantBySlug(slug: string) {
  await connectDB();
  return Restaurant.findOne({ slug: slug.toLowerCase(), active: true }).lean();
}

export async function loginStaff(slug: string, pin: string): Promise<StaffResult> {
  const restaurant = await restaurantBySlug(slug);
  if (!restaurant) return fail("Restaurante não encontrado.");
  if (!/^\d{4,8}$/.test(pin)) return fail("O PIN tem de 4 a 8 números.");

  // Trava quem erra o PIN várias vezes (código embaralhado de IP + restaurante).
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const salt = process.env.FEEDBACK_SALT ?? "dev-salt";
  const key = createHash("sha256").update(`login|${ip}|${restaurant.slug}|${salt}`).digest("hex");

  const attempt = await AuthAttempt.findOne({ key }).lean();
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    return fail(`Muitas tentativas. Tente de novo em ${LOCK_MINUTES} minutos.`);
  }

  const staff = await Staff.findOne({
    restaurant: restaurant._id,
    pinHash: hashPin(pin, restaurant.slug),
    active: true,
  }).lean();

  if (!staff) {
    const updated = await AuthAttempt.findOneAndUpdate(
      { key },
      { $inc: { fails: 1 }, $set: { expiresAt: new Date(Date.now() + 60 * 60_000) } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    if (updated && updated.fails >= MAX_FAILS) {
      await AuthAttempt.updateOne(
        { key },
        { $set: { fails: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } },
      );
      return fail(`Muitas tentativas. Tente de novo em ${LOCK_MINUTES} minutos.`);
    }
    return fail("PIN incorreto.");
  }

  await AuthAttempt.deleteOne({ key });
  (await cookies()).set(staffCookie(restaurant.slug), makeSession(String(staff._id)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logoutStaff(slug: string): Promise<StaffResult> {
  (await cookies()).delete(staffCookie(slug.toLowerCase()));
  return { ok: true };
}

// Garçom assume o chamado (aguardando -> em atendimento).
export async function attendCall(slug: string, id: string): Promise<StaffResult> {
  const restaurant = await restaurantBySlug(slug);
  const staff = restaurant && (await getStaff(restaurant._id, restaurant.slug));
  if (!restaurant || !staff) return fail("Sessão expirada. Entre de novo com seu PIN.");

  const res = await ServiceCall.updateOne(
    { _id: id, restaurant: restaurant._id, status: "waiting" },
    { $set: { status: "attending", attendedAt: new Date(), attendedBy: staff.name } },
  );
  return res.modifiedCount ? { ok: true } : fail("Este chamado já foi atendido por outra pessoa.");
}

// Garçom conclui o chamado (em atendimento -> atendido). Também serve para fechar direto um aguardando.
export async function finishCall(slug: string, id: string): Promise<StaffResult> {
  const restaurant = await restaurantBySlug(slug);
  const staff = restaurant && (await getStaff(restaurant._id, restaurant.slug));
  if (!restaurant || !staff) return fail("Sessão expirada. Entre de novo com seu PIN.");

  const call = await ServiceCall.findOne({
    _id: id,
    restaurant: restaurant._id,
    status: { $in: ["waiting", "attending"] },
  }).lean();
  if (!call) return fail("Este chamado já foi encerrado.");

  const now = new Date();
  await ServiceCall.updateOne(
    { _id: id, status: { $in: ["waiting", "attending"] } },
    {
      $set: {
        status: "done",
        doneAt: now,
        attendedAt: call.attendedAt ?? now, // se ninguém "assumiu" antes, o tempo de resposta é até agora
        attendedBy: call.attendedBy || staff.name,
      },
    },
  );
  return { ok: true };
}
