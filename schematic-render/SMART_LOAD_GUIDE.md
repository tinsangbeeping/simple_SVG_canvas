# Smart Load & Symbol Persistence - Implementation Guide

## 🎯 What Was Implemented

### 1. **Smart JSON Detection** ✅
The system now automatically detects the type of JSON file being loaded:

- **SchematicDoc**: Has `instances` and `wires`
- **SymbolDef**: Has `id`, `primitives`, and `pins`
- **SymbolDef[]**: Array of symbol definitions
- **{ symbols: SymbolDef[] }**: Symbol library format

### 2. **Import Symbols Button** ✅
New dedicated button for importing symbols into the library:
- Located between "Load" and "Examples" buttons
- Purple color (#6a5aaa) to distinguish from other buttons
- Validates and registers all imported symbols
- Shows success/error summary

### 3. **localStorage Persistence** ✅
Symbols are now automatically saved and restored:
- Saved to `localStorage` under key `"symbolLibrary"`
- Auto-loads on app startup
- Excludes built-in symbols (R, GND) from storage
- Updates after each import/unregister operation

### 4. **Auto-Compute BBox** ✅
Missing bounding boxes are automatically calculated:
- Analyzes all primitives to find extent
- Adds 10% padding
- Handles all primitive types (line, rect, circle, arc, polyline, text)
- Logs computed bbox to console

### 5. **Enhanced Symbol Library Panel** ✅
Shows comprehensive library information:
- Total symbol count
- List of all symbol IDs
- Auto-refreshes when symbols are imported

---

## 📁 New Files Created

### `src/symbol-lib/smartLoad.ts`
Contains smart detection and validation logic:

```typescript
export function detectJSONType(parsed: any): JSONDetectionResult
export function validateSymbolDef(symbol: any): { valid: boolean; errors: string[] }
```

**Detection logic:**
1. Check for SchematicDoc (instances + wires)
2. Check for symbol library ({ symbols: [...] })
3. Check for single SymbolDef (id + primitives + pins)
4. Check for SymbolDef array
5. Return "unknown" if none match

### `src/fixtures/symbols/example_symbol_library.json`
Test file with 3 symbols:
- **capacitor**: Two-terminal passive component
- **led**: Light-emitting diode with arrow
- **inductor**: Coil symbol with arcs

### `src/fixtures/symbols/transistor_npn.json`
Single symbol test file:
- **transistor_npn**: 3-pin NPN transistor

---

## 🔧 Modified Files

### `src/symbol-lib/registry.ts`
**New functions:**
- `computeBBox()`: Auto-calculate bounding box from primitives
- `loadFromStorage()`: Load symbols from localStorage
- `saveToStorage()`: Save user symbols to localStorage
- `unregisterSymbol()`: Remove symbol from registry
- `getSymbolCount()`: Get total number of symbols
- `clearUserSymbols()`: Remove all non-built-in symbols

**Enhanced:**
- `registerSymbol()`: Now auto-computes bbox and saves to storage
- Initialization: Auto-loads symbols on module load

### `src/symbol-renderer/SchematicCanvas.tsx`
**New state:**
- `libraryVersion`: Trigger re-render when library changes

**New functions:**
- `importSymbols()`: Dedicated symbol import function
- Smart `importJSON()`: Auto-detects and handles different formats
- Smart `pasteJSON()`: Auto-detects pasted content

**UI Changes:**
- Added "📦 Import Symbols" button (purple)
- Pass `key={libraryVersion}` to SymbolLibraryPanel for refresh

### `src/symbol-renderer/SymbolLibraryPanel.tsx`
**Enhanced display:**
- Shows symbol count at top
- Lists all symbol IDs in small text
- Better visual hierarchy

---

## 🚀 Usage Guide

### Loading a Schematic
1. Click "📂 Load"
2. Select a JSON file with `instances` and `wires`
3. System detects it as SchematicDoc
4. Migrates and validates
5. Loads into editor

### Importing Symbols

#### Method 1: Import Symbols Button (Recommended)
1. Click "📦 Import Symbols"
2. Select JSON file containing:
   - Single SymbolDef
   - Array of SymbolDefs
   - `{ symbols: [...] }`
3. System validates each symbol
4. Imports to library
5. Shows success message: "✓ Imported 3 symbols"
6. Symbols persist across sessions

#### Method 2: Load Button (Auto-detect)
1. Click "📂 Load"
2. Select a symbol JSON file
3. System detects it's not a schematic
4. Automatically imports to library
5. Shows success message

#### Method 3: Paste (Schematic only)
- Only works for SchematicDoc
- Symbols in clipboard trigger suggestion to use Import button

### Testing with Example Files

#### Test 1: Import Symbol Library
```bash
File: src/fixtures/symbols/example_symbol_library.json
Contains: 3 symbols (capacitor, led, inductor)
Expected: ✓ Successfully imported 3 symbol(s) into library
```

#### Test 2: Import Single Symbol
```bash
File: src/fixtures/symbols/transistor_npn.json
Contains: 1 symbol (transistor_npn)
Expected: ✓ Symbol "transistor_npn" imported into library
```

#### Test 3: Load Schematic
```bash
File: src/fixtures/schematics/00_example_resistors_with_gnd.json
Expected: ✓ Schematic loaded successfully
```

---

## 🎨 Visual Indicators

### Symbol Library Panel Header
```
╔══════════════════════════════════╗
║  📚 Symbol Library               ║
╠══════════════════════════════════╣
║  5 symbols in library            ║
║  IDs: R, GND, capacitor, led,    ║
║       inductor                   ║
╚══════════════════════════════════╝
```

### Import Symbols Button
- **Color**: Purple (#6a5aaa)
- **Icon**: 📦
- **Label**: "Import Symbols"
- **Position**: Between Load and Examples

### Success Messages

#### After importing symbols:
```
✓ Successfully imported 3 symbol(s) into library
```

#### After importing with errors:
```
✓ Imported 2 symbol(s)

Errors:
bad_symbol: Symbol must have a 'pins' array
invalid_id: Symbol must have a string 'id' field
```

### Error Messages

#### Wrong file type in Import Symbols:
```
❌ This is a Schematic, not symbol data!

Use the "📂 Load" button to load schematics.
```

#### Unknown format:
```
❌ Unknown format

Expected:
• SymbolDef (with id, primitives, pins)
• SymbolDef[] (array of symbols)
• { symbols: SymbolDef[] } (symbol library)
```

---

## 🧪 Testing Checklist

### Smart Detection
- [x] Load SchematicDoc → Loads as schematic
- [x] Load SymbolDef → Imports to library
- [x] Load SymbolDef[] → Imports all to library
- [x] Load { symbols: [...] } → Imports all to library
- [x] Load unknown JSON → Shows clear error

### Import Symbols Button
- [x] Imports single symbol
- [x] Imports symbol array
- [x] Imports symbol library
- [x] Rejects schematic files with friendly error
- [x] Shows validation errors for invalid symbols

### Persistence
- [x] Symbols saved to localStorage
- [x] Symbols restored on page reload
- [x] Built-in symbols (R, GND) not duplicated in storage
- [x] Storage updates after each import

### Auto-Compute BBox
- [x] Symbols without bbox get auto-computed bounds
- [x] Computed bbox includes all primitives
- [x] 10% padding applied
- [x] Bbox logged to console

### UI Updates
- [x] Symbol count displays correctly
- [x] Symbol ID list shows all symbols
- [x] Panel refreshes after import
- [x] Import Symbols button visible and styled

---

## 🔍 Implementation Details

### BBox Computation Algorithm

```typescript
1. Initialize bounds: minX/Y = ∞, maxX/Y = -∞
2. For each primitive:
   - line: Check both endpoints
   - rect: Check corners
   - circle: Check bounding square
   - arc: Approximate with full circle
   - polyline: Check all points
   - text: Approximate with size-based bounds
3. Add 10% padding (minimum 2 units)
4. Return { x: minX-pad, y: minY-pad, w: width+2*pad, h: height+2*pad }
```

### Storage Format

```json
// localStorage["symbolLibrary"]
[
  {
    "id": "capacitor",
    "bbox": { "x": -35, "y": -20, "w": 70, "h": 40 },
    "primitives": [...],
    "pins": [...]
  },
  ...
]
```

**Note**: Built-ins (R, GND) are excluded from storage.

### Detection Priority

1. **SchematicDoc** (most specific)
2. **Symbol Library Object** `{ symbols: [...] }`
3. **Single SymbolDef**
4. **SymbolDef Array**
5. **Unknown**

This order prevents false positives.

---

## 🐛 Debugging

### Check localStorage
```javascript
// In browser console:
localStorage.getItem('symbolLibrary')
```

### Check registry
```javascript
// In browser console:
import { symbolRegistry } from './src/symbol-lib/registry'
console.log(Object.keys(symbolRegistry))
```

### Clear storage
```javascript
// In browser console:
localStorage.removeItem('symbolLibrary')
// Then reload page
```

### Console logs
- Symbol imports log: `"Loaded N symbols from localStorage"`
- BBox computation logs: `"Auto-computed bbox for [id]: {...}"`
- Storage saves log: `"Saved N user symbols to localStorage"`

---

## 📊 Benefits Summary

### Before
- ❌ Only detect SchematicDoc vs SymbolDef
- ❌ No way to import multiple symbols at once
- ❌ Symbols lost on page reload
- ❌ Manual bbox required
- ❌ Confusing error messages

### After
- ✅ Smart detection of 5 different formats
- ✅ Import single or multiple symbols
- ✅ Automatic persistence via localStorage
- ✅ Auto-compute missing bbox
- ✅ Clear, actionable error messages
- ✅ Symbol count and ID list visible
- ✅ Dedicated Import Symbols button

---

## 🎓 User Workflow

### New User Journey:
1. **Open app** → Sees R and GND in library
2. **Click "📦 Import Symbols"**
3. **Select `example_symbol_library.json`**
4. **See confirmation**: "✓ Imported 3 symbols"
5. **Library panel shows**: "5 symbols in library"
6. **Click "Place"** on new symbols
7. **Reload page** → Symbols still there! 🎉

### Power User:
1. Create custom symbols in Symbol Gallery
2. Export as { symbols: [...] }
3. Share with team
4. Team imports via "📦 Import Symbols"
5. Everyone has same library
6. Persists across sessions

---

## 🚦 Next Steps (Future Enhancements)

- [ ] Export user symbols as library JSON
- [ ] Symbol search/filter in panel
- [ ] Symbol categories/tags
- [ ] Symbol preview thumbnails
- [ ] Bulk delete symbols
- [ ] Import from URL
- [ ] Symbol marketplace/gallery

---

## ✅ All Requirements Met

- ✅ **Smart Load**: Auto-detects SchematicDoc, SymbolDef, arrays, library format
- ✅ **Import Symbols Button**: Dedicated UI for symbol import
- ✅ **Validation**: Each symbol validated before import
- ✅ **Auto-bbox**: Missing bounding boxes computed automatically
- ✅ **Persistence**: localStorage integration
- ✅ **UI Confirmation**: Symbol count and ID list displayed
- ✅ **Error Handling**: Clear messages for each error case

All features implemented and tested! 🎉
