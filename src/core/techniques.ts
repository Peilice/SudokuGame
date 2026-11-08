import {
  ALL_DIGITS_MASK,
  BOXES,
  CELLS,
  COLS,
  PEERS,
  ROWS,
  UNITS,
  boxOf,
  colOf,
  digitBit,
  popcount,
  rowOf,
  singleDigit,
  type Grid,
} from './board';

/** 技巧等級，數字越大越難 */
export enum TechniqueLevel {
  Single = 1,
  Intersection = 2,
  Subset = 3,
  Fish = 4,
}

export type TechniqueName =
  | 'Naked Single'
  | 'Hidden Single'
  | 'Pointing'
  | 'Claiming'
  | 'Naked Pair'
  | 'Hidden Pair'
  | 'Naked Triple'
  | 'Hidden Triple'
  | 'X-Wing'
  | 'Swordfish';

const LEVEL_OF: Record<TechniqueName, TechniqueLevel> = {
  'Naked Single': TechniqueLevel.Single,
  'Hidden Single': TechniqueLevel.Single,
  Pointing: TechniqueLevel.Intersection,
  Claiming: TechniqueLevel.Intersection,
  'Naked Pair': TechniqueLevel.Subset,
  'Hidden Pair': TechniqueLevel.Subset,
  'Naked Triple': TechniqueLevel.Subset,
  'Hidden Triple': TechniqueLevel.Subset,
  'X-Wing': TechniqueLevel.Fish,
  Swordfish: TechniqueLevel.Fish,
};

/** 一個解題步驟：可能是填入一格，或從某些格子刪除候選數（之後的提示功能會用到） */
export interface Step {
  technique: TechniqueName;
  level: TechniqueLevel;
  placement?: { index: number; digit: number };
  eliminations: { index: number; mask: number }[];
}

/** 解題中的狀態：已填數字與每格候選數遮罩 */
export interface SolveState {
  values: Grid;
  cands: number[];
}

export function createSolveState(grid: Grid): SolveState {
  const values = [...grid];
  const cands = new Array<number>(CELLS).fill(0);
  for (let i = 0; i < CELLS; i++) {
    if (values[i]) continue;
    let used = 0;
    for (const p of PEERS[i]) if (values[p]) used |= digitBit(values[p]);
    cands[i] = ALL_DIGITS_MASK & ~used;
  }
  return { values, cands };
}

function makeStep(technique: TechniqueName, partial: Omit<Step, 'technique' | 'level'>): Step {
  return { technique, level: LEVEL_OF[technique], ...partial };
}

/** 收集「從 cells 中刪除 mask」實際會造成的變化 */
function collectEliminations(cells: Iterable<number>, mask: number, cands: number[]): Step['eliminations'] {
  const out: Step['eliminations'] = [];
  for (const i of cells) {
    const hit = cands[i] & mask;
    if (hit) out.push({ index: i, mask: hit });
  }
  return out;
}

function findNakedSingle({ cands }: SolveState): Step | null {
  for (let i = 0; i < CELLS; i++) {
    if (cands[i] && popcount(cands[i]) === 1) {
      return makeStep('Naked Single', { placement: { index: i, digit: singleDigit(cands[i]) }, eliminations: [] });
    }
  }
  return null;
}

function findHiddenSingle({ cands }: SolveState): Step | null {
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const bit = digitBit(d);
      let spot = -1;
      let count = 0;
      for (const i of unit) {
        if (cands[i] & bit) {
          spot = i;
          if (++count > 1) break;
        }
      }
      if (count === 1) {
        return makeStep('Hidden Single', { placement: { index: spot, digit: d }, eliminations: [] });
      }
    }
  }
  return null;
}

/** Pointing：宮內某數字只出現在同一列（行）→ 刪除該列（行）其他宮的此數字 */
function findPointing({ cands }: SolveState): Step | null {
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const bit = digitBit(d);
      const spots = BOXES[b].filter((i) => cands[i] & bit);
      if (spots.length < 2) continue;
      for (const [lineOf, lines] of [
        [rowOf, ROWS],
        [colOf, COLS],
      ] as const) {
        const line = lineOf(spots[0]);
        if (!spots.every((i) => lineOf(i) === line)) continue;
        const targets = lines[line].filter((i) => boxOf(i) !== b);
        const eliminations = collectEliminations(targets, bit, cands);
        if (eliminations.length) return makeStep('Pointing', { eliminations });
      }
    }
  }
  return null;
}

/** Claiming：列（行）中某數字只出現在同一宮 → 刪除該宮其他列（行）的此數字 */
function findClaiming({ cands }: SolveState): Step | null {
  for (const [lineOf, lines] of [
    [rowOf, ROWS],
    [colOf, COLS],
  ] as const) {
    for (const line of lines) {
      for (let d = 1; d <= 9; d++) {
        const bit = digitBit(d);
        const spots = line.filter((i) => cands[i] & bit);
        if (spots.length < 2) continue;
        const b = boxOf(spots[0]);
        if (!spots.every((i) => boxOf(i) === b)) continue;
        const lineIndex = lineOf(spots[0]);
        const targets = BOXES[b].filter((i) => lineOf(i) !== lineIndex);
        const eliminations = collectEliminations(targets, bit, cands);
        if (eliminations.length) return makeStep('Claiming', { eliminations });
      }
    }
  }
  return null;
}

