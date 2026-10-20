# 數獨

單機網頁版數獨遊戲。純前端、無需後端，進度自動存在瀏覽器。

## 功能
- 四種難度（簡單／中等／困難／專家），以模擬人類解題技巧判定難度，保證唯一解
- 筆記模式，填入數字時自動清除同列／行／宮的相同筆記
- 同列／行／宮與相同數字高亮、規則衝突標紅
- 上一步／重置（整盤重新開始）、計時（切換分頁自動暫停）、手動暫停
- 自動存檔，重新整理後可以繼續
- 手機與桌機版面、自動深色模式
- 離線遊玩：開啟過一次後，沒有網路也能開啟與出題（可加到主畫面當 App 使用）

## 操作
| 動作 | 滑鼠／觸控 | 鍵盤 |
|---|---|---|
| 選取格子 | 點擊 | 方向鍵 |
| 填入數字 | 數字鍵盤 | `1`–`9` |
| 筆記 | 開啟「筆記」後點數字 | `Shift` + 數字，或按 `N` 切換筆記模式 |
| 清除 | 清除 | `Backspace` / `Delete` / `0` |
| 上一步 | 上一步 | `Ctrl+Z`（`Ctrl+Y` 或 `Ctrl+Shift+Z` 重做） |
| 整盤重新開始 | 重置 | — |

## 開發
```bash
npm install
npm run dev      # 開發伺服器 http://localhost:5173
npm test         # 單元測試
npm run build    # 建置到 dist/
npm run preview  # 預覽建置結果
```

## 部署到 GitHub Pages
`vite.config.ts` 已設定 `base: './'`，建置結果可以放在任何子路徑下運作。

> 不要直接用「Deploy from a branch」部署 repo 根目錄：根目錄的 `index.html` 是原始碼版，載入的是 TypeScript，畫面會沒有樣式也無法操作。

**方式一：GitHub Actions（建議）**
1. 在 repo 的 Settings → Pages，將 Source 設為「GitHub Actions」
2. 推送到 `main` 後，`.github/workflows/deploy.yml` 會自動測試、建置並部署 `dist`（也可以在 Actions 頁面手動執行）

**方式二：手動推送 `dist`**
1. `npm run build`
2. 將 `dist/` 的內容推到 `gh-pages` 分支（例如使用 `npx gh-pages -d dist`）
3. 在 Settings → Pages 將 Source 設為 `gh-pages` 分支

> 離線用的 `sw.js` 由 `scripts/offline-plugin.ts` 在建置時產生，只在 `npm run build`／`npm run preview` 的結果中生效，開發伺服器不會註冊。

> 注意：建置結果使用 ES module，直接雙擊 `dist/index.html`（`file://`）無法執行，需要透過 HTTP 伺服器開啟。
