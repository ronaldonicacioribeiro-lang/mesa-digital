import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findTable } from "@/lib/tables";
import { MesaShell } from "@/components/MesaShell";
import { WifiCard } from "@/components/WifiCard";

export const metadata: Metadata = { title: "Wi-Fi", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string; token: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Wifi params={params} />
    </Suspense>
  );
}

async function Wifi({ params }: { params: Params }) {
  const { slug, token } = await params;
  const found = await findTable(slug, token);
  if (!found || !found.restaurant.wifi?.ssid) notFound(); // restaurante sem Wi-Fi cadastrado

  const { restaurant, table } = found;

  return (
    <MesaShell
      title="Conectar ao Wi-Fi"
      backHref={`/r/${restaurant.slug}/t/${token}`}
      tableNumber={table.number}
      colors={restaurant.colors}
    >
      <WifiCard ssid={restaurant.wifi.ssid} password={restaurant.wifi.password ?? ""} colors={restaurant.colors} />
    </MesaShell>
  );
}
