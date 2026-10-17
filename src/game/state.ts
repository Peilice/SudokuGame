import { CELLS, PEERS, UNITS, digitBit, findConflicts, type Grid } from '../core/board';
import type { Difficulty, Puzzle } from '../core/generator';

/** 單格變化，同時記錄變化前後，用於復原與重做 */
interface CellChange {
  index: number;
  prevValue: number;
  prevNotes: number;
  nextValue: number;
  nextNotes: number;
}

/** 一次操作可能影響多格（例如填數字時自動清除同儕筆記） */
type Move = CellChange[];

export interface GameState {
  puzzle: Grid;
  solution: Grid;
  difficulty: Difficulty;
  values: Grid;
  /** 每格筆記的位元遮罩 */
  notes: number[];
  elapsedMs: number;
  completed: boolean;
  undoStack: Move[];
  redoStack: Move[];
}

export function createGame({ puzzle, solution, difficulty }: Puzzle): GameState {
  return {
    puzzle,
    solution,
    difficulty,
    values: [...puzzle],
    notes: new Array(CELLS).fill(0),
    elapsedMs: 0,
    completed: false,
    undoStack: [],
    redoStack: [],
  };
}

export const isGiven = (game: GameState, i: number): boolean => game.puzzle[i] !== 0;

/** 建立一個操作的變化紀錄器 */
function recorder(game: GameState) {
  const changes = new Map<number, CellChange>();
  return {
    set(index: number, value: number, notes: number) {
      const existing = changes.get(index);
      const change = existing ?? {
        index,
        prevValue: game.values[index],
        prevNotes: game.notes[index],
        nextValue: value,
        nextNotes: notes,
      };
      change.nextValue = value;
      change.nextNotes = notes;
      changes.set(index, change);
    },
    commit(): boolean {
      const move = [...changes.values()].filter((c) => c.prevValue !== c.nextValue || c.prevNotes !== c.nextNotes);
      if (!move.length) return false;
      applyMove(game, move, 'next');
      game.undoStack.push(move);
      game.redoStack = [];
      updateCompleted(game);
      return true;
    },
  };
}

function applyMove(game: GameState, move: Move, side: 'prev' | 'next'): void {
  for (const c of move) {
    game.values[c.index] = side === 'prev' ? c.prevValue : c.nextValue;
    game.notes[c.index] = side === 'prev' ? c.prevNotes : c.nextNotes;
  }
}

function updateCompleted(game: GameState): void {
  game.completed = game.values.every((v, i) => v === game.solution[i]);
}

/**
 * 在格子填入數字。若已是相同數字則清除。
 * 填入時會清除該格筆記，並自動移除同列／行／宮中相同數字的筆記。
 */
export function placeDigit(game: GameState, i: number, digit: number): boolean {
  if (game.completed || isGiven(game, i)) return false;
  const rec = recorder(game);
  if (game.values[i] === digit) {
    rec.set(i, 0, 0);
  } else {
    rec.set(i, digit, 0);
    const bit = digitBit(digit);
    for (const p of PEERS[i]) {
      if (game.notes[p] & bit) rec.set(p, game.values[p], game.notes[p] & ~bit);
    }
  }
  return rec.commit();
}

/** 切換筆記；已填數字的格子不能加筆記 */
export function toggleNote(game: GameState, i: number, digit: number): boolean {
  if (game.completed || isGiven(game, i) || game.values[i]) return false;
  const rec = recorder(game);
  rec.set(i, 0, game.notes[i] ^ digitBit(digit));
  return rec.commit();
}

/** 清除格子的數字與筆記 */
export function eraseCell(game: GameState, i: number): boolean {
  if (game.completed || isGiven(game, i)) return false;
  const rec = recorder(game);
  rec.set(i, 0, 0);
  return rec.commit();
}

export function undo(game: GameState): boolean {
  const move = game.undoStack.pop();
  if (!move || game.completed) {
    if (move) game.undoStack.push(move);
    return false;
  }
  applyMove(game, move, 'prev');
  game.redoStack.push(move);
  return true;
}

export function redo(game: GameState): boolean {
  const move = game.redoStack.pop();
  if (!move) return false;
  applyMove(game, move, 'next');
  game.undoStack.push(move);
  updateCompleted(game);
  return true;
}

export function getConflicts(game: GameState): Set<number> {
  return findConflicts(game.values);
}

/**
 * 已經填滿 9 格、而且沒有任何衝突的單位（UNITS 的索引：0–8 列、9–17 行、18–26 宮）。
 * 只依規則判斷，不比對答案，所以不會洩漏對錯。
 */
export function filledUnits(game: GameState, conflicts = getConflicts(game)): Set<number> {
  const filled = new Set<number>();
  UNITS.forEach((unit, u) => {
    if (unit.every((i) => game.values[i] !== 0 && !conflicts.has(i))) filled.add(u);
  });
  return filled;
}

/** 每個數字已出現的次數（索引 1–9） */
export function digitCounts(game: GameState): number[] {
  const counts = new Array(10).fill(0);
  for (const v of game.values) if (v) counts[v]++;
  return counts;
}
