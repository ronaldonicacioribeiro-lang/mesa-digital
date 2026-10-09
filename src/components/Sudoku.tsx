"use client";

import { useEffect, useMemo, useState } from "react";
import { conflicts, generate, type Difficulty } from "@/lib/sudoku";

type Props = { colors: { primary: string; secondary: string; text: string } };

const LEVELS: { key: Difficulty; label: string }[] = [
  { key: "facil", label: "Fácil" },
  { key: "medio", label: "Médio" },
  { key: "dificil", label: "Difícil" },
];

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function Sudoku({ colors: c }: Props) {
  const [level, setLevel] = useState<Difficulty | null>(null);
  const [given, setGiven] = useState<number[]>([]);
  const [values, setValues] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  const bad = useMemo(() => conflicts(values), [values]);
  const won = values.length === 81 && values.every((v) => v !== 0) && bad.size === 0;

  // Cronômetro: roda enquanto o jogo está em andamento.
  useEffect(() => {
    if (!level || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [level, won]);

  function start(l: Difficulty) {
    const { puzzle } = generate(l);
    setLevel(l);
    setGiven(puzzle);
    setValues(puzzle);
    setSelected(null);
    setSeconds(0);
  }

  function put(n: number) {
    if (selected === null || given[selected]) return;
    setValues((v) => v.map((x, i) => (i === selected ? n : x)));
  }

  if (!level) {
    return (
      <div className="flex flex-col gap-3">
        <p className="opacity-70">Escolha a dificuldade para começar:</p>
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => start(l.key)}
            className="rounded-2xl px-6 py-4 text-lg font-bold shadow-md"
            style={{ background: c.primary, color: c.secondary }}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  const sel = selected;
  const selVal = sel !== null ? values[sel] : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{LEVELS.find((l) => l.key === level)?.label}</span>
        <span className="tabular-nums">⏱ {fmt(seconds)}</span>
        <button type="button" onClick={() => setLevel(null)} className="underline" style={{ color: c.primary }}>
          Novo jogo
        </button>
      </div>

      <div className="grid grid-cols-9 overflow-hidden rounded-lg border-2 bg-white" style={{ borderColor: c.text }}>
        {values.map((v, i) => {
          const r = Math.floor(i / 9);
          const col = i % 9;
          const related =
            sel !== null &&
            (Math.floor(sel / 9) === r ||
              sel % 9 === col ||
              (Math.floor(sel / 9 / 3) === Math.floor(r / 3) && Math.floor((sel % 9) / 3) === Math.floor(col / 3)));
          const same = selVal !== 0 && v === selVal;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Linha ${r + 1}, coluna ${col + 1}${v ? `, valor ${v}` : ", vazio"}`}
              className="flex aspect-square items-center justify-center text-lg"
              style={{
                borderRight: col === 8 ? "none" : col % 3 === 2 ? `2px solid ${c.text}` : "1px solid #d1d5db",
                borderBottom: r === 8 ? "none" : r % 3 === 2 ? `2px solid ${c.text}` : "1px solid #d1d5db",
                background: i === sel ? `${c.secondary}` : same ? `${c.secondary}88` : related ? `${c.primary}14` : "#fff",
                fontWeight: given[i] ? 700 : 500,
                color: bad.has(i) ? "#dc2626" : given[i] ? c.text : c.primary,
              }}
            >
              {v || ""}
            </button>
          );
        })}
      </div>

      {won ? (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <div className="text-4xl">🎉</div>
          <p className="mt-1 text-lg font-bold">Parabéns! Você completou em {fmt(seconds)}.</p>
          <button
            type="button"
            onClick={() => start(level)}
            className="mt-3 rounded-full px-6 py-2 font-semibold"
            style={{ background: c.primary, color: c.secondary }}
          >
            Jogar de novo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => put(n)}
              className="rounded-xl bg-white py-3 text-xl font-bold shadow-sm"
              style={{ color: c.primary }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => put(0)}
            className="rounded-xl py-3 text-sm font-bold shadow-sm"
            style={{ background: c.primary, color: c.secondary }}
          >
            Apagar
          </button>
        </div>
      )}
    </div>
  );
}
