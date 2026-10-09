import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOwnerRestaurant } from "@/lib/owner";
import { buildReport, fmtDuration } from "@/lib/reports";
import { Restaurant } from "@/models/Restaurant";
import { Customer } from "@/models/Customer";
import { Feedback } from "@/models/Feedback";
import { MenuItem } from "@/models/MenuItem";
import { Table } from "@/models/Table";
import { OwnerLogin } from "@/components/owner/OwnerLogin";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Resumo params={params} />
    </Suspense>
  );
}

async function Resumo({ params }: { params: Params }) {
  const { slug } = await params;
  await connection();

  const owner = await getOwnerRestaurant(slug);
  if (!owner) {
    await connectDB();
    const r = await Restaurant.findOne({ slug: slug.toLowerCase(), active: true }).lean();
    if (!r) notFound();
    return <OwnerLogin slug={r.slug} restaurantName={r.name} colors={r.colors} />;
  }

  const [today, unread, customers, redeemed, items, tables] = await Promise.all([
    buildReport(owner._id, 1),
    Feedback.countDocuments({ restaurant: owner._id, read: false }),
    Customer.countDocuments({ restaurant: owner._id }),
    Customer.aggregate([{ $match: { restaurant: owner._id } }, { $group: { _id: null, n: { $sum: "$totalRedeemed" } } }]),
    MenuItem.countDocuments({ restaurant: owner._id }),
    Table.countDocuments({ restaurant: owner._id, active: true }),
  ]);

  const card = "rounded-2xl bg-white p-5 shadow-sm";
  const stat = (label: string, value: string | number, hint?: string) => (
    <div className={card}>
      <p className="text-sm opacity-60">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-50">{hint}</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold">Resumo de hoje</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("Chamados hoje", today.total, `${today.waiter} garçom · ${today.bill} conta`)}
        {stat("Tempo médio de resposta", fmtDuration(today.avgResponseMs))}
        {stat("Feedbacks novos", unread)}
        {stat("Clientes no cartão fidelidade", customers, `${redeemed[0]?.n ?? 0} prêmios resgatados`)}
      </div>

      <div className={card}>
        <p className="mb-3 font-bold">Atalhos</p>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <Link className="rounded-full bg-black/10 px-4 py-2" href={`/dono/${owner.slug}/cardapio`}>
            Cardápio ({items} pratos)
          </Link>
          <Link className="rounded-full bg-black/10 px-4 py-2" href={`/dono/${owner.slug}/placas`}>
            Imprimir placas ({tables} mesas)
          </Link>
          <Link className="rounded-full bg-black/10 px-4 py-2" href={`/equipe/${owner.slug}`} target="_blank">
            Painel da equipe
          </Link>
          <Link className="rounded-full bg-black/10 px-4 py-2" href={`/equipe/${owner.slug}/tv`} target="_blank">
            Modo TV
          </Link>
        </div>
      </div>
    </div>
  );
}
