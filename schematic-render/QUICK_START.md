# Quick Start Guide - Three Tickets Implementation

## 🚀 立即測試新功能

### 1. 開啟應用程式
瀏覽器訪問：**http://localhost:5174**

---

## 🎯 Ticket A: 真實符號測試（2分鐘）

### Step 1: 檢查符號庫
1. 查看右側 **Symbol Library** 面板
2. 應該看到以下新符號：
   - **MCU (STM32F4)** - 微控制器圖示
   - **LED** - LED 符號
   - **Capacitor** - 電容符號
   - **NPN Transistor** - 電晶體符號

### Step 2: 放置符號
1. 點擊 **LED** 的 "Place" 按鈕
2. 畫布上點擊任意位置
3. LED 符號應該出現（紅色三角形 + 光線）

### Step 3: 驗證 Pins
1. 將滑鼠移到 LED 的接腳上
2. 接腳應該變成**綠色**並放大
3. 接腳可以正常連接

✅ **成功標準**: 4 個基線符號都能正常放置並顯示

---

## 📦 Ticket B: Patch 系統測試（5分鐘）

### Step 1: 建立元件組合
1. 放置 2 個 **R**（電阻）在畫布上
2. 連接它們：點擊第一個 R 的接腳 → 點擊第二個 R 的接腳

### Step 2: 多選元件
1. 按住 **Ctrl**（Mac 用 **Cmd**）
2. 點擊第一個電阻 → 粉紅色虛線邊框出現
3. 點擊第二個電阻 → 兩個都有粉紅色邊框
4. 狀態欄顯示 **"Selected: 2 instances"**

### Step 3: 儲存 Patch
1. 右側找到新的 **Patch Library** 面板
2. 點擊 **"Save Patch from Selection"** 按鈕
3. 彈出輸入框，輸入名稱：**Voltage Divider**
4. 可選：輸入描述
5. 點擊 OK

### Step 4: 驗證 Patch
1. 檢查 Patch Library 面板
2. 應該看到 **"Voltage Divider"** 出現
3. 顯示 `inst:2 wires:1 ports:2`（數字可能不同）

### Step 5: 放置 Patch
1. 點擊 Voltage Divider 的 **"Place"** 按鈕
2. 狀態欄顯示 **"📦 Placing Patch: Voltage Divider"**（粉紅色）
3. 在畫布其他地方點擊
4. 相同的電阻組合應該出現在新位置

### Step 6: 持久化測試
1. 按 **F5** 刷新頁面
2. Patch Library 中的 "Voltage Divider" 仍然存在
3. 可以繼續放置該 Patch

✅ **成功標準**: 完整的 save → place → refresh 流程無錯誤

---

## 🔀 Ticket C: 智慧路由測試（3分鐘）

### Step 1: 建立障礙物場景
1. 放置 **R** 在 (100, 100) 位置（左邊）
2. 放置 **LED** 在 (400, 100) 位置（右邊）
3. 放置另一個 **R** 在 (250, 100) 位置（中間）

### Step 2: 連接測試
1. 點擊左邊 R 的右接腳
2. 點擊右邊 LED 的左接腳
3. 觀察連線路徑

### Step 3: 驗證路由
連線應該：
- ❌ **不直接穿過中間的 R**
- ✅ **繞過中間元件**（上方或下方）
- ✅ 路徑看起來自然（不是隨機折線）

### 進階測試
1. 移動中間的元件到不同位置
2. 刪除並重新連線
3. 每次路由都應該避開障礙物

✅ **成功標準**: 連線不穿過元件本體的 bounding box

---

## 🎮 鍵盤快捷鍵速查

| 按鍵 | 功能 |
|------|------|
| **Ctrl+Click** | 多選/取消選擇元件 |
| **Delete** / **Backspace** | 刪除選中元件（支援多選）|
| **R** | 旋轉選中元件（90°）|
| **ESC** | 取消當前操作（放置模式、多選等）|

---

## 🐛 問題排查

