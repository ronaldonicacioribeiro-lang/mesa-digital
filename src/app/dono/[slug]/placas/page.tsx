import { Suspense } from "react";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireOwner } from "@/lib/owner-page";
import { Table } from "@/models/Table";
import { PrintButton } from "@/components/owner/PrintButton";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Placas params={params} />
    </Suspense>
  );
}

// Placas de mesa prontas para imprimir: logo, número da mesa e QR em vetor (nítido em qualquer tamanho).
async function Placas({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  const tables = await Table.find({ restaurant: r._id, active: true }).sort({ number: 1 }).lean();

  // Endereço que vai dentro do QR: PUBLIC_BASE_URL (se definido), senão o endereço do site na Netlify (URL),
  // senão o endereço pelo qual o painel foi aberto (modo dev).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = (process.env.PUBLIC_BASE_URL ?? process.env.URL ?? `${proto}://${host}`).replace(/\/$/, "");

  const c = r.colors;
  const plates = await Promise.all(
    tables.map(async (t) => ({
      number: t.number,
      svg: await QRCode.toString(`${base}/r/${r.slug}/t/${t.token}`, { type: "svg", margin: 1, color: { dark: "#000000", light: "#ffffff" } }),
    })),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <h2 className="text-xl font-bold">Placas de mesa ({plates.length})</h2>
        <PrintButton primary={c.primary} />
        <p className="w-full text-sm opacity-60">
          Os QR apontam para <code>{base}</code>. Se você trocar o QR de uma mesa, imprima de novo. Dica: imprima em papel
          fotográfico ou plastifique.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 print:gap-0 md:grid-cols-3">
        {plates.map((p) => (
          <div
            key={p.number}
            className="flex break-inside-avoid flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center print:rounded-none"
            style={{ background: c.background, color: c.text, borderColor: c.primary }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold" style={{ background: c.primary, color: c.secondary }}>
              {r.logoText}
            </div>
            <p className="font-bold leading-tight">{r.name}</p>
            <div className="w-full max-w-[200px] rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: p.svg }} />
            <p className="rounded-full px-5 py-1 text-xl font-extrabold" style={{ background: c.secondary, color: c.text }}>
              Mesa {String(p.number).padStart(2, "0")}
            </p>
            <p className="text-xs opacity-70">Escaneie para chamar o garçom, ver o cardápio e pedir a conta</p>
          </div>
        ))}
      </div>
    </div>
  );
}
