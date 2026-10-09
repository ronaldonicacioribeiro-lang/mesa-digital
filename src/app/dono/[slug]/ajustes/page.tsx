import { Suspense } from "react";
import { requireOwner } from "@/lib/owner-page";
import { SettingsForm } from "@/components/owner/SettingsForm";

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-500">Carregando…</p>}>
      <Ajustes params={params} />
    </Suspense>
  );
}

async function Ajustes({ params }: { params: Params }) {
  const { slug } = await params;
  const r = await requireOwner(slug);

  return (
    <SettingsForm
      slug={r.slug}
      primary={r.colors.primary}
      initial={{
        name: r.name,
        tagline: r.tagline ?? "",
        logoText: r.logoText ?? "",
        primary: r.colors.primary,
        secondary: r.colors.secondary,
        background: r.colors.background,
        text: r.colors.text,
        instagram: r.instagram ?? "",
        googleReviewUrl: r.googleReviewUrl ?? "",
        wifiSsid: r.wifi?.ssid ?? "",
        wifiPassword: r.wifi?.password ?? "",
        stampsRequired: r.loyalty?.stampsRequired ?? 9,
        reward: r.loyalty?.reward ?? "",
        contactEmail: r.contactEmail ?? "",
        allowedIps: (r.presence?.allowedIps ?? []).join(", "),
      }}
    />
  );
}
