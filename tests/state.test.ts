import { describe, expect, it } from 'vitest';
import { parseGrid } from '../src/core/board';
import { solve } from '../src/core/solver';
import {
  createGame,
  eraseCell,
  filledUnits,
  placeDigit,
  redo,
  resetGame,
  toggleNote,
  undo,
  type GameState,
} from '../src/game/state';

const PUZZLE = parseGrid('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79');
const SOLUTION = solve(PUZZLE)!;

function newGame(): GameState {
  return createGame({ puzzle: PUZZLE, solution: SOLUTION, difficulty: 'medium' });
}

describe('game state', () => {
  it('不能修改題目給定的格子', () => {
    const game = newGame();
    expect(placeDigit(game, 0, 1)).toBe(false);
    expect(game.values[0]).toBe(5);
  });

  it('填入數字會自動清除同列／行／宮的相同筆記', () => {
    const game = newGame();
    toggleNote(game, 3, 6); // 第 0 列
    toggleNote(game, 11, 6); // 同宮
    toggleNote(game, 29, 6); // 第 2 行
    toggleNote(game, 78, 6); // 無關的格子
    placeDigit(game, 2, 6);
    expect(game.notes[3]).toBe(0);
    expect(game.notes[11]).toBe(0);
    expect(game.notes[29]).toBe(0);
    expect(game.notes[78]).toBe(1 << 5);
  });

  it('復原會一次還原填數與自動清除的筆記', () => {
    const game = newGame();
    toggleNote(game, 3, 6);
    toggleNote(game, 2, 4);
    placeDigit(game, 2, 6);
    undo(game);
    expect(game.values[2]).toBe(0);
    expect(game.notes[2]).toBe(1 << 3);
    expect(game.notes[3]).toBe(1 << 5);
    redo(game);
    expect(game.values[2]).toBe(6);
    expect(game.notes[3]).toBe(0);
  });

  it('重置會回到題目的初始盤面', () => {
    const game = newGame();
    toggleNote(game, 3, 6);
    placeDigit(game, 2, 4);
    game.elapsedMs = 5000;
    resetGame(game);
    expect(game.values).toEqual(game.puzzle);
    expect(game.notes.every((n) => n === 0)).toBe(true);
    expect(game.undoStack).toEqual([]);
    expect(game.redoStack).toEqual([]);
    expect(game.elapsedMs).toBe(0);
  });

  it('再按一次相同數字會清除', () => {
    const game = newGame();
    placeDigit(game, 2, 4);
    placeDigit(game, 2, 4);
    expect(game.values[2]).toBe(0);
  });

  it('單位填滿且沒有衝突才算填滿', () => {
    const game = newGame();
    const row0 = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !PUZZLE[i]);
    row0.slice(0, -1).forEach((i) => placeDigit(game, i, SOLUTION[i]));
    expect(filledUnits(game).has(0)).toBe(false);

    const last = row0[row0.length - 1];
    placeDigit(game, last, 5); // 和第 0 格的 5 重複
    expect(filledUnits(game).has(0)).toBe(false);

    placeDigit(game, last, SOLUTION[last]);
    expect(filledUnits(game).has(0)).toBe(true);
  });

  it('填完正確答案後標記完成', () => {
    const game = newGame();
    PUZZLE.forEach((v, i) => !v && placeDigit(game, i, SOLUTION[i]));
    expect(game.completed).toBe(true);
    expect(eraseCell(game, 2)).toBe(false);
  });
});
