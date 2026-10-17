import { colOf, rowOf } from '../core/board';
import { DIFFICULTIES, DIFFICULTY_LABEL, generatePuzzle, type Difficulty, type Puzzle } from '../core/generator';
import {
  createGame,
  digitCounts,
  eraseCell,
  filledUnits,
  getConflicts,
  isGiven,
  placeDigit,
  redo,
  toggleNote,
  undo,
  type GameState,
} from '../game/state';
import { clearCurrent, loadCurrentGame, loadGame, saveGame } from '../game/storage';
import { dismissHint, isHintDismissed, type HintId } from './hints';
import { Timer, formatTime } from '../game/timer';
import { buildBoard, buildNumpad, renderBoard, renderNumpad, type BoardView } from './board';
import { CONFLICT_HINT, PAGE_STYLES, PAGE_STYLE_LABEL, applyPageStyle, loadPageStyle, type PageStyle } from './theme';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** UNITS 的索引：0–8 列、9–17 行、18–26 宮 */
const unitName = (u: number): string =>
  u < 9 ? `第 ${u + 1} 列` : u < 18 ? `第 ${u - 8} 行` : `第 ${u - 17} 宮`;

const doneDigits = (game: GameState): Set<number> => {
  const counts = digitCounts(game);
  return new Set([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => counts[d] >= 9));
};

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  easy: '適合暖身',
  medium: '要多觀察幾處',
  hard: '要用到區塊排除',
  expert: '要找出數對、數組',
};

export class App {
  private game: GameState | null = null;
  private selected = -1;
  private notesMode = false;
  private paused = false;
  private generating = false;
  /** 每次出題遞增；取消或重新出題後，舊的結果一律丟棄 */
  private generation = 0;
  private pendingDifficulty: Difficulty | null = null;
  /** 確認對話框是從主畫面直接打開的，返回時要關掉對話框而不是回到選難度 */
  private confirmFromHome = false;

  private readonly boardEl = $<HTMLDivElement>('board');
  private readonly boardView: BoardView;
  private readonly numButtons: HTMLButtonElement[];
  private readonly timerEl = $('timer');
  private readonly newGameDialog = $<HTMLDialogElement>('new-game-dialog');
  private readonly timer = new Timer(0, (ms) => (this.timerEl.textContent = formatTime(ms)));
  private worker: Worker | null = null;
  private stampTimer = 0;
  private activeHint: HintId | null = null;
  private readonly seamsEl = $('seams');
  /** 上一步時已經填滿的單位與已經用完的數字，用來找出這一步新完成的 */
  private filled = new Set<number>();
  private doneDigits = new Set<number>();

  private static readonly HINT_TEXT: Record<Exclude<HintId, 'conflict'>, string> = {
    notes: '筆記模式：點數字會在格子裡寫下小小的候選數字，再點一次同一個數字可以擦掉。按「筆記中」回到一般填寫。',
  };

  constructor() {
    this.boardView = buildBoard(this.boardEl);
    this.numButtons = buildNumpad($('numpad'));
    this.buildDifficultyList($('difficulty-list'));
    this.buildDifficultyList($('home-list'), true);
    this.buildStylePicker($('style-options'));
    this.bindEvents();

    const saved = loadCurrentGame();
    if (saved) {
      this.loadState(saved);
    } else {
      this.showHome();
    }
  }

  // ───────── 遊戲流程 ─────────

  private loadState(game: GameState): void {
    this.game = game;
    this.setView('game');
    // 開局自動選第一個空格，避免一開始按數字沒有反應
    this.selected = game.completed ? -1 : game.values.findIndex((v) => v === 0);
    this.paused = false;
    this.timer.reset(game.elapsedMs);
    $('difficulty-label').textContent = DIFFICULTY_LABEL[game.difficulty];
    this.boardEl.classList.remove('celebrate');
    this.showStamp(game.completed, false);
    this.clearProgressMarks();
    this.filled = filledUnits(game);
    this.doneDigits = doneDigits(game);
    this.render();
    this.resumeTimerIfPlaying();
  }

