import { colOf, rowOf } from '../core/board';
import { DIFFICULTIES, DIFFICULTY_LABEL, generatePuzzle, type Difficulty, type Puzzle } from '../core/generator';
import {
  createGame,
  eraseCell,
  getConflicts,
  isGiven,
  placeDigit,
  redo,
  toggleNote,
  undo,
  type GameState,
} from '../game/state';
import { loadGame, saveGame } from '../game/storage';
import { dismissHint, isHintDismissed, type HintId } from './hints';
import { Timer, formatTime } from '../game/timer';
import { buildBoard, buildNumpad, renderBoard, renderNumpad, type BoardView } from './board';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

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

  private readonly boardEl = $<HTMLDivElement>('board');
  private readonly boardView: BoardView;
  private readonly numButtons: HTMLButtonElement[];
  private readonly timerEl = $('timer');
  private readonly newGameDialog = $<HTMLDialogElement>('new-game-dialog');
  private readonly timer = new Timer(0, (ms) => (this.timerEl.textContent = formatTime(ms)));
  private worker: Worker | null = null;
  private stampTimer = 0;
  private activeHint: HintId | null = null;

  private static readonly HINT_TEXT: Record<HintId, string> = {
    conflict: '紅圈表示同一列、行或宮裡有重複的數字，紅底線是和它重複的題目數字。這只是提醒，不代表答錯。',
    notes: '筆記模式：點數字會在格子裡寫下小小的鉛筆字，再點一次同一個數字可以擦掉。按「筆記中」回到一般填寫。',
  };

  constructor() {
    this.boardView = buildBoard(this.boardEl);
    this.numButtons = buildNumpad($('numpad'));
    this.buildDifficultyList();
    this.bindEvents();

    const saved = loadGame();
    if (saved) {
      this.loadState(saved);
    } else {
      this.openNewGameDialog();
    }
  }

  // ───────── 遊戲流程 ─────────

  private loadState(game: GameState): void {
    this.game = game;
    // 開局自動選第一個空格，避免一開始按數字沒有反應
    this.selected = game.completed ? -1 : game.values.findIndex((v) => v === 0);
    this.paused = false;
    this.timer.reset(game.elapsedMs);
    $('difficulty-label').textContent = DIFFICULTY_LABEL[game.difficulty];
    this.boardEl.classList.remove('celebrate');
    this.showStamp(game.completed, false);
    this.render();
    this.resumeTimerIfPlaying();
  }

  /** 進行中的盤面要先確認，避免一次誤觸就丟掉進度 */
  private chooseDifficulty(difficulty: Difficulty): void {
    if (this.generating) return;
    if (this.game && !this.game.completed && this.hasProgress(this.game)) {
      this.pendingDifficulty = difficulty;
      $('confirm-text').textContent = `目前這盤（${DIFFICULTY_LABEL[this.game.difficulty]}，已用時 ${formatTime(
        this.timer.elapsed,
      )}）不會保留，改開一盤「${DIFFICULTY_LABEL[difficulty]}」。`;
      this.showDialogStep('confirm');
      return;
    }
    void this.startNewGame(difficulty);
  }

  private hasProgress(game: GameState): boolean {
    return game.undoStack.length > 0 || game.values.some((v, i) => v !== 0 && !isGiven(game, i));
  }

  private async startNewGame(difficulty: Difficulty): Promise<void> {
    if (this.generating) return;
    const ticket = ++this.generation;
    this.setGenerating(true, difficulty);
    try {
      const puzzle = await this.requestPuzzle(difficulty);
      if (ticket !== this.generation) return; // 已取消
      this.newGameDialog.close();
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
    $('generating').hidden = !on;
    if (on && difficulty) $('generating-text').textContent = `正在出一盤「${DIFFICULTY_LABEL[difficulty]}」…`;
    this.newGameDialog.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((btn) => {
      btn.disabled = on;
      btn.classList.toggle('is-chosen', on && btn.dataset.difficulty === difficulty);
    });
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
    if (this.game.completed) this.celebrate();
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
    $('hint-text').textContent = App.HINT_TEXT[id];
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

  private showDialogStep(step: 'choose' | 'confirm'): void {
    $('choose-step').hidden = step !== 'choose';
    $('confirm-step').hidden = step !== 'confirm';
    this.newGameDialog.setAttribute('aria-labelledby', step === 'choose' ? 'new-game-title' : 'confirm-title');
    if (step === 'confirm') $('confirm-back').focus();
  }

  // ───────── 事件綁定 ─────────

  private buildDifficultyList(): void {
    const list = $('difficulty-list');
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
      list.append(btn);
    }
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
    $('win-new-game').addEventListener('click', () => this.openNewGameDialog());
    $('hint-close').addEventListener('click', () => this.closeHint());

    $('difficulty-list').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-difficulty]');
      if (btn) this.chooseDifficulty(btn.dataset.difficulty as Difficulty);
    });
    $('cancel-new-game').addEventListener('click', () => this.cancelNewGame());
    $('confirm-back').addEventListener('click', () => this.showDialogStep('choose'));
    $('confirm-start').addEventListener('click', () => {
      const d = this.pendingDifficulty;
      this.showDialogStep('choose');
      if (d) void this.startNewGame(d);
    });
    this.newGameDialog.addEventListener('cancel', (e) => {
      // Esc：確認步驟先退回選難度；出題中改為取消出題；沒有盤面時不能關
      e.preventDefault();
      if (!$('confirm-step').hidden) return this.showDialogStep('choose');
      this.cancelNewGame();
    });
    this.newGameDialog.addEventListener('close', () => {
      this.showDialogStep('choose');
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
    // 完成後清掉選取與螢光筆，讓印章蓋在乾淨的盤面上
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
