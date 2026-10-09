import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { getTableCalls } from "@/lib/table-calls";
import { MesaShell } from "@/components/MesaShell";
import { ServiceStatus } from "@/components/ServiceStatus";

export const metadata: Metadata = { title: "Atendimento", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;
type Search = Promise<{ novo?: string }>;

export default function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Atendimento params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Atendimento({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug, token } = await params;
  const { novo } = await searchParams;
  const found = await findTable(slug, token);
  if (!found) notFound();

  const { restaurant, table } = found;
  const initial = await getTableCalls(restaurant._id, table.number);

  return (
    <MesaShell
      title="Como podemos ajudar?"
      backHref={`/r/${restaurant.slug}/t/${token}`}
      tableNumber={table.number}
      colors={restaurant.colors}
    >
      <ServiceStatus slug={restaurant.slug} token={token} initial={initial} celebrateOnLoad={novo === "1"} colors={restaurant.colors} />
    </MesaShell>
  );
}