  /** 同難度已有進行中的盤面時要先確認，避免一次誤觸就丟掉進度 */
  private chooseDifficulty(difficulty: Difficulty, fromHome = false): void {
    if (this.generating) return;
    const saved = this.savedGame(difficulty);
    if (saved && !saved.completed && this.hasProgress(saved)) {
      this.pendingDifficulty = difficulty;
      this.confirmFromHome = fromHome;
      const elapsed = saved === this.game ? this.timer.elapsed : saved.elapsedMs;
      $('confirm-text').textContent = `「${DIFFICULTY_LABEL[difficulty]}」還有一盤進行中（已用時 ${formatTime(
        elapsed,
      )}），開新的一盤會取代它。其他難度的進度不受影響。`;
      this.showDialogStep('confirm');
      if (fromHome) {
        this.newGameDialog.showModal();
        $('confirm-back').focus();
      }
      return;
    }
    void this.startNewGame(difficulty);
  }

  /** 目前這盤以記憶體中的為準，其他難度讀存檔 */
  private savedGame(difficulty: Difficulty): GameState | null {
    return this.game?.difficulty === difficulty ? this.game : loadGame(difficulty);
  }

  private hasProgress(game: GameState): boolean {
    return game.undoStack.length > 0 || game.values.some((v, i) => v !== 0 && !isGiven(game, i));
  }

  /** 主畫面點難度：有進行中的就接著玩，沒有就出新題 */
  private openDifficulty(difficulty: Difficulty): void {
    if (this.generating) return;
    const saved = loadGame(difficulty);
    if (!saved || saved.completed) return void this.startNewGame(difficulty);
    this.loadState(saved);
    saveGame(saved);
    this.focusBoard(true);
  }

  /** 回主畫面：先存檔，盤面留在該難度的存檔裡 */
  private goHome(): void {
    if (!this.game) return;
    this.persist();
    clearCurrent();
    this.game = null;
    this.paused = false;
    this.timer.stop();
    this.showStamp(false, false);
    this.boardEl.classList.remove('celebrate');
    this.clearProgressMarks();
    if (this.activeHint) {
      this.activeHint = null;
      $('hint').hidden = true;
    }
    document.body.classList.remove('is-paused', 'is-complete', 'notes-mode');
    this.showHome();
  }

  private showHome(): void {
    this.setView('home');
    this.renderHome();
    $('difficulty-label').textContent = '';
    $('home-title').focus({ preventScroll: true });
  }

  private setView(view: 'home' | 'game'): void {
    $('home').hidden = view !== 'home';
    document.querySelector<HTMLElement>('.layout')!.hidden = view !== 'game';
    document.body.classList.toggle('is-home', view === 'home');
  }

  private renderHome(): void {
    for (const d of DIFFICULTIES) {
      const saved = loadGame(d);
      const inProgress = !!saved && !saved.completed;
      const option = document.querySelector<HTMLElement>(`#home-list [data-difficulty="${d}"]`)!;
      const time = saved ? formatTime(saved.elapsedMs) : '';
      option.querySelector('.difficulty-hint')!.textContent = inProgress ? `繼續 · ${time}` : DIFFICULTY_HINT[d];
      option.classList.toggle('is-saved', inProgress);
      option.setAttribute(
        'aria-label',
        inProgress ? `${DIFFICULTY_LABEL[d]}，繼續進行中的一盤，已用時 ${time}` : `${DIFFICULTY_LABEL[d]}，開新的一盤`,
      );
      document.querySelector<HTMLElement>(`#home-list [data-restart="${d}"]`)!.hidden = !inProgress;
    }
  }

  private async startNewGame(difficulty: Difficulty): Promise<void> {
    if (this.generating) return;
    const ticket = ++this.generation;
    this.setGenerating(true, difficulty);
    try {
      const puzzle = await this.requestPuzzle(difficulty);
      if (ticket !== this.generation) return; // 已取消
      this.newGameDialog.close();
      this.persist(); // 換到別的難度時，原本那盤留在自己的存檔裡
      this.loadState(createGame(puzzle));
      saveGame(this.game!);
      this.focusBoard();
    } finally {
      if (ticket === this.generation) this.setGenerating(false);
    }
  }

  private setGenerating(on: boolean, difficulty?: Difficulty): void {
    this.generating = on;
    this.newGameDialog.classList.toggle('is-generating', on);
    // 對話框與主畫面各有一份出題中提示與難度清單
    document.querySelectorAll<HTMLElement>('.generating').forEach((el) => (el.hidden = !on));
    if (on && difficulty) {
      const text = `正在出一盤「${DIFFICULTY_LABEL[difficulty]}」…`;
      document.querySelectorAll('.generating-text').forEach((el) => (el.textContent = text));
    }
    document.querySelectorAll<HTMLButtonElement>('[data-difficulty], [data-restart]').forEach((btn) => {
      btn.disabled = on;
      btn.classList.toggle('is-chosen', on && btn.dataset.difficulty === difficulty);
    });
    $('home-cancel').hidden = !on;
    this.updateCancelButton();
  }

