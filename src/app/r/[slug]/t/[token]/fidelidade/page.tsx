import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { getCustomer, toCardView } from "@/lib/loyalty";
import { MesaShell } from "@/components/MesaShell";
import { LoyaltyCard } from "@/components/LoyaltyCard";

export const metadata: Metadata = { title: "Cartão fidelidade", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Fidelidade params={params} />
    </Suspense>
  );
}

async function Fidelidade({ params }: { params: Params }) {
  const { slug, token } = await params;
  const found = await findTable(slug, token);
  if (!found) notFound();

  const { restaurant, table } = found;
  const customer = await getCustomer(restaurant._id, restaurant.slug);

  return (
    <MesaShell
      title="Cartão fidelidade"
      backHref={`/r/${restaurant.slug}/t/${token}`}
      tableNumber={table.number}
      colors={restaurant.colors}
    >
      <LoyaltyCard
        slug={restaurant.slug}
        token={token}
        initial={customer ? toCardView(customer, restaurant.loyalty) : null}
        policyHref={`/r/${restaurant.slug}/privacidade`}
        colors={restaurant.colors}
      />
    </MesaShell>
  );
}
