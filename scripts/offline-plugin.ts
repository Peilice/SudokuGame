import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

const SW_FILE = 'sw.js';

/** 列出 outDir 底下所有檔案（相對路徑、斜線分隔） */
function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listFiles(full, root);
    return [relative(root, full).split('\\').join('/')];
  });
}

/**
 * 建置完成後產生 sw.js：把 dist 的所有檔案（含 public 複製進來的圖示、manifest）列為預先快取，
 * 第一次開啟後就能離線遊玩。版本號取自所有檔案內容的雜湊，內容沒變 sw.js 就不變，瀏覽器不會重新安裝。
 */
export function offline(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sudoku-offline',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = listFiles(outDir).filter((f) => f !== SW_FILE).sort();
      // index.html 另外以 './' 快取，主畫面捷徑的 start_url 就是 './'
      const precache = ['./', ...files.map((f) => './' + f)];
      // sw.js 本身的程式也算進版本，只改快取策略時舊快取一樣會被換掉
      const hash = createHash('sha256').update(serviceWorker('', precache));
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      writeFileSync(join(outDir, SW_FILE), serviceWorker(version, precache));
    },
  };
}

function serviceWorker(version: string, precache: string[]): string {
  return `// 由 scripts/offline-plugin.ts 在建置時產生，請勿手動修改
const CACHE = 'sudoku-${version}';
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener('install', (event) => {
  // cache: 'reload' 跳過 HTTP 快取，確保存進去的是這一版的檔案
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('sudoku-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // 頁面優先抓網路，才能拿到最新版；離線或抓不到時改用快取
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req, { ignoreSearch: true }).then((res) => res || caches.match('./')),
      ),
    );
    return;
  }

  // 其餘檔名都帶雜湊，內容不會變，直接用快取。
  // 帶 crossorigin 的 module script 會送 Origin，伺服器若回 Vary: Origin 就比對不到，所以忽略 Vary
  event.respondWith(caches.match(req, { ignoreVary: true }).then((res) => res || fetch(req)));
});
`;
}
