"use client";

export function PrintButton({ primary }: { primary: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full px-5 py-2.5 text-sm font-bold text-white print:hidden"
      style={{ background: primary }}
    >
      Imprimir
    </button>
  );
}
