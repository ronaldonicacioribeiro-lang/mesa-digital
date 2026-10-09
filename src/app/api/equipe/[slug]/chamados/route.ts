import { connection } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getStaff } from "@/lib/staff";
import { toStaffCallView } from "@/lib/calls";
import { Restaurant } from "@/models/Restaurant";
import { ServiceCall } from "@/models/ServiceCall";

// O painel da equipe consulta este endereço a cada poucos segundos. Só responde a quem está logado.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await ctx.params;
  await connectDB();

  const restaurant = await Restaurant.findOne({ slug: slug.toLowerCase(), active: true }).lean();
  const staff = restaurant && (await getStaff(restaurant._id, restaurant.slug));
  if (!restaurant || !staff) return Response.json({ error: "não autorizado" }, { status: 401 });

  const since = new Date(Date.now() - 60 * 60_000);
  const [active, done] = await Promise.all([
    ServiceCall.find({ restaurant: restaurant._id, status: { $in: ["waiting", "attending"] } })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    ServiceCall.find({ restaurant: restaurant._id, status: "done", doneAt: { $gte: since } })
      .sort({ doneAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return Response.json(
    {
      now: Date.now(),
      staff: { name: staff.name },
      calls: active.map(toStaffCallView),
      done: done.map(toStaffCallView),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
