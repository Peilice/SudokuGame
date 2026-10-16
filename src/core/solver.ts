import { ALL_DIGITS_MASK, CELLS, PEERS, digitBit, popcount, type Grid } from './board';
import { shuffle, type Rng } from './random';

/**
 * 回溯搜尋：每次挑候選數最少的空格（MRV），找到 limit 個解就停止。
 * 傳入 rng 時會隨機化嘗試順序，用於產生隨機完整盤面。
 */
function search(grid: Grid, limit: number, rng: Rng | undefined, solutions: Grid[]): void {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;

  for (let i = 0; i < CELLS; i++) {
    if (grid[i]) continue;
    let used = 0;
    for (const p of PEERS[i]) if (grid[p]) used |= digitBit(grid[p]);
    const mask = ALL_DIGITS_MASK & ~used;
    const count = popcount(mask);
    if (count === 0) return; // 死路
    if (count < bestCount) {
      best = i;
      bestMask = mask;
      bestCount = count;
      if (count === 1) break;
    }
  }

  if (best === -1) {
    solutions.push([...grid]);
    return;
  }

  let digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & digitBit(d)) digits.push(d);
  if (rng) digits = shuffle(digits, rng);

  for (const d of digits) {
    grid[best] = d;
    search(grid, limit, rng, solutions);
    if (solutions.length >= limit) break;
  }
  grid[best] = 0;
}

/** 計算解的數量，最多數到 limit（判斷唯一解時用 limit = 2） */
export function countSolutions(grid: Grid, limit = 2): number {
  const solutions: Grid[] = [];
  search([...grid], limit, undefined, solutions);
  return solutions.length;
}

/** 求一個解；無解時回傳 null */
export function solve(grid: Grid, rng?: Rng): Grid | null {
  const solutions: Grid[] = [];
  search([...grid], 1, rng, solutions);
  return solutions[0] ?? null;
}
