# 網表導出修復 - 2026-01-09

## 問題

用戶報告: "the netlist button cannot have a circuit.json download"

**症狀:**
- 點擊 "🔌 Netlist" 按鈕顯示驗證錯誤對話框而不是下載文件
- 錯誤訊息: "wires[2].a.instId: Instance not found: inst_176855295341"
- 電路有孤立的連線(引用已刪除的元件實例)

## 根本原因

當用戶刪除元件但連線仍然存在時,`exportCircuitNetlist()` 會驗證文檔並在發現任何驗證錯誤時阻止導出。這對於非破壞性導出操作來說太嚴格了。