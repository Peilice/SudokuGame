/*
 * 玩法說明的示意圖：用和真正盤面相同的 .cell／.seam／.num class 排出一小塊盤面，
 * 不另外放圖檔，四種頁面風格與日夜模式自然跟著變，看到的就是遊戲裡的樣子。
 *
 * 每格用一個短字串描述：
 *   'g5' 題目 5、'u5' 玩家的 5、'n258' 筆記 2 5 8、'' 空格；
 *   後面加 '!' 表示衝突、'*' 表示選取中。
 */

type Row = string[];

function demoCell(spec: string, col: number, cols: number): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'cell';
  if (col % 3 === 2 && col !== cols - 1) cell.classList.add('box-right');
  if (spec.includes('!')) cell.classList.add('conflict');
  if (spec.includes('*')) cell.classList.add('selected');

  const kind = spec[0];
  const digits = spec.replace(/[^1-9]/g, '');
  const value = document.createElement('span');
  value.className = 'cell-value';
  if (kind === 'g' || kind === 'u') {
    cell.classList.add(kind === 'g' ? 'given' : 'user');
    value.textContent = digits;
  }
  cell.append(value);

  if (kind === 'n') {
    cell.classList.add('has-notes');
    const notes = document.createElement('div');
    notes.className = 'cell-notes';
    for (let d = 1; d <= 9; d++) {
      const note = document.createElement('span');
      note.textContent = String(d);
      note.classList.toggle('on', digits.includes(String(d)));
      notes.append(note);
    }
    cell.append(notes);
  }
  return cell;
}

function demoBoard(rows: Row[], seam?: 'row'): HTMLElement {
  const cols = rows[0].length;
  const board = document.createElement('div');
  board.className = 'board help-board';
  board.style.setProperty('--cols', String(cols));
  board.style.setProperty('--rows', String(rows.length));
  for (const specs of rows) {
    const row = document.createElement('div');
    row.className = 'board-row';
    specs.forEach((spec, c) => row.append(demoCell(spec, c, cols)));
    board.append(row);
  }
  if (seam) {
    const el = document.createElement('div');
    el.className = `seam seam-${seam} help-seam`;
    board.append(el);
  }
  return board;
}

function demoKeys(keys: [digit: number, left: number][]): HTMLElement {
  const pad = document.createElement('div');
  pad.className = 'numpad help-keys';
  for (const [digit, left] of keys) {
    const key = document.createElement('span');
    key.className = 'num';
    key.classList.toggle('done', left === 0);
    key.innerHTML = `<span class="num-digit">${digit}</span><span class="num-left">${left ? `剩${left}` : ''}</span>`;
    pad.append(key);
  }
  return pad;
}

function arrow(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'help-arrow';
  el.innerHTML = '<svg class="icon icon-stroke" viewBox="0 0 24 24"><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></svg>';
  return el;
}

/** 把示意圖放進說明對話框裡各張卡片的 data-demo 位置 */
export function buildHelpDemos(root: HTMLElement): void {
  const demos: Record<string, () => HTMLElement[]> = {
    rules: () => [
      demoBoard([
        ['g5', 'u3', 'g7'],
        ['u6', 'g1', 'u9'],
        ['g8', 'u2', 'u4'],
      ]),
    ],
    conflict: () => [demoBoard([['g3', 'g5!', '', 'u5!*', 'u8']])],
    notes: () => [
      demoBoard([['n257*', 'g3', 'n58']]),
      arrow(),
      demoBoard([['u5*', 'g3', 'n8']]),
    ],
    progress: () => [
      demoBoard([['g4', 'u9', 'g2', 'u7', 'g1', 'u3', 'g8', 'u6', 'g5']], 'row'),
      demoKeys([
        [7, 2],
        [8, 1],
        [9, 0],
      ]),
    ],
  };
  root.querySelectorAll<HTMLElement>('[data-demo]').forEach((slot) => {
    slot.replaceChildren(...demos[slot.dataset.demo!]());
  });
}
