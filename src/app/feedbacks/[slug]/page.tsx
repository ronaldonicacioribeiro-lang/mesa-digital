import { Suspense } from "react";
import { devToolsEnabled } from "@/lib/devtools";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { Feedback } from "@/models/Feedback";

// Ferramenta de desenvolvimento (Fase 4): lista os feedbacks recebidos. Só funciona em modo dev.
// O painel do dono, com login e aviso de novo feedback, é a Fase 7.
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  if (!devToolsEnabled()) notFound();
  return (
    <Suspense fallback={<main className="p-6">Carregando…</main>}>
      <Lista params={params} />
    </Suspense>
  );
}

async function Lista({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  await connectDB();
  const restaurant = await Restaurant.findOne({ slug }).lean();
  if (!restaurant) notFound();

  const items = await Feedback.find({ restaurant: restaurant._id }).sort({ createdAt: -1 }).limit(100).lean();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Feedbacks: {restaurant.name}</h1>
      <p className="mb-4 text-sm text-gray-600">{items.length} recebido(s). Todos anônimos.</p>
      <ul className="flex flex-col gap-3">
        {items.map((f) => (
          <li key={String(f._id)} className="rounded-lg border p-4">
            <p className="text-xs text-gray-500">
              {new Date(f.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{f.message}</p>
            {f.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.photo} alt="Foto enviada" className="mt-2 max-h-64 rounded" />
            )}
          </li>
        ))}
        {items.length === 0 && <li className="text-gray-500">Nenhum feedback ainda.</li>}
      </ul>
    </main>
  );
}
