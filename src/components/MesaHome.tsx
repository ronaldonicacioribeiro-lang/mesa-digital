import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

type Props = {
  name: string;
  tagline: string;
  logoText: string;
  tableNumber: number;
  instagram: string;
  googleReviewUrl: string;
  hrefs: { menu: string; feedback: string; game: string; loyalty: string; wifi?: string };
  colors: { primary: string; secondary: string; background: string; text: string };
};

type Button = { icon: IconName; label: string; href?: string; external?: boolean };

// Botões da tela da mesa. Sem `href` = função ainda não construída (vem nas próximas fases).
function buttons({ hrefs, googleReviewUrl }: Pick<Props, "hrefs" | "googleReviewUrl">): Button[] {
  return [
    { icon: "receipt", label: "Pedir a conta" },
    { icon: "book", label: "Ver cardápio", href: hrefs.menu },
    { icon: "star", label: "Cartão fidelidade", href: hrefs.loyalty },
    // Google: link direto para o formulário de avaliação, igual para todos os clientes.
    { icon: "chat", label: "Avaliar no Google", href: googleReviewUrl || undefined, external: true },
    { icon: "mail", label: "Feedback anônimo", href: hrefs.feedback },
    { icon: "game", label: "Jogo", href: hrefs.game },
  ];
}

function SoonBadge({ color }: { color: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: color, color: "#fff" }}
    >
      Em breve
    </span>
  );
}

export function MesaHome({ name, tagline, logoText, tableNumber, instagram, googleReviewUrl, hrefs, colors: c }: Props) {
  const tile =
    "flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-3 text-center text-sm font-semibold shadow-sm disabled:opacity-60";

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pb-8 pt-8"
      style={{ background: c.background, color: c.text }}
    >
      {/* A barra de status do celular usa a cor do restaurante */}
      <meta name="theme-color" content={c.primary} />

      <header className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-md"
          style={{ background: c.primary, color: c.secondary }}
        >
          {logoText}
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{name}</h1>
          <p className="text-sm opacity-70">{tagline}</p>
        </div>
        <span
          className="rounded-full px-4 py-1 text-sm font-semibold"
          style={{ background: c.secondary, color: c.text }}
        >
          Mesa {String(tableNumber).padStart(2, "0")}
        </span>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-center text-lg font-semibold">Como podemos ajudar?</h2>

        <button
          type="button"
          disabled
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl px-6 py-6 text-xl font-bold shadow-md disabled:opacity-90"
          style={{ background: c.primary, color: c.secondary }}
        >
          <span className="flex items-center gap-3">
            <Icon name="bell" className="h-8 w-8" />
            Chamar garçom
          </span>
          <SoonBadge color="rgba(0,0,0,0.35)" />
        </button>

        <div className="grid grid-cols-2 gap-3">
          {buttons({ hrefs, googleReviewUrl }).map((b) => {
            const content = (
              <>
                <span style={{ color: c.primary }}>
                  <Icon name={b.icon} className="h-7 w-7" />
                </span>
                {b.label}
                {!b.href && <SoonBadge color={c.primary} />}
              </>
            );
            const style = { borderColor: `${c.primary}33`, color: c.text };
            if (!b.href) {
              return (
                <button key={b.label} type="button" disabled className={tile} style={style}>
                  {content}
                </button>
              );
            }
            return b.external ? (
              <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer" className={tile} style={style}>
                {content}
              </a>
            ) : (
              <Link key={b.label} href={b.href} className={tile} style={style}>
                {content}
              </Link>
            );
          })}
        </div>

        {hrefs.wifi && (
          <Link
            href={hrefs.wifi}
            className={`${tile} min-h-16 w-full flex-row`}
            style={{ borderColor: `${c.primary}33`, color: c.text }}
          >
            <span style={{ color: c.primary }}>
              <Icon name="wifi" className="h-6 w-6" />
            </span>
            Conectar ao Wi-Fi
          </Link>
        )}
      </section>

      {instagram && (
        <a
          href={instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center justify-center gap-2 text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: c.primary }}
        >
          <Icon name="instagram" className="h-5 w-5" />
          Siga a gente no Instagram
        </a>
      )}
    </main>
  );
}
