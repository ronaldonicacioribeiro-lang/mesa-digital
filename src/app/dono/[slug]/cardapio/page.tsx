import { Suspense } from "react";
import { getMenuItems } from "@/lib/menu";
import { mediaConfigured } from "@/lib/media";
import { requireOwner } from "@/lib/owner-page";
import { MenuManager } from "@/components/owner/MenuManager";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Cardapio params={params} />
    </Suspense>
  );
}

async function Cardapio({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  const items = await getMenuItems(r._id);
  return <MenuManager slug={r.slug} items={items} mediaReady={mediaConfigured()} primary={r.colors.primary} />;
}
