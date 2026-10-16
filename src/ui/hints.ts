const HINTS_KEY = 'sudoku.hints.v1';

export type HintId = 'conflict' | 'notes';

/** 讀取已關閉的說明；localStorage 無法使用時視為都沒看過 */
function readDismissed(): HintId[] {
  try {
    const raw = localStorage.getItem(HINTS_KEY);
    return raw ? (JSON.parse(raw) as HintId[]) : [];
  } catch {
    return [];
  }
}

export function isHintDismissed(id: HintId): boolean {
  return readDismissed().includes(id);
}

export function dismissHint(id: HintId): void {
  try {
    const list = readDismissed();
    if (!list.includes(id)) localStorage.setItem(HINTS_KEY, JSON.stringify([...list, id]));
  } catch {
    // 隱私模式等情況寫不進去就算了，下次還會再提示一次
  }
}