  /** 優先使用 Web Worker 出題；無法建立 Worker 時改在主執行緒產生 */
  private requestPuzzle(difficulty: Difficulty): Promise<Puzzle> {
    return new Promise((resolve) => {
      const fallback = () => setTimeout(() => resolve(generatePuzzle(difficulty)), 30);
      try {
        this.worker ??= new Worker(new URL('../core/worker.ts', import.meta.url), { type: 'module' });
      } catch {
        fallback();
        return;
      }
      this.worker.onmessage = (e: MessageEvent<Puzzle>) => resolve(e.data);
      this.worker.onerror = () => {
        this.worker = null;
        fallback();
      };
      this.worker.postMessage({ difficulty });
    });
  }

  /** 取消出題：結果會因 generation 不符而被丟棄 */
  private cancelNewGame(): void {
    if (this.generating) {
      this.generation++;
      // 直接停掉 worker，避免被取消的題目在下一次出題時送回來
      this.worker?.terminate();
      this.worker = null;
      this.setGenerating(false);
      if (!this.game) return; // 沒有可以回去的盤面，留在選難度畫面
    }
    if (this.game) this.newGameDialog.close();
  }

  private get isPlaying(): boolean {
    return !!this.game && !this.game.completed && !this.paused && !this.newGameDialog.open && !document.hidden;
  }

  private resumeTimerIfPlaying(): void {
    if (this.isPlaying) this.timer.start();
    else this.timer.stop();
  }

  private persist(): void {
    if (!this.game) return;
    this.game.elapsedMs = this.timer.elapsed;
    saveGame(this.game);
  }

  private setPaused(paused: boolean): void {
    if (!this.game || this.game.completed) paused = false;
    this.paused = paused;
    this.resumeTimerIfPlaying();
    this.persist();
    this.render();
    if (paused) $('resume-btn').focus();
    else this.focusBoard();
  }

  /** 每次操作後：存檔、重繪、檢查是否完成 */
  private afterMove(changed: boolean): void {
    if (!changed || !this.game) return;
    if (this.game.completed) this.timer.stop();
    this.persist();
    this.render();
    this.markProgress();
    if (this.game.completed) this.celebrate();
  }

  /** 填滿一列／行／宮時沿著它縫一道線；某個數字 9 個都填完時，數字鍵往下一沉、縫線被抽掉 */
  private markProgress(): void {
    const game = this.game!;
    const filled = filledUnits(game);
    const done = doneDigits(game);
    const newUnits = [...filled].filter((u) => !this.filled.has(u));
    const newDigits = [...done].filter((d) => !this.doneDigits.has(d));
    this.filled = filled;
    this.doneDigits = done;
    if (game.completed) return; // 過關有自己的波浪與完成印

    // 一步同時填滿好幾段時依序縫，列 → 行 → 宮
    newUnits.forEach((u, k) => this.stitchUnit(u, k));
    newDigits.forEach((d) => this.settleKey(d));
    if (newUnits.length) this.announce(`${newUnits.map(unitName).join('、')}填滿了`);
  }

  private stitchUnit(u: number, order: number): void {
    const n = u % 9;
    const kind = u < 9 ? 'row' : u < 18 ? 'col' : 'box';
    const [r0, c0, rs, cs] =
      kind === 'row' ? [n, 0, 1, 9] : kind === 'col' ? [0, n, 9, 1] : [Math.floor(n / 3) * 3, (n % 3) * 3, 3, 3];
    const seam = document.createElement('div');
    seam.className = `seam seam-${kind}`;
    seam.style.cssText = `--r0:${r0};--c0:${c0};--rs:${rs};--cs:${cs};--order:${order}`;
    const remove = () => seam.remove();
    seam.addEventListener('animationend', remove);
    window.setTimeout(remove, 3000); // 動畫被中斷時也要清掉
    this.seamsEl.append(seam);
  }

  private settleKey(digit: number): void {
    const btn = this.numButtons[digit - 1];
    btn.classList.remove('just-done');
    void btn.offsetWidth; // 重新觸發動畫
    btn.classList.add('just-done');
    window.setTimeout(() => btn.classList.remove('just-done'), 900);
  }

  private clearProgressMarks(): void {
    this.seamsEl.replaceChildren();
    this.numButtons.forEach((btn) => btn.classList.remove('just-done'));
  }

