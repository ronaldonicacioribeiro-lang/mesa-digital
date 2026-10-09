import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { getMenuItems } from "@/lib/menu";
import { Cardapio } from "@/components/Cardapio";

export const metadata: Metadata = { title: "Cardápio", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando cardápio…</main>}>
      <Menu params={params} />
    </Suspense>
  );
}

async function Menu({ params }: { params: Params }) {
  const { slug, token } = await params;
  const found = await findTable(slug, token);
  if (!found) notFound();

  const { restaurant, table } = found;
  const items = await getMenuItems(restaurant._id);

  return (
    <Cardapio
      items={items}
      name={restaurant.name}
      logoText={restaurant.logoText}
      tableNumber={table.number}
      backHref={`/r/${restaurant.slug}/t/${token}`}
      colors={restaurant.colors}
    />
  );
}
