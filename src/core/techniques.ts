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
}

export type TechniqueName =
  | 'Naked Single'
  | 'Hidden Single'
  | 'Pointing'
  | 'Claiming'
  | 'Naked Pair'
  | 'Hidden Pair'
  | 'Naked Triple';

const LEVEL_OF: Record<TechniqueName, TechniqueLevel> = {
  'Naked Single': TechniqueLevel.Single,
  'Hidden Single': TechniqueLevel.Single,
  Pointing: TechniqueLevel.Intersection,
  Claiming: TechniqueLevel.Intersection,
  'Naked Pair': TechniqueLevel.Subset,
  'Hidden Pair': TechniqueLevel.Subset,
  'Naked Triple': TechniqueLevel.Subset,
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

/** Hidden Pair：單位內兩個數字只出現在同樣兩格 → 這兩格刪除其他候選數 */
function findHiddenPair({ cands }: SolveState): Step | null {
  for (const unit of UNITS) {
    const positions: number[][] = [];
    for (let d = 1; d <= 9; d++) positions[d] = unit.filter((i) => cands[i] & digitBit(d));
    for (let d1 = 1; d1 <= 8; d1++) {
      if (positions[d1].length !== 2) continue;
      for (let d2 = d1 + 1; d2 <= 9; d2++) {
        const [a, b] = positions[d1];
        if (positions[d2].length !== 2 || positions[d2][0] !== a || positions[d2][1] !== b) continue;
        const keep = digitBit(d1) | digitBit(d2);
        const eliminations = collectEliminations([a, b], ~keep & ALL_DIGITS_MASK, cands);
        if (eliminations.length) return makeStep('Hidden Pair', { eliminations });
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
    findHiddenPair(state) ??
    findNakedSubset(state, 3)
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
