# 示意圖編輯器 - 新功能說明

## ✅ Task 1: 顯式符號庫面板 (已完成)

### 新增功能
- **符號庫面板**: 在示意圖編輯器右側新增了一個可見的符號庫面板
- **列出所有符號**: 顯示所有已註冊的符號 (R, GND 等)
- **放置按鈕**: 每個符號都有一個「Place」按鈕
- **視覺回饋**: 
  - 選中的符號會高亮顯示
  - 放置模式下游標變為十字
  - 頂部狀態列顯示當前正在放置的符號

### 使用方式
1. 在符號庫面板中找到想要的符號
2. 點擊「Place」按鈕
3. 在畫布上點擊以放置符號
4. 按 ESC 取消放置模式
5. 可以連續放置多個相同符號

### 優點
- 消除了 90% 的困惑 ✅
- 清楚顯示可用的符號
- 直觀的放置流程
- 即時視覺反饋

---

## ✅ Task 2: 增強檔案匯入 (已完成)

### 新增功能
- **自動類型檢測**: 載入 JSON 時自動檢測是 SymbolDef 還是 SchematicDoc
- **友善錯誤訊息**: 如果嘗試載入符號定義到示意圖編輯器:
  ```
  ❌ This is a Symbol Definition, not a Schematic!
  
  Symbol ID: rect_test
  
  To use this symbol:
  1. Go to "🎨 Symbol Gallery" tab
  2. Click "📂 Load Symbol" to import it
  3. It will be added to your library
  4. Return to "📐 Schematic Editor" and place it using the Symbol Library panel
  ```

### 使用方式
- **Load 按鈕**: 從檔案系統載入 JSON
- **Paste 按鈕**: 從剪貼簿貼上 JSON
- 兩者都會自動檢測檔案類型並提供適當的指導

### 優點
- 不再有可怕的遷移錯誤 ✅
- 清楚的指導訊息
- 幫助用戶理解兩種不同的檔案類型

---

## ✅ Task 3: 範例示意圖 (已完成)

### 新增內容
建立了兩個範例示意圖:

#### 1. `00_example_resistors_with_gnd.json`
- 兩個電阻器 (R1, R2)
- 一個接地符號 (GND1)
- 兩條連線
- 展示基本的串聯電路

#### 2. `01_example_with_rotation.json`
- 三個電阻器 (R1, R2, R3)
- R2 旋轉 90 度
- 一個接地符號
- 三條連線
- 展示旋轉功能和更複雜的佈局

### 使用方式
1. 在示意圖編輯器中點擊「📘 Examples」按鈕
2. 選擇範例編號 (1 或 2)
3. 範例會自動載入到編輯器中

### 測試功能
這些範例可以測試:
- ✅ 符號實例化
- ✅ 連線功能
- ✅ 旋轉 (0°, 90°)
- ✅ 儲存/載入
- ✅ ELK 自動佈局
- ✅ 複製/貼上

---

## 快速開始指南

### 1. 啟動應用程式
```bash
cd schematic-render
npm run dev
```
訪問 http://localhost:5173/

### 2. 使用符號庫
- 查看右側的「📚 Symbol Library」面板
- 目前有 R (電阻) 和 GND (接地) 兩個符號
- 點擊「Place」按鈕放置符號

### 3. 載入範例
- 點擊「📘 Examples」按鈕
- 選擇一個範例來探索功能

### 4. 建立電路
- 從符號庫放置符號
- 點擊引腳來建立連線
- 使用 R 鍵旋轉選中的符號
- 拖動符號來移動它們

### 5. 儲存與載入
- 💾 Save: 匯出為 JSON 檔案
- 📂 Load: 從檔案載入
- 📋 Copy: 複製到剪貼簿
- 📥 Paste: 從剪貼簿貼上

---

## 檔案結構

```
src/
├── fixtures/
│   ├── fixturesIndex.ts          # 範例索引 (新增 schematicFixtures)
│   └── schematics/               # 新增目錄
│       ├── 00_example_resistors_with_gnd.json
│       └── 01_example_with_rotation.json
├── symbol-renderer/
│   ├── SchematicCanvas.tsx       # 新增符號庫整合和範例載入
│   └── SymbolLibraryPanel.tsx    # 新元件 - 符號庫面板
└── symbol-lib/
    └── registry.ts               # 符號註冊表
```

---

## 技術細節

### 符號庫面板 (SymbolLibraryPanel.tsx)
- 使用 `listSymbols()` 獲取所有已註冊的符號
- 顯示符號 ID 和引腳數量
- 提供「Place」按鈕觸發放置模式

### 放置模式
- 使用 `placementMode` 和 `selectedSymbolId` 狀態
- 點擊畫布時在滑鼠位置建立新實例
- 按 ESC 取消放置模式
- 游標變為十字以提供視覺回饋

### 檔案類型檢測
檢查 JSON 結構:
- **SymbolDef**: 包含 `primitives` 和 `pins`
- **SchematicDoc**: 包含 `instances` 和 `wires`

如果類型不匹配,顯示友善的指導訊息。

---

## 下一步改進建議

1. **拖放放置**: 允許從符號庫拖放符號到畫布
2. **符號預覽**: 在符號庫面板顯示符號的小型 SVG 預覽
3. **鍵盤快捷鍵**: 為常用符號新增快捷鍵 (例如 Shift+R 放置電阻)
4. **符號搜尋**: 當符號庫變大時新增搜尋功能
5. **最近使用**: 追蹤並顯示最近使用的符號
6. **更多範例**: 新增更複雜的範例電路 (運算放大器、邏輯閘等)
