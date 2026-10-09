import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { MesaShell } from "@/components/MesaShell";
import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata: Metadata = { title: "Feedback anônimo", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Feedback params={params} />
    </Suspense>
  );
}

async function Feedback({ params }: { params: Params }) {
  const { slug, token } = await params;
  const found = await findTable(slug, token);
  if (!found) notFound();

  const { restaurant, table } = found;
  const backHref = `/r/${restaurant.slug}/t/${token}`;

  return (
    <MesaShell title="Feedback anônimo" backHref={backHref} tableNumber={table.number} colors={restaurant.colors}>
      <FeedbackForm slug={restaurant.slug} token={token} backHref={backHref} colors={restaurant.colors} />
    </MesaShell>
  );
}
