# Core JSON Contracts

此資料夾用來「凍結」本專案的核心資料格式（供儲存、匯入/匯出、未來的檔案後端、以及外部 importer 使用）。

## Versions

- 目前以 `schemaVersion: 1` 為主。
- 若未來要破壞性變更，請新增 `v2` schema，並透過 `src/schematic/migrate.ts` 做遷移。

## Schemas

- Symbol definitions: `symbolDef.v1.schema.json`
- Schematic documents: `schematicDoc.v1.schema.json`
- Reusable patches: `patch.v1.schema.json`

## Examples

範例位於 `examples/`：

- `examples/symbolDef_R.json`
- `examples/schematicDoc_example.json`
- `examples/patch_example.json`
