import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { getStaff } from "@/lib/staff";
import { Restaurant } from "@/models/Restaurant";
import { StaffLogin } from "@/components/StaffLogin";
import { StaffPanel } from "@/components/StaffPanel";

export const metadata: Metadata = { title: "Modo TV", robots: { index: false, follow: false } };

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Tv params={params} />
    </Suspense>
  );
}

// Tela para a TV da cozinha/balcão: entra uma vez com o PIN de qualquer funcionário e fica aberta.
async function Tv({ params }: { params: Params }) {
  const { slug } = await params;
  await connection();
  await connectDB();
  const restaurant = await Restaurant.findOne({ slug: slug.toLowerCase(), active: true }).lean();
  if (!restaurant) notFound();

  const staff = await getStaff(restaurant._id, restaurant.slug);
  if (!staff) {
    return <StaffLogin slug={restaurant.slug} restaurantName={restaurant.name} colors={restaurant.colors} />;
  }
  return <StaffPanel slug={restaurant.slug} restaurantName={restaurant.name} mode="tv" colors={restaurant.colors} />;
}
