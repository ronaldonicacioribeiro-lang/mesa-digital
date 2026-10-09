"use client";

import { Icon } from "@/components/Icon";
import { DishModelViewer } from "@/components/DishModelViewer";
import type { MenuItemDTO } from "@/lib/menu";

type Props = {
  item: MenuItemDTO;
  colors: { primary: string; secondary: string };
  onClose: () => void;
};

// Tela cheia com o prato em 3D e o botão de realidade aumentada.
export function DishModelOverlay({ item, colors, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col gap-4 overflow-y-auto bg-neutral-950 p-4 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} em 3D`}
    >
      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Veja em 3D</p>
          <h2 className="text-xl font-bold leading-tight">{item.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15"
          aria-label="Fechar"
        >
          <Icon name="x" className="h-5 w-5" />
        </button>
      </div>

      <DishModelViewer
        glb={item.modelGlbUrl}
        usdz={item.modelUsdzUrl || undefined}
        poster={item.posterUrl || item.imageUrl || undefined}
        name={item.name}
        colors={colors}
      />
    </div>
  );
}
