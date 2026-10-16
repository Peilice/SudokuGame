import { describe, expect, it } from 'vitest';
import { countClues, findConflicts, parseGrid, UNITS } from '../src/core/board';
import { DIFFICULTIES, generatePuzzle, gradePuzzle } from '../src/core/generator';
import { createRng } from '../src/core/random';
import { countSolutions, solve } from '../src/core/solver';
import { solveLogically } from '../src/core/techniques';

// 只需 Single 類技巧即可解完的經典題
const SINGLES_PUZZLE = parseGrid(
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
);
// 有多解的盤面（全空）
const EMPTY = parseGrid('.'.repeat(81));

function isValidSolution(grid: number[]): boolean {
  return UNITS.every((unit) => new Set(unit.map((i) => grid[i])).size === 9 && unit.every((i) => grid[i] > 0));
}

describe('board', () => {
  it('找出重複數字的衝突格', () => {
    const grid = parseGrid('5.......5' + '.'.repeat(72));
    expect([...findConflicts(grid)].sort((a, b) => a - b)).toEqual([0, 8]);
  });
});

describe('solver', () => {
  it('解出合法且與題目一致的答案', () => {
    const solution = solve(SINGLES_PUZZLE)!;
    expect(isValidSolution(solution)).toBe(true);
    SINGLES_PUZZLE.forEach((v, i) => v && expect(solution[i]).toBe(v));
  });

  it('正確計算解的數量', () => {
    expect(countSolutions(SINGLES_PUZZLE)).toBe(1);
    expect(countSolutions(EMPTY, 2)).toBe(2);
  });
});

describe('techniques', () => {
  it('邏輯解題器的結果與回溯解題器一致', () => {
    const logical = solveLogically(SINGLES_PUZZLE);
    expect(logical.solved).toBe(true);
    expect(logical.steps.filter((s) => s.placement).length).toBe(81 - countClues(SINGLES_PUZZLE));
    expect(gradePuzzle(SINGLES_PUZZLE)).toBe('medium');
  });

  it('每個步驟都不會刪掉正確答案', () => {
    const rng = createRng(42);
    for (let n = 0; n < 10; n++) {
      const { puzzle, solution } = generatePuzzle(n % 2 ? 'expert' : 'hard', rng);
      const { steps } = solveLogically(puzzle);
      for (const step of steps) {
        if (step.placement) expect(solution[step.placement.index]).toBe(step.placement.digit);
        for (const e of step.eliminations) expect(e.mask & (1 << (solution[e.index] - 1))).toBe(0);
      }
    }
  });
});

describe('generator', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`產生唯一解且符合難度的題目：${difficulty}`, () => {
      const rng = createRng(2026);
      for (let n = 0; n < 5; n++) {
        const { puzzle, solution } = generatePuzzle(difficulty, rng);
        expect(countSolutions(puzzle)).toBe(1);
        expect(isValidSolution(solution)).toBe(true);
        expect(gradePuzzle(puzzle)).toBe(difficulty);
      }
    });
  }
});
