import { Suspense } from "react";
import { devToolsEnabled } from "@/lib/devtools";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { connection } from "next/server";
import QRCode from "qrcode";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { Table } from "@/models/Table";

// Ferramenta de desenvolvimento (Fase 1): mostra o QR de cada mesa para testar no celular.
// Só funciona em modo dev, porque lista os tokens de todas as mesas.
// O gerador de placas de verdade (com login do dono) é a Fase 7.
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!devToolsEnabled()) notFound();
  return (
    <Suspense fallback={<main className="p-6">Carregando…</main>}>
      <Placas params={params} />
    </Suspense>
  );
}

async function Placas({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection(); // só lê o banco quando alguém acessa a página
  await connectDB();
  const restaurant = await Restaurant.findOne({ slug }).lean();
  if (!restaurant) notFound();

  const tables = await Table.find({ restaurant: restaurant._id }).sort({ number: 1 }).lean();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http"; // https na Netlify, http no computador
  const base = `${proto}://${host}`;

  const cards = await Promise.all(
    tables.map(async (t) => {
      const url = `${base}/r/${restaurant.slug}/t/${t.token}`;
      return { number: t.number, url, qr: await QRCode.toDataURL(url, { margin: 1, width: 280 }) };
    }),
  );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Placas: {restaurant.name}</h1>
      <p className="mb-2 text-sm text-gray-600">
        Os QR apontam para <code>{base}</code>. Para testar no celular, abra esta página no PC usando o
        endereço da rede (ex.: http://192.168.x.x:3000/placas/{restaurant.slug}) e escaneie.
      </p>
      <p className="mb-2 text-sm">
        Equipe: <a className="underline" href={`/equipe/${restaurant.slug}`}>painel</a> ·{" "}
        <a className="underline" href={`/equipe/${restaurant.slug}/tv`}>modo TV</a>
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <a key={c.number} href={c.url} className="rounded-lg border p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.qr} alt={`QR da mesa ${c.number}`} className="mx-auto" />
            <div className="mt-2 font-semibold">Mesa {String(c.number).padStart(2, "0")}</div>
          </a>
        ))}
      </div>
    </main>
  );
}
