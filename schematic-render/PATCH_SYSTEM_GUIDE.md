# Patch System User Guide

## 功能概述
Patch 系統允許您將多個元件和連線組合成可重用的子電路（類似 KiCad 的 hierarchical blocks）。

## 主要功能

### 1. 多選元件
- **Ctrl+Click** (或 Mac 上的 **Cmd+Click**) 來選擇多個元件
- 多選的元件會顯示**粉紅色虛線邊框**
- 單選的元件會顯示**黃色虛線邊框**

### 2. 儲存 Patch
1. 使用 Ctrl+Click 選擇要組合的元件（至少2個）
2. 右側 **Patch Library** 面板中的 "Save Patch from Selection" 按鈕會啟用
3. 點擊按鈕，輸入 Patch 名稱（例如 "Voltage Divider"）
4. 可選：輸入描述
5. Patch 會自動儲存並出現在 Patch Library 列表中

**自動功能：**
- 自動包含選中元件之間的內部連線
- 自動推斷 Port（與外部連接的接腳）
- 自動正規化位置到原點
- 持久化到 localStorage（刷新頁面後依然存在）

### 3. 放置 Patch
1. 在 **Patch Library** 面板找到要放置的 Patch
2. 點擊 "Place" 按鈕
3. 畫布上會顯示 **📦 Placing Patch** 提示（粉紅色）
4. 在畫布上點擊要放置的位置
5. Patch 中的所有元件和連線會被複製到該位置
6. 按 **ESC** 取消放置模式

### 4. Patch 面板資訊
每個 Patch 顯示：
- **名稱**
- **元件數量** (inst:N)
- **連線數量** (wires:M)
- **Port 數量** (ports:K)

## 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| **Ctrl+Click** | 多選元件 |
| **Delete / Backspace** | 刪除選中的元件（支援多選批量刪除）|
| **R** | 旋轉選中元件（90度）|
| **ESC** | 取消當前操作（放置模式、多選等）|

## 使用範例

### 範例 1: 建立電壓分壓器 Patch
```
1. 放置 2 個 R（電阻）
2. 在它們之間連線
3. Ctrl+Click 選擇這 2 個電阻
4. 點擊 "Save Patch from Selection"
5. 輸入名稱: "Voltage Divider"
6. 完成！現在可以重複使用這個電路
```

### 範例 2: LED 驅動電路
```
1. 放置 1 個 R（限流電阻）
2. 放置 1 個 LED
3. 連接 R 和 LED
4. Ctrl+Click 選擇兩個元件
5. 儲存為 "LED Driver"
6. 下次直接點擊 Place 按鈕快速放置
```

## Port 自動推斷
系統會自動偵測 Patch 的輸入/輸出接腳：
- 掃描所有跨越 Patch 邊界的連線
- 內部元件的接腳如果連到外部，會自動成為 Port
- Port 資訊儲存在 Patch 中供未來使用

## 資料持久化
- **Patch 儲存在**: `localStorage` 的 `patchLibrary_v1` 鍵
- **自動載入**: 頁面重新載入時自動恢復所有 Patch
- **清除資料**: 可使用 `/clear-storage.html` 工具清除

## 已知限制
- 目前不支援巢狀 Patch（Patch 內包含其他 Patch）
- Port 連線需要手動建立（放置後）
- Patch 無法直接編輯，需要刪除後重新建立

## 技術細節
- **資料結構**: 參見 `src/patch-lib/types.ts`
- **操作邏輯**: 參見 `src/patch-lib/operations.ts`
- **UI 元件**: 參見 `src/symbol-renderer/PatchLibraryPanel.tsx`
