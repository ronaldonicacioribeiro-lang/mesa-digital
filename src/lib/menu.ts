import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

// Formato do item que vai para o celular (só dados simples, sem objetos do banco).
export type MenuItemDTO = {
  id: string;
  category: string;
  name: string;
  description: string;
  priceCents: number;
  promoPriceCents: number | null;
  featured: boolean;
  available: boolean;
  imageUrl: string;
  videoUrl: string;
  posterUrl: string;
  modelGlbUrl: string;
  modelUsdzUrl: string;
};

// Itens do restaurante já na ordem do cardápio (categoria, depois ordem do item).
export async function getMenuItems(restaurantId: unknown): Promise<MenuItemDTO[]> {
  await connectDB();
  const docs = await MenuItem.find({ restaurant: restaurantId }).sort({ categoryOrder: 1, order: 1 }).lean();
  return docs.map((d) => ({
    id: String(d._id),
    category: d.category,
    name: d.name,
    description: d.description ?? "",
    priceCents: d.priceCents,
    promoPriceCents: d.promoPriceCents ?? null,
    featured: Boolean(d.featured),
    available: d.available !== false,
    imageUrl: d.imageUrl ?? "",
    videoUrl: d.videoUrl ?? "",
    posterUrl: d.posterUrl ?? "",
    modelGlbUrl: d.modelGlbUrl ?? "",
    modelUsdzUrl: d.modelUsdzUrl ?? "",
  }));
}
