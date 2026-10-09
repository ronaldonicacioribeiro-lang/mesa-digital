import { connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { Table } from "@/models/Table";
import { MenuItem } from "@/models/MenuItem";

// Acha a mesa pelo slug do restaurante + token. Devolve null se qualquer parte não bater
// (restaurante inativo, mesa desativada ou token errado), sem dizer qual parte falhou.
export async function findTable(slug: string, token: string) {
  await connection(); // só lê o banco quando alguém acessa a página (nunca no pré-render)
  await connectDB();
  const restaurant = await Restaurant.findOne({ slug: slug.toLowerCase(), active: true }).lean();
  if (!restaurant) return null;
  const table = await Table.findOne({ restaurant: restaurant._id, token, active: true }).lean();
  if (!table) return null;
  const itemCount = await MenuItem.countDocuments({ restaurant: restaurant._id });
  return { restaurant, table, itemCount };
}
