import '@fontsource/noto-serif/latin-900.css';
import '@fontsource/zen-maru-gothic/latin-700.css';
// 其他頁面風格的數字字型：@font-face 只有在該風格用到時才會下載
import '@fontsource/tilt-neon/latin-400.css';
import '@fontsource/outfit/latin-300.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/roboto-slab/latin-500.css';
import '@fontsource/roboto-slab/latin-800.css';
import './style.css';
import './themes.css';
import { App } from './ui/app';

new App();

// 離線遊玩：sw.js 只在建置時產生，開發伺服器不註冊，免得快取干擾熱更新
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
