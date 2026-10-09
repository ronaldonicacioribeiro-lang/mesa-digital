import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOwnerRestaurant } from "@/lib/owner";

// Usada no começo de cada página do painel: devolve o restaurante ou manda para o login.
export async function requireOwner(slug: string) {
  await connection();
  const r = await getOwnerRestaurant(slug);
  if (!r) redirect(`/dono/${slug.toLowerCase()}`);
  return r;
}
