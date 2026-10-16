import { CELLS, countClues, emptyGrid, type Grid } from './board';
import { createRng, shuffle, type Rng } from './random';
import { countSolutions, solve } from './solver';
import { TechniqueLevel, solveLogically } from './techniques';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '簡單',
  medium: '中等',
  hard: '困難',
  expert: '專家',
};

/** 簡單題至少保留的提示數 */
const EASY_MIN_CLUES = 36;

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
  difficulty: Difficulty;
}

/** 依 PLAN.md 的規則判定題目難度；logicallySolved 表示現有技巧能否解完 */
function grade(puzzle: Grid): { difficulty: Difficulty; logicallySolved: boolean } {
  const { solved, maxLevel } = solveLogically(puzzle);
  let difficulty: Difficulty;
  if (!solved || maxLevel >= TechniqueLevel.Subset) difficulty = 'expert';
  else if (maxLevel === TechniqueLevel.Intersection) difficulty = 'hard';
  else difficulty = countClues(puzzle) >= EASY_MIN_CLUES ? 'easy' : 'medium';
  return { difficulty, logicallySolved: solved };
}

export function gradePuzzle(puzzle: Grid): Difficulty {
  return grade(puzzle).difficulty;
}

/** 依隨機順序挖洞，每次都確認仍是唯一解；挖到 minClues 就停 */
function digHoles(solution: Grid, rng: Rng, minClues: number): Grid {
  const puzzle = [...solution];
  let clues = CELLS;
  for (const i of shuffle([...Array(CELLS).keys()], rng)) {
    if (clues <= minClues) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) clues--;
    else puzzle[i] = backup;
  }
  return puzzle;
}

const MAX_ATTEMPTS = 300;

/**
 * 產生指定難度的題目。反覆產生隨機題目並評分，直到符合難度為止；
 * 超過嘗試次數時退而求其次，回傳難度最接近的題目。
 */
export function generatePuzzle(difficulty: Difficulty, rng: Rng = createRng()): Puzzle {
  const target = DIFFICULTIES.indexOf(difficulty);
  let closest: { puzzle: Grid; solution: Grid; distance: number } | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = solve(emptyGrid(), rng)!;
    // 簡單題挖到 36–40 格就停，其他難度挖到不能再挖為止
    const minClues = difficulty === 'easy' ? EASY_MIN_CLUES + Math.floor(rng() * 5) : 0;
    const puzzle = digHoles(solution, rng, minClues);
    const result = grade(puzzle);
    // 專家題也要求現有技巧能解完，避免出現需要極高階技巧的題目
    if (result.difficulty === difficulty && result.logicallySolved) return { puzzle, solution, difficulty };

    const distance = Math.abs(DIFFICULTIES.indexOf(result.difficulty) - target) + (result.logicallySolved ? 0 : 0.5);
    if (!closest || distance < closest.distance) closest = { puzzle, solution, distance };
  }

  return { puzzle: closest!.puzzle, solution: closest!.solution, difficulty };
}
