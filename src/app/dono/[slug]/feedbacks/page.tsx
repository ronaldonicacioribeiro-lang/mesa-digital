import { Suspense } from "react";
import { requireOwner } from "@/lib/owner-page";
import { Feedback } from "@/models/Feedback";
import { FeedbackList } from "@/components/owner/FeedbackList";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Feedbacks params={params} />
    </Suspense>
  );
}

async function Feedbacks({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await requireOwner(slug);
  const docs = await Feedback.find({ restaurant: r._id }).sort({ createdAt: -1 }).limit(100).lean();
  const items = docs.map((f) => ({
    id: String(f._id),
    message: f.message,
    photo: f.photo ?? "",
    read: Boolean(f.read),
    when: new Date(f.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  }));
  return <FeedbackList slug={r.slug} items={items} primary={r.colors.primary} />;
}
