import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { MesaHome } from "@/components/MesaHome";

// Tela inicial da mesa: logo, cores e textos vêm do restaurante cadastrado no banco.
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Mesa params={params} />
    </Suspense>
  );
}

async function Mesa({ params }: { params: Params }) {
  const { slug, token } = await params;
  const found = await findTable(slug, token);
  if (!found) notFound();

  const { restaurant, table } = found;
  const base = `/r/${restaurant.slug}/t/${token}`;

  return (
    <MesaHome
      name={restaurant.name}
      tagline={restaurant.tagline}
      logoText={restaurant.logoText}
      tableNumber={table.number}
      instagram={restaurant.instagram}
      googleReviewUrl={restaurant.googleReviewUrl}
      slug={restaurant.slug}
      token={token}
      hrefs={{
        service: `${base}/atendimento`,
        menu: `${base}/cardapio`,
        feedback: `${base}/feedback`,
        game: `${base}/jogo`,
        loyalty: `${base}/fidelidade`,
        wifi: restaurant.wifi?.ssid ? `${base}/wifi` : undefined,
      }}
      colors={restaurant.colors}
    />
  );
}