  private celebrate(): void {
    this.boardEl.classList.remove('celebrate');
    void this.boardEl.offsetWidth; // 重新觸發動畫
    this.boardEl.classList.add('celebrate');
    this.showStamp(true, true);
    // 焦點移到「再來一盤」，盤面上不留選取框，鍵盤玩家也能直接按 Enter 開新局
    $('win-new-game').focus({ preventScroll: true });
    const game = this.game!;
    this.announce(`完成！${DIFFICULTY_LABEL[game.difficulty]}，用時 ${formatTime(game.elapsedMs)}。`);
  }

  /** 完成印章蓋在盤面上；animate 為 false 時直接顯示（例如重新整理後） */
  private showStamp(show: boolean, animate: boolean): void {
    const stamp = $('stamp');
    clearTimeout(this.stampTimer);
    stamp.classList.remove('is-visible', 'is-landing');
    if (!show || !this.game) return;
    if (!animate) {
      stamp.classList.add('is-visible');
      return;
    }
    // 等波浪掃過盤面再蓋章
    this.stampTimer = window.setTimeout(() => stamp.classList.add('is-visible', 'is-landing'), 650);
  }

  private announce(text: string): void {
    const el = $('announcer');
    el.textContent = '';
    window.setTimeout(() => (el.textContent = text), 50);
  }

  // ───────── 玩家操作 ─────────

  private inputDigit(digit: number, asNote = this.notesMode): void {
    if (!this.game || this.selected < 0 || this.paused || this.game.completed) return;
    const i = this.selected;
    const changed = asNote ? toggleNote(this.game, i, digit) : placeDigit(this.game, i, digit);
    this.afterMove(changed);
    if (changed && !asNote && !this.game.completed && getConflicts(this.game).has(i)) {
      this.announce(`${digit} 和同一列、行或宮的數字重複`);
      this.showHint('conflict');
    }
  }

  private erase(): void {
    if (!this.game || this.selected < 0 || this.paused) return;
    this.afterMove(eraseCell(this.game, this.selected));
  }

  private undo(): void {
    if (this.game && !this.paused) this.afterMove(undo(this.game));
  }

  private redo(): void {
    if (this.game && !this.paused) this.afterMove(redo(this.game));
  }

  private toggleNotesMode(): void {
    this.notesMode = !this.notesMode;
    if (this.notesMode) this.showHint('notes');
    this.render();
  }

  /** 第一次遇到時顯示一次性的說明；按「知道了」後不再出現 */
  private showHint(id: HintId): void {
    if (isHintDismissed(id) || this.activeHint === id) return;
    this.activeHint = id;
    $('hint-text').textContent = id === 'conflict' ? CONFLICT_HINT[loadPageStyle()] : App.HINT_TEXT[id];
    $('hint').hidden = false;
  }

  private closeHint(): void {
    if (this.activeHint) dismissHint(this.activeHint);
    this.activeHint = null;
    $('hint').hidden = true;
  }

  private select(i: number): void {
    if (this.paused) return;
    this.selected = i;
    this.render();
  }

  private moveSelection(dr: number, dc: number): void {
    if (this.selected < 0) {
      this.select(0);
    } else {
      const r = (rowOf(this.selected) + dr + 9) % 9;
      const c = (colOf(this.selected) + dc + 9) % 9;
      this.select(r * 9 + c);
    }
    this.focusBoard();
  }

  /** 焦點已在盤面內時，讓焦點跟著選取的格子移動，螢幕閱讀器才會讀出格子內容 */
  private focusBoard(force = false): void {
    if (!force && !this.boardEl.contains(document.activeElement)) return;
    const target = this.boardView.cells[this.selected >= 0 ? this.selected : 0];
    target.focus({ preventScroll: true });
  }

  private openNewGameDialog(): void {
    this.showDialogStep('choose');
    this.updateCancelButton();
    this.newGameDialog.showModal();
    this.resumeTimerIfPlaying();
  }

  private updateCancelButton(): void {
    const btn = $<HTMLButtonElement>('cancel-new-game');
    // 出題中一律可以取消；沒有盤面可回去時只在出題中顯示
    btn.hidden = !this.game && !this.generating;
    btn.textContent = this.generating ? '取消出題' : '返回目前這盤';
  }

  private leaveConfirm(): void {
    if (this.confirmFromHome) this.newGameDialog.close();
    else this.showDialogStep('choose');
  }

