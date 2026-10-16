import { CELLS, boxOf, colOf, digitBit, rowOf } from '../core/board';
import { digitCounts, getConflicts, isGiven, type GameState } from '../game/state';

export interface BoardView {
  cells: HTMLElement[];
  values: HTMLElement[];
  notes: HTMLElement[][];
}

/** 建立 81 格的 DOM，之後只更新內容與 class */
export function buildBoard(container: HTMLElement): BoardView {
  const view: BoardView = { cells: [], values: [], notes: [] };
  container.replaceChildren();
  for (let i = 0; i < CELLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.setAttribute('role', 'gridcell');
    cell.style.setProperty('--r', String(rowOf(i)));
    cell.style.setProperty('--c', String(colOf(i)));
    if (colOf(i) % 3 === 2 && colOf(i) !== 8) cell.classList.add('box-right');
    if (rowOf(i) % 3 === 2 && rowOf(i) !== 8) cell.classList.add('box-bottom');

    const value = document.createElement('span');
    value.className = 'cell-value';

    const notesGrid = document.createElement('div');
    notesGrid.className = 'cell-notes';
    const notes: HTMLElement[] = [];
    for (let d = 1; d <= 9; d++) {
      const note = document.createElement('span');
      note.textContent = String(d);
      notesGrid.append(note);
      notes.push(note);
    }

    cell.append(value, notesGrid);
    container.append(cell);
    view.cells.push(cell);
    view.values.push(value);
    view.notes.push(notes);
  }
  return view;
}

export function renderBoard(view: BoardView, game: GameState, selected: number): void {
  const conflicts = getConflicts(game);
  const selValue = selected >= 0 ? game.values[selected] : 0;
  const selBit = selValue ? digitBit(selValue) : 0;

  for (let i = 0; i < CELLS; i++) {
    const cell = view.cells[i];
    const value = game.values[i];
    const related =
      selected >= 0 &&
      i !== selected &&
      (rowOf(i) === rowOf(selected) || colOf(i) === colOf(selected) || boxOf(i) === boxOf(selected));

    cell.classList.toggle('given', isGiven(game, i));
    cell.classList.toggle('user', !isGiven(game, i) && value !== 0);
    cell.classList.toggle('selected', i === selected);
    cell.classList.toggle('related', related);
    cell.classList.toggle('same-digit', value !== 0 && value === selValue && i !== selected);
    cell.classList.toggle('conflict', conflicts.has(i));
    cell.classList.toggle('has-notes', value === 0 && game.notes[i] !== 0);

    view.values[i].textContent = value ? String(value) : '';
    const noteMask = value ? 0 : game.notes[i];
    view.notes[i].forEach((note, k) => {
      const bit = 1 << k;
      note.classList.toggle('on', (noteMask & bit) !== 0);
      note.classList.toggle('match', (noteMask & bit & selBit) !== 0);
    });

    cell.setAttribute('aria-label', cellLabel(i, value, noteMask));
    cell.setAttribute('aria-selected', String(i === selected));
  }
}

function cellLabel(i: number, value: number, notes: number): string {
  const pos = `第 ${rowOf(i) + 1} 列第 ${colOf(i) + 1} 行`;
  if (value) return `${pos}，${value}`;
  if (notes) {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => notes & digitBit(d));
    return `${pos}，空格，筆記 ${digits.join('、')}`;
  }
  return `${pos}，空格`;
}

/** 建立 1–9 數字鍵盤 */
export function buildNumpad(container: HTMLElement): HTMLButtonElement[] {
  container.replaceChildren();
  const buttons: HTMLButtonElement[] = [];
  for (let d = 1; d <= 9; d++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'num';
    btn.dataset.digit = String(d);
    btn.innerHTML = `<span class="num-digit">${d}</span><span class="num-left"></span>`;
    container.append(btn);
    buttons.push(btn);
  }
  return buttons;
}

export function renderNumpad(buttons: HTMLButtonElement[], game: GameState): void {
  const counts = digitCounts(game);
  buttons.forEach((btn, k) => {
    const left = Math.max(0, 9 - counts[k + 1]);
    btn.classList.toggle('done', left === 0);
    btn.querySelector('.num-left')!.textContent = left ? String(left) : '';
    btn.setAttribute('aria-label', left ? `${k + 1}，剩 ${left} 個` : `${k + 1}，已全部填入`);
  });
}
