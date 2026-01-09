# KiCad Importer (Placeholder)

此專案目前 **不實作** KiCad 匯入（依照既定範圍控制）。

## 目標（未實作）

未來若要支援 KiCad 匯入，建議 pipeline 走：

1. **Parse**：讀入 KiCad 的檔案格式（例如 `.kicad_sch` / `.kicad_sym`），解析成 AST。
2. **Normalize**：把 KiCad 專有結構轉成中介格式（座標、方向、pin 定義、圖元）。
3. **Emit Contracts**：輸出為本專案已凍結的 JSON contracts：
   - `SymbolDef`（符號）
   - `SchematicDoc`（原理圖）
   - `Patch`（可重用區塊）

## 注意

- 目前只保留此 README 作為結構占位與設計備忘。
- 請以 `src/schemas/` 內的 schema / examples 作為格式的單一真實來源（source of truth）。
