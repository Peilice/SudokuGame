/** 頁面風格：花布是預設，其他風格在 <html> 加上 data-style */
export const PAGE_STYLES = ['hakka', 'neon', 'scandi', 'wood'] as const;
export type PageStyle = (typeof PAGE_STYLES)[number];

export const PAGE_STYLE_LABEL: Record<PageStyle, string> = {
  hakka: '花布',
  neon: '霓虹',
  scandi: '極簡',
  wood: '木製',
};

/** 第一次填出重複數字時的說明，要描述該風格實際畫出來的標記 */
export const CONFLICT_HINT: Record<PageStyle, string> = {
  hakka: '紅圈表示同一列、行或宮裡有重複的數字，紅底線是和它重複的題目數字。這只是提醒，不代表答錯。',
  neon: '紅色燈圈表示同一列、行或宮裡有重複的數字，紅色燈管底線是和它重複的題目數字。這只是提醒，不代表答錯。',
  scandi: '紅框表示同一列、行或宮裡有重複的數字，紅底線是和它重複的題目數字。這只是提醒，不代表答錯。',
  wood: '泛紅的木片表示同一列、行或宮裡有重複的數字，紅底線是和它重複的題目數字。這只是提醒，不代表答錯。',
};

/** 瀏覽器網址列顏色（日間、夜間），要和各風格的頁面底色一致 */
const THEME_COLOR: Record<PageStyle, [string, string]> = {
  hakka: ['#8e3b3d', '#2e1c1e'],
  neon: ['#e9e6ef', '#120a1f'],
  scandi: ['#ebe7df', '#161514'],
  wood: ['#4c301f', '#1d130c'],
};

/** index.html 的開頭腳本也讀這個鍵，在載入 CSS 前先套用風格，避免閃一下花布 */
const STYLE_KEY = 'sudoku.style';

export function loadPageStyle(): PageStyle {
  try {
    const saved = localStorage.getItem(STYLE_KEY) as PageStyle | null;
    return saved && PAGE_STYLES.includes(saved) ? saved : 'hakka';
  } catch {
    return 'hakka';
  }
}

export function applyPageStyle(style: PageStyle, persist = true): void {
  const root = document.documentElement;
  if (style === 'hakka') delete root.dataset.style;
  else root.dataset.style = style;

  const [light, dark] = THEME_COLOR[style];
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = meta.media.includes('dark') ? dark : light;
  });

  if (!persist) return;
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {
    // 無法儲存時只影響這次瀏覽
  }
}
