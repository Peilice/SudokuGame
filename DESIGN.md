---
name: 數獨
description: 解謎雜誌頁：用不同書寫工具區分題目、作答、筆記、選取、衝突與完成的單機數獨。
colors:
  ground: "#e9ebe6"
  sheet: "#fbfbf8"
  sheet-2: "#f1f2ee"
  ink: "#17191e"
  ink-soft: "#4a4f57"
  rule: "#c9cdc6"
  rule-strong: "#17191e"
  pen: "#1d3a9e"
  pencil: "#5a5f66"
  red-pencil: "#c8331f"
  danger-ink: "#ffffff"
  hl-related: "#fbf4cc"
  hl-selected: "#ffe35a"
  hl-same: "#cdeeb6"
  band: "#0e5e57"
  band-ink: "#f6f5f0"
  band-ink-soft: "rgb(246 245 240 / 78%)"
  band-raised: "rgb(255 255 255 / 12%)"
  ground-night: "#1d1d1b"
  sheet-night: "#2a2a27"
  sheet-2-night: "#353531"
  ink-night: "#eeece4"
  ink-soft-night: "#bdbbb3"
  rule-night: "#46453f"
  rule-strong-night: "#d3d0c6"
  pen-night: "#a3bbff"
  pencil-night: "#b0aea6"
  red-pencil-night: "#ff7a5c"
  danger-ink-night: "#1d1d1b"
  hl-selected-edge-night: "#d9bb2a"
  hl-related-night: "#36331f"
  hl-selected-night: "#4f4512"
  hl-same-night: "#2f5230"
  band-night: "#0a3f3a"
  band-raised-night: "rgb(255 255 255 / 9%)"
typography:
  display:
    fontFamily: "'Sudoku Display', 'Noto Serif TC', 'PMingLiU', serif"
    fontSize: "1.6rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.14em"
  display-stamp:
    fontFamily: "'Sudoku Display', 'Noto Serif TC', 'PMingLiU', serif"
    fontSize: "calc(var(--board-size) * 0.16)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0.18em"
  headline:
    fontFamily: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 900
    letterSpacing: "0.04em"
  print-digit:
    fontFamily: "'Libre Franklin', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "calc(var(--cell) * 0.58)"
    fontWeight: 700
    lineHeight: 1
  hand-digit:
    fontFamily: "'Shantell Sans', 'Comic Sans MS', cursive"
    fontSize: "calc(var(--cell) * 0.62)"
    fontWeight: 500
    lineHeight: 1
  hand-note:
    fontFamily: "'Shantell Sans', 'Comic Sans MS', cursive"
    fontSize: "calc(var(--cell) * 0.32)"
    fontWeight: 500
    lineHeight: 1
  print-numeral:
    fontFamily: "'Libre Franklin', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    fontFeature: "tnum"
  body:
    fontFamily: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
rounded:
  hairline: "3px"
  tag: "4px"
  key: "6px"
  control: "8px"
  frame: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "36px"
components:
  masthead:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    height: "60px"
  masthead-text-button:
    textColor: "{colors.band-ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 10px 0 6px"
  masthead-text-button-hover:
    backgroundColor: "{colors.band-raised}"
  difficulty-tag:
    textColor: "{colors.band-ink}"
    typography: "{typography.display}"
    rounded: "{rounded.tag}"
    padding: "2px 8px"
  board:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.hairline}"
  cell-related:
    backgroundColor: "{colors.hl-related}"
  cell-selected:
    backgroundColor: "{colors.hl-selected}"
  cell-same-digit:
    backgroundColor: "{colors.hl-same}"
  cell-given:
    textColor: "{colors.ink}"
    typography: "{typography.print-digit}"
  cell-user:
    textColor: "{colors.pen}"
    typography: "{typography.hand-digit}"
  cell-note:
    textColor: "{colors.pencil}"
    typography: "{typography.hand-note}"
  tool:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "6px 4px"
  tool-hover:
    backgroundColor: "{colors.sheet-2}"
    textColor: "{colors.ink}"
  tool-notes-active:
    backgroundColor: "{colors.hl-selected}"
    textColor: "{colors.ink}"
  numpad-key:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
  numpad-key-desktop:
    rounded: "{rounded.control}"
  numpad-key-done:
    textColor: "{colors.pencil}"
  button-primary:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    rounded: "{rounded.control}"
    padding: "11px 20px"
    height: "46px"
  button-danger:
    backgroundColor: "{colors.red-pencil}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.control}"
    padding: "11px 20px"
    height: "46px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 20px"
    height: "46px"
  button-ghost-hover:
    backgroundColor: "{colors.sheet-2}"
  dialog:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.key}"
    padding: "30px 22px 20px"
    width: "min(380px, calc(100vw - 24px))"
  difficulty-option:
    textColor: "{colors.ink}"
    padding: "14px 10px"
    height: "54px"
  difficulty-option-hover:
    backgroundColor: "{colors.hl-related}"
  difficulty-option-chosen:
    backgroundColor: "{colors.hl-selected}"
