/// <reference lib="webworker" />
import { generatePuzzle, type Difficulty } from './generator';

// 出題可能耗時 1 秒以上，放在 Web Worker 執行以免畫面卡住
self.onmessage = (e: MessageEvent<{ difficulty: Difficulty }>) => {
  self.postMessage(generatePuzzle(e.data.difficulty));
};