### 問題 1: 看不到基線符號
**檢查**:
- 開啟瀏覽器 DevTools (F12)
- 查看 Console 分頁
- 應該看到：
  ```
  Auto-loaded baseline symbol: MCU
  Auto-loaded baseline symbol: LED
  Auto-loaded baseline symbol: C
  Auto-loaded baseline symbol: transistor_npn
  ```

**沒看到這些訊息？**
- 刷新頁面 (F5)
- 檢查是否有紅色錯誤訊息

### 問題 2: Patch 儲存失敗
**檢查**:
- 確認已選擇至少 2 個元件（Ctrl+Click）
- 狀態欄顯示 "Selected: 2 instances"（或更多）
- "Save Patch" 按鈕應該是**啟用**狀態（不是灰色）

### 問題 3: Patch 放置後沒有元件出現
**檢查 Console**:
- 可能有 "Patch not found" 錯誤
- 可能有 "Unknown symbolId" 警告

**解決方案**:
- 訪問 `/clear-storage.html`
- 點擊 "Clear All Storage"
- 刷新主頁面
- 重新建立 Patch

### 問題 4: 智慧路由沒有避開元件
**可能原因**:
1. 元件沒有 bbox（查看 symbolDef.bbox）
2. 元件太接近，所有路徑都被阻擋
3. 回退到簡單路由（查看 Console 的 warning）

**驗證**:
- 拉大元件間距
- 使用有明確 bbox 的符號（MCU、LED、C）

---

## 📊 預期的 Console 輸出（成功）

```
Auto-loaded baseline symbol: MCU
Auto-loaded baseline symbol: LED  
Auto-loaded baseline symbol: C
Auto-loaded baseline symbol: transistor_npn
✓ Patch "Voltage Divider" saved with 2 instances, 1 wires, 2 ports
✓ Patch placed
```

**不應該出現的錯誤**:
- ❌ `Unknown symbolId: R`
- ❌ `Cannot read properties of null`
- ❌ `getSymbolDef threw error`
- ❌ TypeScript compilation errors

---

## ✅ 完整測試流程（10分鐘）

### 超級測試：LED 驅動 Patch
1. **放置元件**:
   - 1 個 MCU
   - 2 個 LED  
   - 2 個 R（限流電阻）

2. **連接電路**:
   - R1 → LED1 → MCU.PA0
   - R2 → LED2 → MCU.PA1

3. **建立 Patch**:
   - Ctrl+Click 選擇 R1 + LED1 + 連線
   - Save Patch: "LED Driver 1"
   - Ctrl+Click 選擇 R2 + LED2 + 連線  
   - Save Patch: "LED Driver 2"

4. **驗證**:
   - Patch Library 顯示 2 個 patches
   - Place 任一個 patch → 出現相同電路
   - F5 刷新 → patches 仍存在

5. **高級測試 - 智慧路由**:
   - 在兩個 LED 之間放置一個 MCU（作為障礙物）
   - 連接左邊 LED 到右邊 LED
   - 連線應該繞過中間的 MCU

✅ **全部通過 = 三個 Tickets 完整實現！**

---

## 📝 測試報告模板

```
測試日期: __________
瀏覽器: __________

[ ] Ticket A: 基線符號正常顯示和放置
[ ] Ticket B: Patch 儲存和放置流程完整
[ ] Ticket B: Patch 持久化（刷新後仍存在）
[ ] Ticket C: 智慧路由避開元件

問題記錄:
_______________________________
_______________________________

整體評價: PASS ☐ / FAIL ☐
```

---

## 🎉 成功標誌

當您看到以下情況時，恭喜您三個 Tickets 都已成功！

1. ✅ Symbol Library 有 11+ 個符號（包括 MCU、LED、C、NPN）
2. ✅ Patch Library 面板出現並可正常使用
3. ✅ Ctrl+Click 多選顯示粉紅色邊框
4. ✅ 儲存的 Patch 刷新後依然存在
5. ✅ 連線自動繞過元件本體
6. ✅ Console 沒有紅色錯誤

**現在去試試吧！** 🚀

需要幫助？查看 `PATCH_SYSTEM_GUIDE.md` 和 `INTEGRATION_TEST_CHECKLIST.md`
