"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutOwner } from "@/app/dono/[slug]/actions";

type Props = { slug: string; name: string; unreadFeedbacks: number; primary: string };

const TABS = [
  { href: "", label: "Resumo" },
  { href: "/cardapio", label: "Cardápio" },
  { href: "/mesas", label: "Mesas e QR" },
  { href: "/equipe", label: "Equipe" },
  { href: "/feedbacks", label: "Feedbacks" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/ajustes", label: "Ajustes" },
];

export function OwnerNav({ slug, name, unreadFeedbacks, primary }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dono/${slug}`;

  async function logout() {
    await logoutOwner(slug);
    router.refresh();
  }

  return (
    <header className="border-b bg-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Painel do dono</p>
          <h1 className="truncate text-lg font-bold">{name}</h1>
        </div>
        <button type="button" onClick={logout} className="shrink-0 rounded-full bg-black/10 px-4 py-2 text-sm font-bold">
          Sair
        </button>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {TABS.map((t) => {
          const href = base + t.href;
          const active = t.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={t.href}
              href={href}
              className="relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
              style={active ? { background: primary, color: "#fff" } : { background: "#f1f1f1" }}
            >
              {t.label}
              {t.href === "/feedbacks" && unreadFeedbacks > 0 && (
                <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadFeedbacks}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
