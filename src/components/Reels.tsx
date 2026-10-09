"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { DishImage } from "@/components/DishImage";
import { DishModelOverlay } from "@/components/DishModelOverlay";
import { formatPrice } from "@/lib/format";
import type { MenuItemDTO } from "@/lib/menu";

type Colors = { primary: string; secondary: string };

type Props = {
  items: MenuItemDTO[];
  startIndex: number;
  colors: Colors;
  onClose: () => void;
};

// "Reels do prato": feed vertical em tela cheia, um prato por tela.
export function Reels({ items, startIndex, colors, onClose }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const [model, setModel] = useState<MenuItemDTO | null>(null); // prato aberto em 3D

  // Trava a rolagem da página de trás e abre já no prato tocado.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = scroller.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [startIndex]);

  // Esc fecha o 3D, se estiver aberto; senão fecha o feed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (model) setModel(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [model, onClose]);

  // Descobre qual prato está na tela para tocar o vídeo certo.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const index = Number((e.target as HTMLElement).dataset.index);
            setActive(index);
            if (index !== startIndex) setHintVisible(false); // só some quando a pessoa desliza
          }
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [items, startIndex]);

  const current = items[active];
  const hasVideo = Boolean(current?.videoUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white" role="dialog" aria-modal="true" aria-label="Reels do prato">
      <div ref={scroller} className="h-dvh snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {items.map((item, i) => (
          <Slide
            key={item.id}
            index={i}
            item={item}
            active={i === active}
            near={Math.abs(i - active) <= 1}
            muted={muted}
            colors={colors}
            onOpen3D={() => setModel(item)}
          />
        ))}
      </div>

      {/* Barra de progresso e contador */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-3">
        <div className="h-1 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${((active + 1) / items.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-xs font-semibold text-white/90 drop-shadow">
          {active + 1} de {items.length}
        </div>
      </div>

      <div className="absolute right-3 top-8 z-10 flex gap-2">
        {hasVideo && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50"
            aria-label={muted ? "Ligar o som" : "Desligar o som"}
          >
            <Icon name={muted ? "mute" : "volume"} className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50"
          aria-label="Fechar"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>
      </div>

      {model && <DishModelOverlay item={model} colors={colors} onClose={() => setModel(null)} />}

      {hintVisible && startIndex < items.length - 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 text-center text-sm text-white/80 drop-shadow">
          Deslize a tela para o próximo prato
        </div>
      )}
    </div>
  );
}

type SlideProps = {
  index: number;
  item: MenuItemDTO;
  active: boolean;
  near: boolean;
  muted: boolean;
  colors: Colors;
  onOpen3D: () => void;
};

function Slide({ index, item, active, near, muted, colors, onOpen3D }: SlideProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [landscape, setLandscape] = useState(false); // vídeo horizontal: mostra inteiro em vez de cortar as laterais

  const hasVideo = Boolean(item.videoUrl);
  const playing = hasVideo && !showPhoto && active && !paused;

  // Toca só o vídeo que está na tela; os outros ficam parados para poupar dados e bateria.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing]);

  const price = item.promoPriceCents ?? item.priceCents;

  return (
    <section
      data-index={index}
      className="relative h-dvh w-full snap-start snap-always overflow-hidden"
      onClick={() => hasVideo && !showPhoto && setPaused((p) => !p)}
    >
      {hasVideo && !showPhoto ? (
        <video
          ref={video}
          src={near ? item.videoUrl : undefined}
          poster={item.posterUrl || item.imageUrl || undefined}
          muted={muted}
          loop
          playsInline
          preload={near ? "auto" : "none"}
          onLoadedMetadata={(e) => setLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)}
          className={`absolute inset-0 h-full w-full ${landscape ? "bg-black object-contain" : "object-cover"}`}
        />
      ) : (
        <DishImage
          src={item.imageUrl}
          name={item.name}
          primary={colors.primary}
          secondary={colors.secondary}
          className="absolute inset-0 h-full w-full"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

      {hasVideo && paused && !showPhoto && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
            <Icon name="play" className="h-8 w-8" />
          </span>
        </div>
      )}

      {hasVideo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPhoto((s) => !s);
          }}
          className="absolute left-4 top-16 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold"
        >
          <Icon name={showPhoto ? "camera" : "image"} className="h-4 w-4" />
          {showPhoto ? "Ver Vídeo" : "Ver Foto"}
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        {!item.available && (
          <div className="rounded-lg bg-red-600 px-3 py-2 text-center text-sm font-bold">
            Indisponível no momento
          </div>
        )}
        <span
          className="w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: colors.secondary, color: "#111" }}
        >
          Reels do prato
        </span>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">{item.category}</span>
          {item.featured && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">★ Destaque</span>}
        </div>
        <h2 className="text-2xl font-bold leading-tight">{item.name}</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold" style={{ color: colors.secondary }}>
            {formatPrice(price)}
          </span>
          {item.promoPriceCents !== null && (
            <span className="text-sm text-white/60 line-through">{formatPrice(item.priceCents)}</span>
          )}
        </div>
        {item.modelGlbUrl && (
          <button
            type="button"
            onClick={onOpen3D}
            className="flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-lg"
            style={{ background: colors.secondary, color: "#111" }}
          >
            <Icon name="cube" className="h-5 w-5" />
            Veja seu prato na mesa
          </button>
        )}
        {item.description && (
          <p className={`text-sm text-white/85 ${expanded ? "" : "line-clamp-2"}`}>
            {item.description}
            {expanded && (
              <button type="button" onClick={() => setExpanded(false)} className="ml-1 font-semibold underline">
                menos
              </button>
            )}
          </p>
        )}
        {item.description.length > 80 && !expanded && (
          <button type="button" onClick={() => setExpanded(true)} className="w-fit text-sm font-semibold underline">
            leia mais
          </button>
        )}
        {hasVideo && <p className="text-xs text-white/50">{paused ? "Toque para continuar" : "Toque para pausar"}</p>}
      </div>
    </section>
  );
}
