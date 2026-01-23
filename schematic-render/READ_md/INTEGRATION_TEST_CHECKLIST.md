# Integration Test Checklist

## ✅ Ticket A: Real Symbols in Library
### Test Cases:
1. ✅ Open Symbol Library panel
   - [ ] MCU (STM32F4) appears in library
   - [ ] LED appears in library
   - [ ] Capacitor appears in library
   - [ ] NPN Transistor appears in library

2. ✅ Place baseline symbols
   - [ ] Click "Place" on MCU → click canvas → MCU appears
   - [ ] Click "Place" on LED → click canvas → LED renders correctly
   - [ ] Click "Place" on Capacitor → click canvas → C appears
   - [ ] Click "Place" on transistor_npn → click canvas → transistor appears

3. ✅ Symbol persistence
   - [ ] Place some baseline symbols
   - [ ] Refresh page
   - [ ] All placed symbols still visible
   - [ ] Built-in R and GND also present

## ✅ Ticket B: Patch System MVP
### Test Cases:
1. ✅ Multi-selection
   - [ ] Ctrl+Click on first resistor → pink dashed border appears
   - [ ] Ctrl+Click on second resistor → both have pink borders
   - [ ] Status bar shows "Selected: 2 instances"
   - [ ] Ctrl+Click on selected item → deselects it

2. ✅ Save Patch
   - [ ] Select 2+ instances with Ctrl+Click
   - [ ] "Save Patch from Selection" button enabled
   - [ ] Click button → prompt for name
   - [ ] Enter "Voltage Divider" → OK
   - [ ] Patch appears in Patch Library panel
   - [ ] Shows correct inst/wires/ports count

3. ✅ Place Patch
   - [ ] Click "Place" on saved patch
   - [ ] Status bar shows "📦 Placing Patch: ..." in pink
   - [ ] Cursor changes (placement mode)
   - [ ] Click on canvas → patch instances appear
   - [ ] All internal wires preserved
   - [ ] Alert shows "✓ Patch placed"

4. ✅ Patch persistence
   - [ ] Save a patch
   - [ ] Refresh page
   - [ ] Patch still in Patch Library panel
   - [ ] Can place the saved patch

5. ✅ ESC cancellation
   - [ ] Enter patch placement mode
   - [ ] Press ESC
   - [ ] Placement mode cancelled
   - [ ] Status bar clears

6. ✅ Multi-delete
   - [ ] Select 3 instances with Ctrl+Click
   - [ ] Press Delete
   - [ ] All 3 instances removed
   - [ ] Connected wires also removed

## ✅ Ticket C: Smart Wire Routing
### Test Cases:
1. ✅ Wire avoids component bodies
   - [ ] Place R at (100, 100)
   - [ ] Place LED at (300, 100)
   - [ ] Place R at (200, 50) between them
   - [ ] Connect first R to LED
   - [ ] Wire path avoids middle R's bounding box

2. ✅ Routing strategies
   - [ ] Clear alignment: uses horizontal-first (L-shape)
   - [ ] Vertical obstacle: tries vertical-first
   - [ ] Both blocked: uses midpoint routing

3. ✅ Fallback to simple routing
   - [ ] If all strategies fail (unlikely)
   - [ ] Falls back to simple L-shape
   - [ ] Console shows warning

## Integration Tests
### Test Case 1: Complete Patch Workflow
**Steps:**
1. Clear localStorage (visit /clear-storage.html)
2. Place 2 resistors
3. Connect them with a wire
4. Ctrl+Click both resistors
5. Click "Save Patch from Selection"
6. Enter name: "Test Patch"
7. Verify patch in library
8. Click "Place" on patch
9. Click canvas
10. Verify copied instances appear
11. Refresh page
12. Verify patch still exists

**Expected:**
- ✅ All steps complete without errors
- ✅ Console shows "Auto-loaded baseline symbol: ..." for MCU, LED, C, transistor_npn
- ✅ No red error boxes
- ✅ No "Unknown symbolId" warnings

### Test Case 2: Baseline Symbols + Patch
**Steps:**
1. Place MCU
2. Place 2 LEDs
3. Place 2 resistors
4. Connect R→LED for each LED
5. Connect LEDs to MCU pins
6. Select both R+LED groups
7. Save as "LED Driver"
8. Place the patch elsewhere
9. Verify all components and wires

**Expected:**
- ✅ MCU appears correctly with 14 pins
- ✅ LED symbols with light arrows
- ✅ Patch saves with correct inst/wire counts
- ✅ Placed patch matches original

### Test Case 3: Wire Routing with Components
**Steps:**
1. Place 3 MCUs in a row
2. Try to connect leftmost MCU pin to rightmost MCU pin
3. Observe wire path

**Expected:**
- ✅ Wire routes around middle MCU
- ✅ No visual overlap with middle MCU bbox
- ✅ Path looks natural (not random)

## Browser Console Checks
- [ ] No TypeScript errors
- [ ] No "Unknown symbolId" warnings
- [ ] No "Cannot read properties of null" errors
- [ ] Baseline symbols auto-load messages present
- [ ] Patch operations log success

## Definition of Done
> "I can select 2 resistors + wires → Save Patch 'Voltage Divider' → Patch appears in Patch panel → Place Patch creates same group elsewhere → Refresh page → patch still exists"

**Test:**
1. [ ] Select 2 R + connecting wire
2. [ ] Save Patch "Voltage Divider"
3. [ ] Patch appears in Patch Library
4. [ ] Click Place → click canvas
5. [ ] New instance group created
6. [ ] F5 refresh
7. [ ] Patch still in library
8. [ ] Original and placed patches still on canvas

**Result:** __________ (PASS/FAIL)

## Notes
- All tests should be performed in fresh browser session
- Check both Chrome DevTools console and VS Code terminal for errors
- Document any unexpected behavior below:

---
**Test Date:** ___________
**Tester:** ___________
**Browser:** ___________
**Result:** PASS ☐ | FAIL ☐
**Issues Found:** ___________
