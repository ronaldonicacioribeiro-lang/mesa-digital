export type Difficulty = "facil" | "medio" | "dificil";

// Quantas casas já vêm preenchidas (quanto menos, mais difícil).
export const GIVENS: Record<Difficulty, number> = { facil: 40, medio: 32, dificil: 26 };

type Grid = number[]; // 81 casas, 0 = vazia

function usedMask(g: Grid, i: number): number {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const br = r - (r % 3);
  const bc = c - (c % 3);
  let mask = 0;
  for (let k = 0; k < 9; k++) {
    mask |= 1 << g[r * 9 + k];
    mask |= 1 << g[k * 9 + c];
    mask |= 1 << g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)];
  }
  return mask;
}

const popcount = (n: number) => {
  let c = 0;
  for (; n; n &= n - 1) c++;
  return c;
};

// Escolhe a casa vazia com menos opções (acelera muito a busca).
function bestCell(g: Grid): { cell: number; mask: number } | null | "full" {
  let cell = -1;
  let mask = 0;
  let best = 10;
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const m = ~usedMask(g, i) & 0x3fe;
    const n = popcount(m);
    if (n === 0) return null; // beco sem saída
    if (n < best) {
      best = n;
      cell = i;
      mask = m;
    }
  }
  return cell === -1 ? "full" : { cell, mask };
}

// Conta soluções, parando em `limit` (basta saber se é 0, 1 ou "mais de 1").
function countSolutions(g: Grid, limit: number): number {
  const pick = bestCell(g);
  if (pick === null) return 0;
  if (pick === "full") return 1;
  let total = 0;
  for (let v = 1; v <= 9 && total < limit; v++) {
    if (!(pick.mask & (1 << v))) continue;
    g[pick.cell] = v;
    total += countSolutions(g, limit - total);
  }
  g[pick.cell] = 0;
  return total;
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Preenche um tabuleiro completo e válido, em ordem aleatória.
function fill(g: Grid): boolean {
  const pick = bestCell(g);
  if (pick === null) return false;
  if (pick === "full") return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (!(pick.mask & (1 << v))) continue;
    g[pick.cell] = v;
    if (fill(g)) return true;
  }
  g[pick.cell] = 0;
  return false;
}

export function generate(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution: Grid = new Array(81).fill(0);
  fill(solution);

  // Tira casas uma a uma, só mantendo a retirada se o jogo continuar com UMA única solução.
  const puzzle = [...solution];
  let givens = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (givens <= GIVENS[difficulty]) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions([...puzzle], 2) !== 1) puzzle[i] = keep;
    else givens--;
  }
  return { puzzle, solution };
}

// Casas que repetem número na linha, coluna ou quadrado (para pintar de vermelho).
export function conflicts(g: Grid): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const r = Math.floor(i / 9);
    const c = i % 9;
    for (let j = 0; j < 81; j++) {
      if (j === i || g[j] !== v) continue;
      const rj = Math.floor(j / 9);
      const cj = j % 9;
      if (rj === r || cj === c || (Math.floor(rj / 3) === Math.floor(r / 3) && Math.floor(cj / 3) === Math.floor(c / 3))) {
        bad.add(i);
        break;
      }
    }
  }
  return bad;
}