---

# Design System: 數獨

## Overview

**Creative North Star: "解謎雜誌頁"**

整個介面是一頁印在偏冷灰白報紙上的數獨，玩家拿著一組書寫工具在上面作答。每一種資訊都對應一種工具：印刷鉛字是題目，藍色原子筆是玩家填的數字，鉛筆是筆記，螢光筆是選取與高亮，紅鉛筆圈是規則衝突，紅色印章是完成。顏色與字體的意義由「是哪一支筆寫的」決定，而不是由狀態語意（成功／錯誤）決定。

頁首是一條飽和的雜誌色帶，放刊名、難度、計時與「新遊戲」；盤面是一張帶淡陰影的紙，其餘控制元件退到紙面之外的地色上。密度偏低、留白是為了讓盤面獨佔注意力。夜間版是中性的深炭灰紙（R≥B，不偏藍）配淺色墨水，色帶加深，彩色筆跡調亮。

按鈕、對話框都是標準元件，只換上這套世界的字體與配色；世界的辨識度集中在盤面上的筆跡、螢光筆與印章。

**Key Characteristics:**
- 三種數字字體各司其職：Libre Franklin 粗體（印刷）、Shantell Sans（手寫）、思源宋體 Black 子集（刊名與印章）。
- 高亮一律用螢光筆色塊，選取格是最濃的螢光黃。
- 衝突用手繪紅圈標示，玩家的數字永遠維持原子筆藍。
- 完成時波浪掃過盤面、蓋上斑駁的紅色印章，盤面本身就是獎勵。
- 頁首色帶與對話框頂端 6px 色帶是同一條雜誌色帶。

## Colors

一張偏冷的報紙灰白紙，加上一支藍原子筆、一支紅鉛筆、三種螢光筆與一條深青綠色帶。

### Primary
- **雜誌色帶深青綠**（band）：頁首背景、主要按鈕、對話框頂端 6px 色帶、出題中轉圈的前景。夜間版改用更深的 band-night。瀏覽器 `theme-color` 也與它同步。
- **色帶上的米白字**（band-ink）：色帶上所有文字與圖示；band-ink-soft 用於難度標籤的外框，band-raised 是色帶上按鈕的懸停底。

### Secondary
- **藍色原子筆**（pen）：玩家填入的數字，以及全站的鍵盤焦點外框（3px）。夜間版 pen-night 是明亮的淺藍。
- **紅鉛筆**（red-pencil）：衝突圈、完成印章、破壞性按鈕（放棄目前這盤）。

### Tertiary
- **螢光筆淡塗**（hl-related）：選取格所在的列、行、宮；桌機數字鍵懸停；難度選項懸停。
- **螢光筆重塗**（hl-selected）：選取格、筆記模式啟用中的工具按鈕、已選難度、文字反白、過關波浪的峰值。
- **綠色螢光筆**（hl-same）：與選取格相同的數字，以及符合的筆記小字。

### Neutral
- **報紙地色**（ground）：頁面背景，紙張以外的區域。
- **紙張**（sheet）：盤面、數字鍵、對話框內容區、`kbd`。
- **次紙色**（sheet-2）：工具按鈕與幽靈按鈕的懸停底。
- **印刷黑**（ink）：題目數字、標題、內文；同時是宮線（rule-strong）。
- **淡墨**（ink-soft）：工具文字、說明文字、暫停提示。
- **鉛筆石墨**（pencil）：筆記小字、剩餘數量、已填滿的數字鍵、筆記模式下的數字鍵與虛線外框。
- **細格線**（rule）：格線、幽靈按鈕描邊、清單分隔線。

### Named Rules
**The 哪支筆寫的 Rule.** 顏色代表書寫工具，不代表對錯。玩家填的數字永遠是 pen；衝突只加紅鉛筆圈，不把數字改成紅色。

**The 螢光筆 Rule.** 任何「被選中、被強調」的狀態都用螢光筆色塊（hl-related／hl-selected／hl-same）塗底，不用描邊、陰影或品牌色表示選取。

**The 夜間不偏藍 Rule.** 夜間紙色維持中性暖灰（R≥B）；不要把夜間背景換成藍黑。

## Typography