  private showDialogStep(step: 'choose' | 'confirm'): void {
    $('choose-step').hidden = step !== 'choose';
    $('confirm-step').hidden = step !== 'confirm';
    this.newGameDialog.setAttribute('aria-labelledby', step === 'choose' ? 'new-game-title' : 'confirm-title');
    if (step === 'confirm') $('confirm-back').focus();
  }

  // ───────── 事件綁定 ─────────

  private buildDifficultyList(list: HTMLElement, withRestart = false): void {
    for (const d of DIFFICULTIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'difficulty-option';
      btn.dataset.difficulty = d;
      const name = document.createElement('span');
      name.className = 'difficulty-name';
      name.textContent = DIFFICULTY_LABEL[d];
      const hint = document.createElement('span');
      hint.className = 'difficulty-hint';
      hint.textContent = DIFFICULTY_HINT[d];
      btn.append(name, hint);
      if (!withRestart) {
        list.append(btn);
        continue;
      }
      // 主畫面：有進行中的盤面時，旁邊多一個「開新局」
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.className = 'home-restart';
      restart.dataset.restart = d;
      restart.textContent = '開新局';
      restart.setAttribute('aria-label', `${DIFFICULTY_LABEL[d]}開新局`);
      restart.hidden = true;
      const row = document.createElement('div');
      row.className = 'home-row';
      row.append(btn, restart);
      list.append(row);
    }
  }

  /** 主畫面的頁面風格：每個選項是一個原生 radio，配一塊固定配色的色票 */
  private buildStylePicker(list: HTMLElement): void {
    const current = loadPageStyle();
    applyPageStyle(current, false);
    for (const style of PAGE_STYLES) {
      const option = document.createElement('label');
      option.className = 'style-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'page-style';
      input.value = style;
      input.checked = style === current;
      const chip = document.createElement('span');
      chip.className = `style-chip style-chip-${style}`;
      chip.setAttribute('aria-hidden', 'true');
      chip.textContent = '5';
      const name = document.createElement('span');
      name.className = 'style-name';
      name.textContent = PAGE_STYLE_LABEL[style];
      option.append(input, chip, name);
      list.append(option);
    }
    list.addEventListener('change', (e) => applyPageStyle((e.target as HTMLInputElement).value as PageStyle));
  }

