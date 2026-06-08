export type Rank = {
  tier: string;
  stars: number; // 1..5
  minLevel: number;
  color: string;
};

export const RANKS: Rank[] = [
  { tier: "Apprentice",  stars: 1, minLevel: 1,  color: "oklch(0.75 0.05 80)" },
  { tier: "Line Cook",   stars: 2, minLevel: 5,  color: "oklch(0.80 0.10 82)" },
  { tier: "Sous Chef",   stars: 3, minLevel: 15, color: "oklch(0.82 0.14 82)" },
  { tier: "Head Chef",   stars: 4, minLevel: 30, color: "oklch(0.70 0.18 45)" },
  { tier: "Legendary",   stars: 5, minLevel: 50, color: "oklch(0.65 0.22 30)" },
];

export function rankFor(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) current = r;
  return current;
}

export function xpForNextLevel(level: number) {
  return level * 100;
}

export function xpProgress(xp: number, level: number) {
  // award trigger uses: level = 1 + xp/100, so floor.
  const into = xp - (level - 1) * 100;
  const needed = 100;
  return { into: Math.max(0, into), needed, pct: Math.min(100, Math.round((into / needed) * 100)) };
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  apprentice: "Apprentice",
  line_cook: "Line Cook",
  sous_chef: "Sous Chef",
  head_chef: "Head Chef",
  legendary: "Legendary",
};