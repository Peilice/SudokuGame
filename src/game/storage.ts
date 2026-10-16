import { CELLS } from '../core/board';
import { DIFFICULTIES, type Difficulty } from '../core/generator';
import type { GameState } from './state';

/** 每個難度各存一盤，只有同難度開新局才會覆蓋 */
const SAVE_PREFIX = 'sudoku.save.v2.';
/** 目前正在玩的難度；回到主畫面時清除，重新整理後就停在主畫面 */
const CURRENT_KEY = 'sudoku.current.v2';
const LEGACY_KEY = 'sudoku.save.v1';

/** localStorage 在隱私模式等情況下可能無法使用，所有存取都要包 try/catch */
export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(SAVE_PREFIX + game.difficulty, JSON.stringify(game));
    localStorage.setItem(CURRENT_KEY, game.difficulty);
  } catch {
    // 無法存檔時靜默略過，遊戲仍可正常進行
  }
}

export function loadGame(difficulty: Difficulty): GameState | null {
  try {
    return parseGame(localStorage.getItem(SAVE_PREFIX + difficulty));
  } catch {
    return null;
  }
}

/** 重新整理前正在玩的那盤；在主畫面時回傳 null */
export function loadCurrentGame(): GameState | null {
  try {
    migrateLegacySave();
    const d = localStorage.getItem(CURRENT_KEY) as Difficulty | null;
    return d && DIFFICULTIES.includes(d) ? loadGame(d) : null;
  } catch {
    return null;
  }
}

export function clearCurrent(): void {
  try {
    localStorage.removeItem(CURRENT_KEY);
  } catch {
    // 忽略
  }
}

/** 舊版只有一個存檔：搬到對應難度，並視為目前正在玩的那盤 */
function migrateLegacySave(): void {
  const game = parseGame(localStorage.getItem(LEGACY_KEY));
  if (game) saveGame(game);
  localStorage.removeItem(LEGACY_KEY);
}

function parseGame(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
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
