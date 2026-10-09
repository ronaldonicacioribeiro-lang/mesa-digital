import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { getOwnerRestaurant } from "@/lib/owner";
import { Feedback } from "@/models/Feedback";
import { OwnerNav } from "@/components/owner/OwnerNav";

export const metadata: Metadata = { title: "Painel do dono", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string }>;

export default function Layout({ children, params }: LayoutProps<"/dono/[slug]">) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Shell params={params}>{children}</Shell>
    </Suspense>
  );
}

// Só mostra o menu para quem está logado como dono; as páginas conferem o login de novo por conta própria.
async function Shell({ children, params }: { children: React.ReactNode; params: Params }) {
  const { slug } = await params;
  await connection();
  const r = await getOwnerRestaurant(slug);
  if (!r) return <>{children}</>;

  const unread = await Feedback.countDocuments({ restaurant: r._id, read: false });
  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <OwnerNav slug={r.slug} name={r.name} unreadFeedbacks={unread} primary={r.colors.primary} />
      <div className="mx-auto max-w-5xl px-4 py-5">{children}</div>
    </div>
  );
}