**Display Font:** Sudoku Display（思源宋體 Black 子集，僅含「數獨完成簡單中等困難專家」12 字；後援 Noto Serif TC、PMingLiU）
**Print Font:** Libre Franklin 700／800（後援 Noto Sans TC、Microsoft JhengHei）
**Hand Font:** Shantell Sans 400／500（後援 Comic Sans MS）
**UI Font:** Noto Sans TC 堆疊（PingFang TC、Microsoft JhengHei、system-ui）

**Character:** 宋體 Black 的刊名帶出雜誌報頭的份量；Libre Franklin 是乾脆的印刷數字；Shantell Sans 像隨手寫下的原子筆字，4 是封閉的，長輩不易誤讀。

### Hierarchy
- **Display**（900，1.6rem，行高 1，字距 0.14em）：頁首刊名「數獨」。同字體 900 也用於難度標籤（0.9rem）與難度選單名稱（1.15rem）。
- **Display Stamp**（900，盤面寬 × 0.16，字距 0.18em）：完成印章上的「完成」。
- **Headline**（900，1.35rem，字距 0.04–0.06em）：對話框標題與過關標題，用 UI 字體。
- **Print Digit**（700，格寬 × 0.58）：題目數字。數字鍵用同字體 700（手機 1.7rem、高螢幕 1.9rem、桌機 2.3rem）；計時器 1.15rem 700 等寬數字；印章附註 800。
- **Hand Digit**（500，格寬 × 0.62，旋轉 -3deg）：玩家填的數字。
- **Hand Note**（500，格寬 × 0.32）：筆記小字；筆記模式下數字鍵也換成手寫體 400。
- **Body**（400，1rem，行高 1.6）：確認文字、圖例說明（0.85rem）。
- **Label**（600，0.85rem）：工具按鈕文字；剩餘數量 0.68–0.75rem 600。

### Named Rules
**The 三種筆跡 Rule.** 數字只有三種寫法：題目用 Libre Franklin 印刷體、玩家答案用 Shantell Sans 手寫體、筆記用更小的 Shantell Sans 鉛筆色。不要在盤面上引入第四種數字字體。

**The 子集展示字 Rule.** Sudoku Display 只收錄 12 個字。新增要用展示字的文字時，必須先把字加入子集，否則會掉回後援字體。

## Layout

盤面是唯一的視覺中心，尺寸由 `--board-size` 決定，`--cell` 是它的九分之一，盤面上的字級與印章尺寸都按這兩個值等比換算。

- **手機（<860px）**：單欄。色帶高 60px，盤面寬 `min(100vw - 24px, 100dvh - 色帶 - 200px, 560px)`，緊接在色帶下方；工具列與數字鍵以 `margin-top: auto` 推到底部拇指區。數字鍵預設 1×9；螢幕高度 ≥760px 時改為 3×3。
- **桌機（≥860px 且高度 ≥600px）**：色帶 64px；盤面在左、填滿可用高度（上限 720px）；右欄固定 300px，放工具列、3×3 正方形數字鍵與快捷鍵說明；兩欄間距 36px。
- **節奏**：間距以 4／8／12px 為基本步，區塊間 18px（手機）與 36px（桌機）。觸控目標至少 44px，數字鍵 54–76px 高。
- 頁首與底部都處理 `safe-area-inset`。

## Elevation & Depth

以紙張疊放的方式表現層次：地色上的紙（盤面）帶一層柔和的落地陰影，數字鍵是略微浮起的紙片，其餘控制元件是平的。對話框是唯一明顯浮起的層。

### Shadow Vocabulary
- **紙張陰影**（`--shadow-sheet`）：只用於盤面。
- **按鍵陰影**（`--shadow-key`）：只用於數字鍵；鍵填滿九個後陰影與底色一起移除。
- **對話框陰影**（`0 2px 4px rgb(0 0 0 / 10%), 0 24px 60px -12px rgb(0 0 0 / 40%)`）：新遊戲／確認對話框，背景遮罩 `rgb(14 20 22 / 55%)`。
- **幽靈描邊**（`inset 0 0 0 1.5px` rule 色）：幽靈按鈕用內陰影畫線，不佔版面。

### Named Rules
**The 只有紙會浮起 Rule.** 陰影只屬於紙類物件（盤面、數字鍵、對話框）。工具按鈕、色帶按鈕、文字一律平貼，以底色變化表示懸停。

## Shapes

形狀語言是印刷品：小圓角、實線格。盤面外框 2.5px 印刷黑，宮線 2px，細格線 1px。圓角刻度很小且依物件分級：盤面與筆記高亮 3px、標籤與 `kbd` 4px、手機數字鍵與對話框 6px、按鈕與工具 8px、數字鍵外框 10px。唯一的不規則形狀是手繪的紅鉛筆衝突圈（未閉合的手繪橢圓遮罩）與蓋歪 -9deg、帶雜訊斑駁的完成印章（雙框：實線框加內縮細框）。

