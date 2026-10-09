import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { MesaShell } from "@/components/MesaShell";
import { Sudoku } from "@/components/Sudoku";

export const metadata: Metadata = { title: "Jogo", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Jogo params={params} />
    </Suspense>
  );
}

async function Jogo({ params }: { params: Params }) {
  const { slug, token } = await params;
  const found = await findTable(slug, token);
  if (!found) notFound();

  const { restaurant, table } = found;

  return (
    <MesaShell
      title="Sudoku"
      backHref={`/r/${restaurant.slug}/t/${token}`}
      tableNumber={table.number}
      colors={restaurant.colors}
    >
      <Sudoku colors={restaurant.colors} />
    </MesaShell>
  );
}
