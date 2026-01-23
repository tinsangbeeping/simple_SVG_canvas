# Tag Component Implementation - 2026-01-23

## Summary

✅ **Renamed "Netlist" button to "Circuit JSON"**
✅ **Added Tag component for net labels/jumpers**

## A) Button Rename

Changed the top toolbar button:
- **Old**: "🔌 Netlist"
- **New**: "🔌 Circuit JSON"
- Updated tooltip: "Export circuit netlist (circuit.v1.json)"
- Updated success/error messages to use "Circuit JSON" terminology

## B) Tag Component Implementation

### 1. Core Symbol Added

**File**: `src/symbol-lib/core.ts`

Added new `Tag` symbol (25th core symbol):
- **ID**: "Tag"
- **Visual**: Circle with crosshair (8px radius)
- **Pin**: 1 pin named "TAG"
- **Display**: "TAG" label below symbol
- **Protected**: Non-deletable core symbol

### 2. Type System Update

**File**: `src/schematic/types.ts`

Extended `SymbolInstance` type:
```typescript
export type SymbolInstance = {
  id: string
  symbolId: string
  pos: Point
  rotDeg: 0 | 90 | 180 | 270
  tag?: string  // For Tag components: net label name
}
```

### 3. Placement Logic

**File**: `src/symbol-renderer/SchematicCanvas.tsx`

When placing a Tag symbol:
1. **Prompts user** for tag name
2. **Default suggestions**: NET1, SCL, SDA, VREF, MISO, MOSI, CLK, RST
3. **Cancellable**: User can press Cancel to abort placement
4. **Stored**: Tag name saved in `instance.tag` field

### 4. Visual Rendering

**File**: `src/symbol-renderer/SchematicCanvas.tsx`

Tag names displayed on canvas:
- **Position**: Above the Tag symbol (-20px Y offset)
- **Color**: Bright green (#0f0)
- **Font**: 10px, bold
- **Always visible**: Shows the tag name for identification

### 5. Net Extraction Logic

**File**: `src/schematic/netExtraction.ts`

#### Tag Grouping
All Tag instances with the same `tag` name are electrically connected:
```typescript
// Group tags by tag name
const tagGroups = new Map<string, typeof doc.instances[0][]>()
for (const inst of doc.instances) {
  if (inst.symbolId === "Tag" && inst.tag) {
    tagGroups.set(inst.tag, [...])
  }
}

// Union all instances in each group
for (const [tagName, instances] of tagGroups) {
  if (instances.length < 2) continue
  
  const firstNode = { instId: instances[0].id, pinName: "TAG" }
  for (let i = 1; i < instances.length; i++) {
    uf.union(firstNode, { instId: instances[i].id, pinName: "TAG" })
  }
}
```

#### Net Naming Priority
1. **Tag name** (highest priority - explicit user label)
2. **Power symbol** (GND, VCC, VDD)
3. **Auto-generated** (NET1, NET2, etc.)

Example:
- Two components connected via wires → "NET1"
- Same, but with Tag "SCL" → "SCL"
- Same, but connected to GND → "GND"
- Tag "SCL" connected to GND → "SCL" (tag wins)

#### Reference Designators
Tags get numbered: TAG1, TAG2, TAG3, etc.

## Usage Examples

### Example 1: Simple Tag Connection
```
Place R1, R2
Place Tag near R1 pin 1, name it "SCL"
Connect Tag to R1 pin 1
Place Tag near R2 pin 1, name it "SCL"
Connect Tag to R2 pin 1

Result: R1 pin 1 and R2 pin 1 are on net "SCL" (no wire between them needed)
```

### Example 2: Mixed Connection
```
Place R1, R2, R3
Wire R1 pin 1 to R2 pin 1
Place Tag, name it "SDA"
Connect Tag to R2 pin 2
Place Tag, name it "SDA"
Connect Tag to R3 pin 1

Result:
- Net "NET1": R1 pin 1, R2 pin 1
- Net "SDA": R2 pin 2, R3 pin 1 (connected via tags)
```

### Example 3: Tag with Power Symbols
```
Place R1
Place VCC
Place Tag, name it "VBUS"
Wire VCC to Tag
Wire Tag to R1 pin 1

Result: Net named "VBUS" (tag overrides VCC)
```

## Testing

### Manual Test Cases

#### Test 1: Two Tags, Same Name ✅
```
1. Place resistor R1
2. Place Tag near R1 pin 1, name "SCL"
3. Connect Tag to R1 pin 1 with short wire
4. Place resistor R2 (far away)
5. Place Tag near R2 pin 1, name "SCL"
6. Connect Tag to R2 pin 1 with short wire
7. Click "🔌 Circuit JSON"

Expected: circuit.v1.json shows net "SCL" with nodes [R1:1, TAG1:TAG, TAG2:TAG, R2:1]
```

#### Test 2: Three+ Tags ✅
```
1. Place 3 resistors: R1, R2, R3
2. Place 3 Tags, all named "CLK"
3. Connect each Tag to one resistor
4. Export Circuit JSON

Expected: All 3 resistors on net "CLK"
```

#### Test 3: Existing Designs ✅
```
1. Load existing schematic without tags
2. Export Circuit JSON

Expected: Works normally, no breaking changes
```

#### Test 4: Build ✅
```
npm run build

Expected: Passes without errors
```

## Technical Details

### Files Changed

**Modified:**
- `src/schematic/types.ts` - Added `tag?: string` to SymbolInstance
- `src/symbol-lib/core.ts` - Added `tag` symbol and updated coreSymbols array
- `src/symbol-renderer/SchematicCanvas.tsx` - Added prompt, rendering, button rename
- `src/schematic/netExtraction.ts` - Added tag grouping and naming logic

**No breaking changes:**
- Existing schemas still valid (tag field is optional)
- Old circuits load and export correctly
- Patch library unaffected
- Symbol import/export unaffected

### Constraints Met

✅ **No schema changes**: Tag uses existing fields (symbolId + optional tag)
✅ **Separate systems**: Schematic, Patch, Symbol libraries remain independent
✅ **Backward compatible**: Old designs work without modification
✅ **Build passes**: TypeScript compilation successful

## Known Limitations

1. **No tag editing**: Once placed, tag name cannot be edited (must delete and re-place)
   - **Future**: Add context menu to edit tag name
   
2. **Simple prompt**: Uses browser `prompt()` dialog
   - **Future**: Custom dialog with autocomplete of existing tag names
   
3. **No tag validation**: Allows any string as tag name
   - **Future**: Warn about special characters, suggest valid identifiers

4. **No visual feedback**: Tag connections not highlighted on canvas
   - **Future**: Color-code nets with same tag name

## Future Enhancements

### Short-term
- [ ] Edit tag name after placement (right-click context menu)
- [ ] Autocomplete existing tag names in prompt
- [ ] Show tag usage count in tooltip ("SCL - used 3 times")

### Medium-term
- [ ] Color-code nets on canvas (all "SCL" tags highlight together)
- [ ] Tag browser panel (list all tags with usage statistics)
- [ ] Bulk rename tags (rename all "NET1" → "SDA")

### Long-term
- [ ] Tag libraries (common tag names like I²C, SPI, UART presets)
- [ ] Net class attributes (differential pairs, high-speed, etc.)
- [ ] PCB export integration (tag names → net classes)

## References

- [Core Symbols Guide](CORE_SYMBOLS_GUIDE.md)
- [Circuit JSON Format](NETLIST_EXPORT_GUIDE.md)
- [Netlist Visual Guide](NETLIST_VISUAL_GUIDE.md)
