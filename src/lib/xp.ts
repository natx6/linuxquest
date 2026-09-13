/** XP & level math. Level curve: xpForLevel(n) = 100 * n * 1.5^(n-1) */

export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  // cumulative XP required to *reach* level n
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.round(100 * i * Math.pow(1.5, i - 1));
  return total;
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.round(100 * currentLevel * Math.pow(1.5, currentLevel - 1));
}

export function levelForXp(xp: number): number {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}

export function progressToNextLevel(xp: number): { level: number; current: number; needed: number; pct: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const needed = xpForNextLevel(level);
  const current = xp - base;
  return { level, current, needed, pct: needed === 0 ? 100 : Math.min(100, (current / needed) * 100) };
}

export function lessonXp(hintsUsed: number, base = 25): number {
  return Math.max(5, base - hintsUsed * 5);
}

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Script Kiddie',
  2: 'Terminal Tourist',
  3: 'Root Novice',
  4: 'Sudoer',
  5: 'Sysadmin',
  6: 'Kernel Hacker',
};

export function titleForLevel(n: number): string {
  if (LEVEL_TITLES[n]) return LEVEL_TITLES[n];
  return n >= 7 ? 'Root Lord' : 'Novice';
}
