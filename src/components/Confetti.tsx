// Chuva de confete só com CSS (sem biblioteca). As posições são fixas para ser leve e previsível.
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 100) / 100,
  duration: 2.2 + ((i * 29) % 15) / 10,
  size: 6 + ((i * 13) % 7),
  color: i % 3, // 0 = principal, 1 = secundária, 2 = branco
}));

export function Confetti({ primary, secondary }: { primary: string; secondary: string }) {
  const colors = [primary, secondary, "#ffffff"];
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: colors[p.color],
            boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
