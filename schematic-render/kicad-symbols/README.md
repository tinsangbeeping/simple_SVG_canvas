# KiCad Symbol Conversions

This folder contains KiCad symbol files (`.kicad_sym`) and their converted JSON library files.

## Files

- **`*.kicad_sym`** - Original KiCad symbol library files
- **`*_lib.json`** - Converted symbol libraries in our format (`{ schemaVersion: 1, symbols: [...] }`)

## Converting KiCad Symbols

To convert a `.kicad_sym` file to JSON:

```bash
npm run kicad:import -- kicad-symbols/YourFile.kicad_sym 2>/dev/null > kicad-symbols/your_file_lib.json
```

## Importing in UI

1. Open the schematic editor
2. Click the ⚙️ menu in Symbol Library panel
3. Click "📥 Import KiCad (JSON)"
4. Select one of the `*_lib.json` files from this folder

## Current Libraries

- **Reference_Voltage.kicad_sym** → **reference_voltage_lib.json** (343 symbols)
- **Amplifier_Buffer.kicad_sym** → **amplifier_buffer_lib.json** (11 symbols)

All symbols are scaled 10x (via `KICAD_IMPORT_SCALE=10`) for proper display in the canvas.