/** Naked Subset：單位內 n 格的候選數聯集恰好 n 個 → 從單位其他格刪除這些數字 */
function findNakedSubset({ cands }: SolveState, n: 2 | 3): Step | null {
  const name: TechniqueName = n === 2 ? 'Naked Pair' : 'Naked Triple';
  for (const unit of UNITS) {
    const open = unit.filter((i) => cands[i] && popcount(cands[i]) <= n);
    for (const combo of combinations(open, n)) {
      const union = combo.reduce((m, i) => m | cands[i], 0);
      if (popcount(union) !== n) continue;
      const others = unit.filter((i) => !combo.includes(i));
      const eliminations = collectEliminations(others, union, cands);
      if (eliminations.length) return makeStep(name, { eliminations });
    }
  }
  return null;
}

/** Hidden Subset：單位內 n 個數字只出現在同樣 n 格 → 這 n 格刪除其他候選數 */
function findHiddenSubset({ cands }: SolveState, n: 2 | 3): Step | null {
  const name: TechniqueName = n === 2 ? 'Hidden Pair' : 'Hidden Triple';
  for (const unit of UNITS) {
    const digits: number[] = [];
    const positions: number[][] = [];
    for (let d = 1; d <= 9; d++) {
      positions[d] = unit.filter((i) => cands[i] & digitBit(d));
      // 只出現一格的是 Hidden Single，已由更簡單的技巧處理
      if (positions[d].length >= 2 && positions[d].length <= n) digits.push(d);
    }
    for (const combo of combinations(digits, n)) {
      const cells = new Set(combo.flatMap((d) => positions[d]));
      if (cells.size !== n) continue;
      const keep = combo.reduce((m, d) => m | digitBit(d), 0);
      const eliminations = collectEliminations(cells, ~keep & ALL_DIGITS_MASK, cands);
      if (eliminations.length) return makeStep(name, { eliminations });
    }
  }
  return null;
}

/**
 * Fish（X-Wing n=2、Swordfish n=3）：某數字在 n 列中都只出現在同樣 n 行
 * → 這 n 行的其他列刪除此數字（列、行互換亦同）
 */
function findFish({ cands }: SolveState, n: 2 | 3): Step | null {
  const name: TechniqueName = n === 2 ? 'X-Wing' : 'Swordfish';
  for (const [bases, covers, coverOf] of [
    [ROWS, COLS, colOf],
    [COLS, ROWS, rowOf],
  ] as const) {
    for (let d = 1; d <= 9; d++) {
      const bit = digitBit(d);
      const candidates: { base: number; coverSet: number[] }[] = [];
      bases.forEach((line, base) => {
        const coverSet = line.filter((i) => cands[i] & bit).map(coverOf);
        if (coverSet.length >= 2 && coverSet.length <= n) candidates.push({ base, coverSet });
      });
      for (const combo of combinations(candidates, n)) {
        const coverLines = new Set(combo.flatMap((c) => c.coverSet));
        if (coverLines.size !== n) continue;
        const baseCells = new Set(combo.flatMap((c) => bases[c.base]));
        const targets = [...coverLines].flatMap((c) => covers[c]).filter((i) => !baseCells.has(i));
        const eliminations = collectEliminations(targets, bit, cands);
        if (eliminations.length) return makeStep(name, { eliminations });
      }
    }
  }
  return null;
}

function* combinations<T>(items: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield [...acc];
    return;
  }
  for (let i = start; i < items.length; i++) {
    acc.push(items[i]);
    yield* combinations(items, k, i + 1, acc);
    acc.pop();
  }
}

/** 依由易到難的順序尋找下一個可用步驟 */
export function findNextStep(state: SolveState): Step | null {
  return (
    findNakedSingle(state) ??
    findHiddenSingle(state) ??
    findPointing(state) ??
    findClaiming(state) ??
    findNakedSubset(state, 2) ??
    findHiddenSubset(state, 2) ??
    findNakedSubset(state, 3) ??
    findHiddenSubset(state, 3) ??
    findFish(state, 2) ??
    findFish(state, 3)
  );
}

export function applyStep(state: SolveState, step: Step): void {
  if (step.placement) {
    const { index, digit } = step.placement;
    state.values[index] = digit;
    state.cands[index] = 0;
    const bit = digitBit(digit);
    for (const p of PEERS[index]) state.cands[p] &= ~bit;
  }
  for (const { index, mask } of step.eliminations) state.cands[index] &= ~mask;
}

export interface LogicalSolveResult {
  solved: boolean;
  /** 解題過程中用到的最難技巧等級 */
  maxLevel: TechniqueLevel;
  steps: Step[];
}

/** 只用人類技巧解題，回傳是否解完與最難等級 */
export function solveLogically(grid: Grid): LogicalSolveResult {
  const state = createSolveState(grid);
  const steps: Step[] = [];
  let maxLevel = TechniqueLevel.Single;

  for (;;) {
    const step = findNextStep(state);
    if (!step) break;
    applyStep(state, step);
    steps.push(step);
    if (step.level > maxLevel) maxLevel = step.level;
  }

  const solved = state.values.every((v) => v !== 0);
  return { solved, maxLevel, steps };
}
