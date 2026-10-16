/** 盤面以長度 81 的陣列表示，索引 = row * 9 + col，0 代表空格 */
export type Grid = number[];

export const SIZE = 9;
export const CELLS = 81;

/** 數字 1–9 對應的位元遮罩：digit d → 1 << (d - 1) */
export const ALL_DIGITS_MASK = 0x1ff;

export const rowOf = (i: number): number => Math.floor(i / SIZE);
export const colOf = (i: number): number => i % SIZE;
export const boxOf = (i: number): number => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

export const digitBit = (d: number): number => 1 << (d - 1);

/** 計算遮罩中有幾個位元 */
export function popcount(mask: number): number {
  let n = 0;
  while (mask) {
    mask &= mask - 1;
    n++;
  }
  return n;
}

/** 將遮罩轉為數字陣列，例如 0b101 → [1, 3] */
export function maskToDigits(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (mask & digitBit(d)) out.push(d);
  return out;
}

/** 只有一個位元時回傳對應數字 */
export function singleDigit(mask: number): number {
  return Math.log2(mask) + 1;
}

export const ROWS: number[][] = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => r * 9 + c),
);
export const COLS: number[][] = Array.from({ length: 9 }, (_, c) =>
  Array.from({ length: 9 }, (_, r) => r * 9 + c),
);
export const BOXES: number[][] = Array.from({ length: 9 }, (_, b) => {
  const r0 = Math.floor(b / 3) * 3;
  const c0 = (b % 3) * 3;
  const cells: number[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push((r0 + r) * 9 + c0 + c);
  return cells;
});

/** 全部 27 個單位：9 列 + 9 行 + 9 宮 */
export const UNITS: number[][] = [...ROWS, ...COLS, ...BOXES];

/** 每格的同儕（同列、同行、同宮，不含自己），共 20 格 */
export const PEERS: number[][] = Array.from({ length: CELLS }, (_, i) => {
  const set = new Set<number>([...ROWS[rowOf(i)], ...COLS[colOf(i)], ...BOXES[boxOf(i)]]);
  set.delete(i);
  return [...set];
});

export function emptyGrid(): Grid {
  return new Array(CELLS).fill(0);
}

export function countClues(grid: Grid): number {
  return grid.reduce((n, v) => n + (v ? 1 : 0), 0);
}

/** 找出所有違反規則（同列／行／宮重複）的格子 */
export function findConflicts(grid: Grid): Set<number> {
  const conflicts = new Set<number>();
  for (const unit of UNITS) {
    const seen = new Map<number, number[]>();
    for (const i of unit) {
      const v = grid[i];
      if (!v) continue;
      const list = seen.get(v);
      if (list) list.push(i);
      else seen.set(v, [i]);
    }
    for (const list of seen.values()) {
      if (list.length > 1) list.forEach((i) => conflicts.add(i));
    }
  }
  return conflicts;
}

/** 由字串解析盤面，"." 或 "0" 代表空格 */
export function parseGrid(s: string): Grid {
  const chars = s.replace(/\s/g, '');
  if (chars.length !== CELLS) throw new Error(`盤面長度需為 81，實際為 ${chars.length}`);
  return [...chars].map((ch) => (ch === '.' ? 0 : Number(ch)));
}

export function gridToString(grid: Grid): string {
  return grid.map((v) => (v ? String(v) : '.')).join('');
}