  private bindEvents(): void {
    this.boardEl.addEventListener('pointerdown', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell');
      if (cell) this.select(Number(cell.dataset.index));
    });
    this.boardEl.addEventListener('focusin', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell');
      if (cell && Number(cell.dataset.index) !== this.selected) this.select(Number(cell.dataset.index));
    });

    $('numpad').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.num');
      if (btn) this.inputDigit(Number(btn.dataset.digit));
    });

    document.querySelector('.tools')!.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'undo') this.undo();
      else if (action === 'redo') this.redo();
      else if (action === 'erase') this.erase();
      else if (action === 'notes') this.toggleNotesMode();
    });

    $('pause-btn').addEventListener('click', () => this.setPaused(!this.paused));
    $('resume-btn').addEventListener('click', () => this.setPaused(false));
    $('new-game-btn').addEventListener('click', () => this.openNewGameDialog());
    $('home-btn').addEventListener('click', () => this.goHome());
    $('home-list').addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const restart = target.closest<HTMLElement>('[data-restart]')?.dataset.restart;
      if (restart) return this.chooseDifficulty(restart as Difficulty, true);
      const d = target.closest<HTMLElement>('[data-difficulty]')?.dataset.difficulty;
      if (d) this.openDifficulty(d as Difficulty);
    });
    $('home-cancel').addEventListener('click', () => this.cancelNewGame());
    $('win-new-game').addEventListener('click', () => this.openNewGameDialog());
    $('hint-close').addEventListener('click', () => this.closeHint());

    $('difficulty-list').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-difficulty]');
      if (btn) this.chooseDifficulty(btn.dataset.difficulty as Difficulty);
    });
    $('cancel-new-game').addEventListener('click', () => this.cancelNewGame());
    $('confirm-back').addEventListener('click', () => this.leaveConfirm());
    $('confirm-start').addEventListener('click', () => {
      const d = this.pendingDifficulty;
      // 從主畫面來的就回主畫面顯示出題進度，否則回到選難度
      if (this.confirmFromHome) this.newGameDialog.close();
      else this.showDialogStep('choose');
      if (d) void this.startNewGame(d);
    });
    this.newGameDialog.addEventListener('cancel', (e) => {
      // Esc：確認步驟先退回選難度；出題中改為取消出題；沒有盤面時不能關
      e.preventDefault();
      if (!$('confirm-step').hidden) return this.leaveConfirm();
      this.cancelNewGame();
    });
    this.newGameDialog.addEventListener('close', () => {
      this.showDialogStep('choose');
      if (this.confirmFromHome) {
        this.confirmFromHome = false;
        if (!this.game && !this.generating) $('home-title').focus({ preventScroll: true });
      }
      this.resumeTimerIfPlaying();
    });

    document.addEventListener('visibilitychange', () => {
      // 離開時自動暫停，回來時看到暫停畫面，而不是默默停住的計時
      if (document.hidden && this.isPlaying) {
        this.paused = true;
        this.render();
      }
      this.resumeTimerIfPlaying();
      this.persist();
    });
    window.addEventListener('pagehide', () => this.persist());

    // 手機橫放時畫面會蓋上「請轉回直式」，同時暫停計時
    const landscape = window.matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)');
    const onOrientation = () => {
      if (landscape.matches && this.isPlaying) this.setPaused(true);
    };
    landscape.addEventListener('change', onOrientation);
    onOrientation();

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.newGameDialog.open || !this.game) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (ctrl && key === 'z') {
      e.preventDefault();
      return e.shiftKey ? this.redo() : this.undo();
    }
    if (ctrl && key === 'y') {
      e.preventDefault();
      return this.redo();
    }
    if (ctrl || e.altKey) return;

    if (key === 'p') return this.setPaused(!this.paused);

    // 使用 e.code 判斷數字，Shift+數字 在不同鍵盤配置下 e.key 會變成符號
    const digitMatch = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (digitMatch) {
      e.preventDefault();
      return this.inputDigit(Number(digitMatch[1]), e.shiftKey ? !this.notesMode : this.notesMode);
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        return this.moveSelection(-1, 0);
      case 'ArrowDown':
        e.preventDefault();
        return this.moveSelection(1, 0);
      case 'ArrowLeft':
        e.preventDefault();
        return this.moveSelection(0, -1);
      case 'ArrowRight':
        e.preventDefault();
        return this.moveSelection(0, 1);
      case 'Backspace':
      case 'Delete':
      case '0':
        e.preventDefault();
        return this.erase();
      case 'n':
      case 'N':
        return this.toggleNotesMode();
      case 'Escape':
        return this.select(-1);
    }
  }

  // ───────── 畫面更新 ─────────

  private render(): void {
    const game = this.game;
    if (!game) return;
    // 完成後清掉選取與高亮，讓完成印蓋在乾淨的盤面上
    renderBoard(this.boardView, game, this.paused || game.completed ? -1 : this.selected);
    renderNumpad(this.numButtons, game);

    this.boardEl.classList.toggle('is-paused', this.paused);
    this.boardEl.classList.toggle('is-complete', game.completed);
    $('pause-overlay').hidden = !this.paused;
    document.body.classList.toggle('is-paused', this.paused);

    const pauseBtn = $<HTMLButtonElement>('pause-btn');
    pauseBtn.classList.toggle('is-paused', this.paused);
    pauseBtn.setAttribute('aria-label', this.paused ? '繼續' : '暫停');
    pauseBtn.disabled = game.completed;
    pauseBtn.hidden = game.completed;
    document.body.classList.toggle('is-complete', game.completed);
    if (game.completed && this.activeHint) $('hint').hidden = true;

    const blocked = this.paused || game.completed;
    const sel = this.selected;
    const erasable = sel >= 0 && !isGiven(game, sel) && (game.values[sel] !== 0 || game.notes[sel] !== 0);
    const tool = (name: string) => document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;
    tool('undo').disabled = blocked || !game.undoStack.length;
    tool('redo').disabled = blocked || !game.redoStack.length;
    tool('erase').disabled = blocked || !erasable;
    tool('notes').disabled = blocked;
    tool('notes').setAttribute('aria-pressed', String(this.notesMode));
    $('notes-label').textContent = this.notesMode ? '筆記中' : '筆記';
    this.numButtons.forEach((btn) => (btn.disabled = blocked || btn.classList.contains('done')));
    document.body.classList.toggle('notes-mode', this.notesMode);

    $('controls').classList.toggle('is-complete', game.completed);
    $('win-panel').hidden = !game.completed;
    if (game.completed) {
      $('win-summary').textContent = `${DIFFICULTY_LABEL[game.difficulty]} · 用時 ${formatTime(game.elapsedMs)}`;
    }
  }
}
