import { Suspense } from "react";
import { requireOwner } from "@/lib/owner-page";
import { Table } from "@/models/Table";
import { TablesManager } from "@/components/owner/TablesManager";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Mesas params={params} />
    </Suspense>
  );
}

async function Mesas({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  const docs = await Table.find({ restaurant: r._id }).sort({ number: 1 }).lean();
  const tables = docs.map((t) => ({ id: String(t._id), number: t.number, token: t.token, active: t.active !== false }));
  return <TablesManager slug={r.slug} tables={tables} primary={r.colors.primary} />;
}
