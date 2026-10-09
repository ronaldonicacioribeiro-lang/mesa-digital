import Link from "next/link";
import { Icon } from "@/components/Icon";

type Props = {
  title: string;
  backHref: string;
  tableNumber: number;
  colors: { primary: string; secondary: string; background: string; text: string };
  children: React.ReactNode;
};

// Moldura das telas internas da mesa (feedback, jogo...): voltar, título e cores do restaurante.
export function MesaShell({ title, backHref, tableNumber, colors: c, children }: Props) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-10" style={{ background: c.background, color: c.text }}>
      <meta name="theme-color" content={c.primary} />
      <header className="flex items-center justify-between py-3">
        <Link href={backHref} className="flex items-center gap-1 text-sm font-semibold" style={{ color: c.primary }}>
          <Icon name="back" className="h-5 w-5" />
          Voltar para a mesa
        </Link>
        <span className="rounded-full px-3 py-0.5 text-xs font-semibold" style={{ background: c.secondary, color: c.text }}>
          Mesa {String(tableNumber).padStart(2, "0")}
        </span>
      </header>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
