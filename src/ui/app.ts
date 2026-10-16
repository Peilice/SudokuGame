import { colOf, rowOf } from '../core/board';
import { DIFFICULTIES, DIFFICULTY_LABEL, generatePuzzle, type Difficulty, type Puzzle } from '../core/generator';
import {
  createGame,
  eraseCell,
  placeDigit,
  redo,
  toggleNote,
  undo,
  type GameState,
} from '../game/state';
import { loadGame, saveGame } from '../game/storage';
import { Timer, formatTime } from '../game/timer';
import { buildBoard, buildNumpad, renderBoard, renderNumpad, type BoardView } from './board';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class App {
  private game: GameState | null = null;
  private selected = -1;
  private notesMode = false;
  private paused = false;
  private generating = false;

  private readonly boardEl = $<HTMLDivElement>('board');
  private readonly boardView: BoardView;
  private readonly numButtons: HTMLButtonElement[];
  private readonly timerEl = $('timer');
  private readonly newGameDialog = $<HTMLDialogElement>('new-game-dialog');
  private readonly winDialog = $<HTMLDialogElement>('win-dialog');
  private readonly timer = new Timer(0, (ms) => (this.timerEl.textContent = formatTime(ms)));
  private worker: Worker | null = null;

  constructor() {
    this.boardView = buildBoard(this.boardEl);
    this.numButtons = buildNumpad($('numpad'));
    this.buildDifficultyList();
    this.bindEvents();

    const saved = loadGame();
    if (saved) {
      this.loadState(saved);
      if (saved.completed) this.openNewGameDialog();
    } else {
      this.openNewGameDialog();
    }
  }

  // ───────── 遊戲流程 ─────────

  private loadState(game: GameState): void {
    this.game = game;
    this.selected = -1;
    this.paused = false;
    this.timer.reset(game.elapsedMs);
    $('difficulty-label').textContent = DIFFICULTY_LABEL[game.difficulty];
    this.render();
    this.resumeTimerIfPlaying();
  }

  private async startNewGame(difficulty: Difficulty): Promise<void> {
    if (this.generating) return;
    this.generating = true;
    this.newGameDialog.classList.add('is-generating');
    $('generating').hidden = false;
    try {
      const puzzle = await this.requestPuzzle(difficulty);
      this.newGameDialog.close();
      this.loadState(createGame(puzzle));
      saveGame(this.game!);
    } finally {
      this.generating = false;
      this.newGameDialog.classList.remove('is-generating');
      $('generating').hidden = true;
    }
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
    const game = this.game!;
    this.boardEl.classList.remove('celebrate');
    void this.boardEl.offsetWidth; // 重新觸發動畫
    this.boardEl.classList.add('celebrate');
    $('win-summary').textContent = `${DIFFICULTY_LABEL[game.difficulty]} · 用時 ${formatTime(game.elapsedMs)}`;
    setTimeout(() => this.winDialog.showModal(), 900);
  }

  // ───────── 玩家操作 ─────────

  private inputDigit(digit: number, asNote = this.notesMode): void {
    if (!this.game || this.selected < 0 || this.paused) return;
    const changed = asNote ? toggleNote(this.game, this.selected, digit) : placeDigit(this.game, this.selected, digit);
    this.afterMove(changed);
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
    this.render();
  }

  private select(i: number): void {
    if (this.paused) return;
    this.selected = i;
    this.render();
  }

  private moveSelection(dr: number, dc: number): void {
    if (this.selected < 0) return this.select(0);
    const r = (rowOf(this.selected) + dr + 9) % 9;
    const c = (colOf(this.selected) + dc + 9) % 9;
    this.select(r * 9 + c);
  }

  private openNewGameDialog(): void {
    const cancelable = !!this.game;
    $('cancel-new-game').hidden = !cancelable;
    this.newGameDialog.showModal();
    this.resumeTimerIfPlaying();
  }

  // ───────── 事件綁定 ─────────

  private buildDifficultyList(): void {
    const list = $('difficulty-list');
    const hints: Record<Difficulty, string> = {
      easy: '適合暖身',
      medium: '需要仔細觀察',
      hard: '需要區塊排除',
      expert: '需要數對與數組',
    };
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
      hint.textContent = hints[d];
      btn.append(name, hint);
      list.append(btn);
    }
  }

  private bindEvents(): void {
    this.boardEl.addEventListener('pointerdown', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell');
      if (cell) this.select(Number(cell.dataset.index));
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

    $('difficulty-list').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-difficulty]');
      if (btn) void this.startNewGame(btn.dataset.difficulty as Difficulty);
    });
    $('cancel-new-game').addEventListener('click', () => this.newGameDialog.close());
    this.newGameDialog.addEventListener('cancel', (e) => {
      // 沒有進行中的遊戲或正在出題時，不允許用 Esc 關閉
      if (!this.game || this.generating) e.preventDefault();
    });
    this.newGameDialog.addEventListener('close', () => this.resumeTimerIfPlaying());

    $('win-close').addEventListener('click', () => this.winDialog.close());
    $('win-new-game').addEventListener('click', () => {
      this.winDialog.close();
      this.openNewGameDialog();
    });

    document.addEventListener('visibilitychange', () => {
      this.resumeTimerIfPlaying();
      this.persist();
    });
    window.addEventListener('pagehide', () => this.persist());

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.newGameDialog.open || this.winDialog.open || !this.game) return;
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
    renderBoard(this.boardView, game, this.paused ? -1 : this.selected);
    renderNumpad(this.numButtons, game);

    this.boardEl.classList.toggle('is-paused', this.paused);
    this.boardEl.classList.toggle('is-complete', game.completed);
    $('pause-overlay').hidden = !this.paused;

    const pauseBtn = $('pause-btn');
    pauseBtn.classList.toggle('is-paused', this.paused);
    pauseBtn.setAttribute('aria-label', this.paused ? '繼續' : '暫停');
    (pauseBtn as HTMLButtonElement).disabled = game.completed;

    const tool = (name: string) => document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!;
    tool('undo').disabled = !game.undoStack.length || game.completed;
    tool('redo').disabled = !game.redoStack.length;
    tool('erase').disabled = game.completed;
    tool('notes').setAttribute('aria-pressed', String(this.notesMode));
    $('notes-badge').textContent = this.notesMode ? '開' : '關';
    document.body.classList.toggle('notes-mode', this.notesMode);
  }
}
