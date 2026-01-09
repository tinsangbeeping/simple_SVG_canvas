# 🧪 Quick Test Guide - Smart Load & Persistence

## Test the App: http://localhost:5173/

---

## Test 1: Symbol Count Display ✅

**What to check:**
- Open the app
- Look at Symbol Library panel on the right
- Should see: "2 symbols in library"
- Should see: "IDs: R, GND"

**Expected:**
```
╔════════════════════════════╗
║ 📚 Symbol Library          ║
╠════════════════════════════╣
║ 2 symbols in library       ║
║ IDs: R, GND                ║
╚════════════════════════════╝
```

---

## Test 2: Import Single Symbol ✅

**Steps:**
1. Click "📦 Import Symbols" button (purple)
2. Navigate to: `src/fixtures/symbols/transistor_npn.json`
3. Select and open

**Expected:**
- Alert: `✓ Symbol "transistor_npn" imported into library`
- Panel updates to: "3 symbols in library"
- IDs: "R, GND, transistor_npn"

---

## Test 3: Import Symbol Library ✅

**Steps:**
1. Click "📦 Import Symbols"
2. Navigate to: `src/fixtures/symbols/example_symbol_library.json`
3. Select and open

**Expected:**
- Alert: `✓ Successfully imported 3 symbol(s) into library`
- Panel updates to: "6 symbols in library"
- IDs include: capacitor, led, inductor

---

## Test 4: Persistence ✅

**Steps:**
1. After importing symbols (Tests 2 & 3)
2. Reload the page (F5 or Ctrl+R)
3. Check Symbol Library panel

**Expected:**
- All imported symbols still there
- Count: "6 symbols in library"
- IDs: R, GND, transistor_npn, capacitor, led, inductor

---

## Test 5: Place Imported Symbol ✅

**Steps:**
1. Find "capacitor" in Symbol Library
2. Click "Place" button
3. Click on canvas

**Expected:**
- Capacitor symbol appears on canvas
- Two vertical lines with leads
- "C" label at top

---

## Test 6: Smart Load - Schematic ✅

**Steps:**
1. Click "📂 Load" button
2. Select: `src/fixtures/schematics/00_example_resistors_with_gnd.json`

**Expected:**
- Alert: `✓ Schematic loaded successfully`
- Canvas shows: 2 resistors + GND with wires

---

## Test 7: Smart Load - Wrong File Type ✅

**Steps:**
1. Click "📂 Load" button (not Import Symbols!)
2. Select a symbol file: `transistor_npn.json`

**Expected:**
- Alert: `✓ Symbol "transistor_npn" imported into library`
- Symbol added to library automatically
- NOT loaded as schematic

---

## Test 8: Import Symbols - Wrong File Type ✅

**Steps:**
1. Click "📦 Import Symbols"
2. Select a schematic: `00_example_resistors_with_gnd.json`

**Expected:**
- Alert:
```
❌ This is a Schematic, not symbol data!

Use the "📂 Load" button to load schematics.
```

---

## Test 9: Auto-Compute BBox ✅

**Steps:**
1. Open browser console (F12)
2. Click "📦 Import Symbols"
3. Import any symbol WITHOUT bbox field (e.g., transistor_npn.json)
4. Check console

**Expected console log:**
```
Auto-computed bbox for transistor_npn: {x: -35, y: -35, w: 50, h: 70}
Saved 4 user symbols to localStorage
```

---

## Test 10: localStorage Inspection 🔍

**Steps:**
1. Open browser console (F12)
2. Type:
```javascript
JSON.parse(localStorage.getItem('symbolLibrary'))
```

**Expected:**
- Array of imported symbols (not R or GND)
- Each has id, bbox, primitives, pins
- Example:
```json
[
  {
    "id": "capacitor",
    "bbox": {...},
    "primitives": [...],
    "pins": [...]
  },
  ...
]
```

---

## Test 11: Paste Detection ✅

**Steps:**
1. Copy schematic JSON to clipboard:
```json
{"schemaVersion":1,"instances":[],"wires":[]}
```
2. Click "📥 Paste" button

**Expected:**
- Schematic loads into editor
- Empty schematic (no instances)

**Try with symbol JSON:**
1. Copy symbol JSON to clipboard
2. Click "📥 Paste"

**Expected:**
- Alert suggests using Import Symbols button

---

## Test 12: Unknown JSON ✅

**Steps:**
1. Create a test file `test.json`:
```json
{
  "random": "data",
  "notValid": true
}
```
2. Click "📂 Load"
3. Select test.json

**Expected:**
- Alert:
```
❌ Unknown JSON format

Expected one of:
• SchematicDoc (with instances and wires)
• SymbolDef (with id, primitives, pins)
• SymbolDef[] (array of symbols)
• { symbols: SymbolDef[] } (symbol library)
```

---

## Visual Verification 👁️

### Button Layout (Top Bar):
```
[Auto Tidy] [ELK Layout] [💾 Save] [📂 Load] [📦 Import Symbols] [📘 Examples] [📋 Copy] [📥 Paste]
                                              ^^^^^^^^^^^^^^^^^^^
                                              New purple button
```

### Symbol Library Panel:
```
╔══════════════════════════════════╗
║  📚 Symbol Library               ║
╠══════════════════════════════════╣
║  6 symbols in library            ║  ← Shows count
║  IDs: R, GND, capacitor, led,    ║  ← Shows IDs
║       inductor, transistor_npn   ║
╠══════════════════════════════════╣
║  [R]                     [Place] ║
║  [GND]                   [Place] ║
║  [capacitor]             [Place] ║  ← New symbols
║  [led]                   [Place] ║  ← appear here
║  [inductor]              [Place] ║
║  [transistor_npn]        [Place] ║
╚══════════════════════════════════╝
```

---

## Success Criteria ✅

All tests pass if:
- ✅ Symbol count shows correct number
- ✅ Symbol IDs list all symbols
- ✅ Import Symbols button imports successfully
- ✅ Symbols persist after reload
- ✅ Auto-bbox computation works (check console)
- ✅ Smart detection routes to correct handler
- ✅ Error messages are clear and helpful
- ✅ Imported symbols can be placed on canvas
- ✅ localStorage contains user symbols

---

## Clear Everything (Reset Test) 🔄

**If you want to start fresh:**

1. Open console (F12)
2. Run:
```javascript
localStorage.removeItem('symbolLibrary')
```
3. Reload page
4. Should see: "2 symbols in library" (just R and GND)

---

## Common Issues & Solutions

### Symbols not appearing after import
- Check browser console for errors
- Verify JSON is valid
- Check if symbols have required fields (id, primitives, pins)

### Symbols lost after reload
- Check if localStorage is enabled in browser
- Private/incognito mode may block localStorage
- Check browser console for storage errors

### Import button not working
- Check browser console for JavaScript errors
- Verify file is valid JSON
- Try a different file format

### Panel not updating
- Symbol count should update automatically
- If not, check console for errors
- Try clicking another symbol's Place button

---

## Quick Demo Script (1 minute)

1. **Open app** → See 2 symbols (R, GND)
2. **Click Import Symbols** → Select `example_symbol_library.json`
3. **See "5 symbols"** → Panel shows all IDs
4. **Click Place on "led"** → Place LED on canvas
5. **Reload page** → Symbols still there! ✅

---

## All Features Working! 🎉

If all tests pass:
- ✅ Smart JSON detection
- ✅ Symbol import
- ✅ localStorage persistence
- ✅ Auto-bbox computation
- ✅ UI feedback
- ✅ Error handling

Ready for production! 🚀
