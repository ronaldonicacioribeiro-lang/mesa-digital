import { Suspense } from "react";
import { requireOwner } from "@/lib/owner-page";
import { Staff } from "@/models/Staff";
import { StaffManager } from "@/components/owner/StaffManager";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Equipe params={params} />
    </Suspense>
  );
}

async function Equipe({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  const docs = await Staff.find({ restaurant: r._id }).sort({ name: 1 }).lean();
  const staff = docs.map((s) => ({ id: String(s._id), name: s.name, active: s.active !== false }));
  return <StaffManager slug={r.slug} staff={staff} primary={r.colors.primary} />;
}
