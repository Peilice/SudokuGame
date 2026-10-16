/** 累計經過時間的計時器，可暫停與繼續 */
export class Timer {
  private startedAt: number | null = null;
  private intervalId: number | undefined;

  constructor(
    private accumulated: number,
    private readonly onTick: (elapsedMs: number) => void,
  ) {}

  get running(): boolean {
    return this.startedAt !== null;
  }

  get elapsed(): number {
    return this.accumulated + (this.startedAt === null ? 0 : performance.now() - this.startedAt);
  }

  start(): void {
    if (this.running) return;
    this.startedAt = performance.now();
    this.intervalId = window.setInterval(() => this.onTick(this.elapsed), 250);
    this.onTick(this.elapsed);
  }

  stop(): void {
    if (!this.running) return;
    this.accumulated = this.elapsed;
    this.startedAt = null;
    window.clearInterval(this.intervalId);
    this.onTick(this.accumulated);
  }

  reset(elapsedMs = 0): void {
    this.stop();
    this.accumulated = elapsedMs;
    this.onTick(elapsedMs);
  }
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
