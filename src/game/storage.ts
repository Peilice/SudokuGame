import { CELLS } from '../core/board';
import { DIFFICULTIES } from '../core/generator';
import type { GameState } from './state';

const SAVE_KEY = 'sudoku.save.v1';

/** localStorage 在隱私模式等情況下可能無法使用，所有存取都要包 try/catch */
export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {
    // 無法存檔時靜默略過，遊戲仍可正常進行
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    const valid =
      Array.isArray(data.puzzle) &&
      data.puzzle.length === CELLS &&
      Array.isArray(data.solution) &&
      Array.isArray(data.values) &&
      Array.isArray(data.notes) &&
      DIFFICULTIES.includes(data.difficulty);
    if (!valid) return null;
    return {
      ...data,
      elapsedMs: Number(data.elapsedMs) || 0,
      undoStack: data.undoStack ?? [],
      redoStack: data.redoStack ?? [],
    };
  } catch {
    return null;
  }
}
