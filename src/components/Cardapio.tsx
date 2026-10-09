"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { DishImage } from "@/components/DishImage";
import { Reels } from "@/components/Reels";
import { formatPrice } from "@/lib/format";
import type { MenuItemDTO } from "@/lib/menu";

type Props = {
  items: MenuItemDTO[];
  name: string;
  logoText: string;
  tableNumber: number;
  backHref: string;
  colors: { primary: string; secondary: string; background: string; text: string };
};

// Tira acentos e maiúsculas para a busca achar "pao" em "Pão".
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Cardapio({ items, name, logoText, tableNumber, backHref, colors: c }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all"); // "all" | "featured" | nome da categoria
  const [reelsAt, setReelsAt] = useState<number | null>(null);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter((i) => {
      if (filter === "featured" && !i.featured) return false;
      if (filter !== "all" && filter !== "featured" && i.category !== filter) return false;
      if (!q) return true;
      return normalize(`${i.name} ${i.description} ${i.category}`).includes(q);
    });
  }, [items, query, filter]);

  const chips = [
    { key: "all", label: "Todos" },
    ...(items.some((i) => i.featured) ? [{ key: "featured", label: "★ Destaques" }] : []),
    ...categories.map((cat) => ({ key: cat, label: cat })),
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md" style={{ background: c.background, color: c.text }}>
      <meta name="theme-color" content={c.primary} />

      <header className="sticky top-0 z-20 flex flex-col gap-3 px-4 pb-3 pt-3 shadow-sm" style={{ background: c.background }}>
        <div className="flex items-center justify-between">
          <Link href={backHref} className="flex items-center gap-1 text-sm font-semibold" style={{ color: c.primary }}>
            <Icon name="back" className="h-5 w-5" />
            Voltar para a mesa
          </Link>
          <span className="rounded-full px-3 py-0.5 text-xs font-semibold" style={{ background: c.secondary, color: c.text }}>
            Mesa {String(tableNumber).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: c.primary, color: c.secondary }}
          >
            {logoText}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-60">Cardápio</p>
          </div>
          <span className="text-xs opacity-60">{visible.length} {visible.length === 1 ? "item" : "itens"}</span>
        </div>

        <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2" style={{ borderColor: `${c.primary}33` }}>
          <Icon name="search" className="h-5 w-5 opacity-50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="w-full bg-transparent text-base outline-none"
            aria-label="Buscar no cardápio"
          />
        </label>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {chips.map((chip) => {
            const on = filter === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className="shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={{
                  background: on ? c.primary : "#fff",
                  color: on ? c.secondary : c.text,
                  borderColor: on ? c.primary : `${c.primary}33`,
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </header>

      <ul className="flex flex-col gap-3 px-4 pb-10 pt-3">
        {visible.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setReelsAt(i)}
              className="flex w-full gap-3 rounded-2xl border bg-white p-2.5 text-left shadow-sm"
              style={{ borderColor: `${c.primary}22` }}
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                <DishImage
                  src={item.imageUrl}
                  name={item.name}
                  primary={c.primary}
                  secondary={c.secondary}
                  className="h-full w-full"
                />
                {item.videoUrl && (
                  <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
                    <Icon name="camera" className="h-3.5 w-3.5" />
                  </span>
                )}
                {item.modelGlbUrl && (
                  <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    3D
                  </span>
                )}
                {!item.available && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-bold uppercase text-white">
                    Esgotado
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                <div>
                  <div className="flex items-start gap-1.5">
                    <h3 className="font-bold leading-tight">{item.name}</h3>
                    {item.featured && (
                      <span style={{ color: c.secondary }} className="mt-0.5 shrink-0 drop-shadow-sm" title="Destaque">
                        <Icon name="star" className="h-4 w-4 fill-current" />
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs opacity-70">{item.description}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold" style={{ color: item.promoPriceCents !== null ? "#15803d" : c.text }}>
                    {formatPrice(item.promoPriceCents ?? item.priceCents)}
                  </span>
                  {item.promoPriceCents !== null && (
                    <span className="text-xs line-through opacity-50">{formatPrice(item.priceCents)}</span>
                  )}
                </div>
              </div>
            </button>
          </li>
        ))}

        {visible.length === 0 && (
          <li className="py-16 text-center opacity-60">Nenhum item encontrado.</li>
        )}
      </ul>

      {reelsAt !== null && (
        <Reels items={visible} startIndex={reelsAt} colors={c} onClose={() => setReelsAt(null)} />
      )}
    </div>
  );
}