## Components

### Buttons
標準按鈕，只換字體與配色。
- **Shape:** 小圓角（8px），最小高度 46px，內距 11px 20px，字重 700。
- **Primary:** 色帶深青綠底、米白字；用於「繼續遊戲」「再來一盤」。
- **Danger:** 紅鉛筆底、白字；只用於「開始新的一盤」這類會丟棄進度的確認。
- **Ghost:** 透明底、1.5px rule 色內描邊；懸停改成 sheet-2 底。
- **Hover / Focus:** 實心按鈕懸停時 `brightness(1.08)`；焦點是 3px 原子筆藍外框、外推 2px。

### 色帶按鈕
- 透明底、米白字、8px 圓角、44px 高。暫停鍵為 44×44 方形圖示鍵；「新遊戲」是帶加號圖示的文字鍵。懸停底為 band-raised；焦點外框改用米白並內縮 3px。停用時透明度 0.4。

### 難度標籤（Chip）
- 色帶上的宋體 Black 小字，1.5px band-ink-soft 外框、4px 圓角、內距 2px 8px；沒有難度時隱藏。

### 盤面（Signature）
- 紙色底、2.5px 印刷黑外框、3px 圓角、紙張陰影。
- 選取格塗 hl-selected，同列／行／宮塗 hl-related，相同數字塗 hl-same；底色轉場 0.12s。
- 衝突格疊一個紅鉛筆手繪圈（內縮 7%），選取時仍保留。
- 筆記為 3×3 小格的鉛筆字；與選取數字相符的筆記塗 hl-same。
- 暫停時隱藏所有數字、筆記與衝突圈，只留空白紙與「已暫停」提示與主要按鈕。

### 完成印章（Signature）
- 過關時先跑波浪：每格依 (列+行)×28ms 延遲，0.55s 內閃過 hl-selected；接著約 650ms 後印章以 0.42s 從 1.7 倍、-14deg 蓋下，停在 -9deg、透明度 0.92。
- 盤面數字淡到 0.55，讓印章成為焦點；控制區換成過關面板（標題、難度與用時、再來一盤）。

### 工具列
- 四格等寬（復原、重做、清除、筆記），圖示在上、文字在下，淡墨色、透明底；懸停 sheet-2 底與 ink 字。
- 筆記模式啟用時，筆記鍵被 hl-selected 塗滿。

### 數字鍵
- 紙色按鍵加按鍵陰影，印刷體數字，右上角鉛筆色「剩 N」。按下時 `translateY(1px) scale(0.96)`。桌機懸停塗 hl-related。
- 填滿九個後變成無底、無陰影，數字鉛筆色、半透明並加刪除線。
- 筆記模式時整組數字鍵外框變成 2px 鉛筆色虛線、數字換成手寫體，和平常一眼就能分辨。

### 對話框
- 寬 `min(380px, 100vw - 24px)`，6px 圓角，頂端 6px 色帶接紙色內容，0.22s 由下浮入。
- 難度清單：2px 印刷黑上框、每列 1px 細格線分隔，宋體難度名配淡墨說明；懸停 hl-related，已選 hl-selected。

### 快捷鍵說明
- 只在桌機右欄顯示；每列 1px 細格線分隔。`kbd` 為紙色小鍵帽、4px 圓角、印刷體 700。

## Do's and Don'ts

### Do:
- **Do** 用書寫工具決定顏色：題目 ink、答案 pen、筆記 pencil、衝突 red-pencil、選取用螢光筆色塊。
- **Do** 讓盤面上的字級跟著 `--cell` 與 `--board-size` 等比縮放。
- **Do** 在新的強調面（例如對話框）上沿用色帶，頂端 6px band 色帶是既有做法。
- **Do** 保持觸控目標至少 44px，焦點一律為 3px pen 色外框。
- **Do** 新增色彩時同時定義夜間值，並放在 `prefers-color-scheme: dark` 與 `[data-theme='dark']` 兩處。
- **Do** 遵守 `prefers-reduced-motion`：波浪、印章、對話框動畫都會被壓到近乎瞬間。

### Don't:
- **Don't** 把玩家填錯的數字改成紅色；衝突只畫紅鉛筆圈。
- **Don't** 用打勾對話框或彩帶慶祝過關；完成的表現是印章蓋在盤面上。
- **Don't** 把介面做成藍白 SaaS 卡片或滿版 CTA。
- **Don't** 在工具按鈕、色帶按鈕上加陰影；只有紙類物件會浮起。
- **Don't** 把夜間紙色調成偏藍的藍黑。
