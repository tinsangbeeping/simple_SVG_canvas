# Visual Guide - What You Should See

## 🎯 Main Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  📐 Schematic Editor  |  🎨 Symbol Gallery                          │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ Status Bar:                                                          │
│ Selected: none | Wires: 0 | Pending: none                          │
│ [Auto Tidy] [ELK Layout] [💾 Save] [📂 Load] [📘 Examples]         │
│ [📋 Copy] [📥 Paste]                                                │
└─────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────┬──────────────────────────────────┐
│                                   │  📚 Symbol Library              │
│                                   │ ────────────────────────────────│
│        CANVAS                     │  ┌──────────────────────────┐  │
│     (Grid with symbols)           │  │  R                       │  │
│                                   │  │  2 pins          [Place] │  │
│                                   │  └──────────────────────────┘  │
│                                   │                                │
│                                   │  ┌──────────────────────────┐  │
│                                   │  │  GND                     │  │
│                                   │  │  1 pin           [Place] │  │
│                                   │  └──────────────────────────┘  │
│                                   │                                │
└──────────────────────────────────┴──────────────────────────────────┘
```

---

## 📚 Symbol Library Panel (Right Side)

### What You See:

```
╔══════════════════════════════════╗
║  📚 Symbol Library               ║
╠══════════════════════════════════╣
║                                  ║
║  ┌────────────────────────────┐ ║
║  │  R                    2 pins│ ║
║  │              [Place]        │ ║
║  └────────────────────────────┘ ║
║                                  ║
║  ┌────────────────────────────┐ ║
║  │  GND                  1 pin │ ║
║  │              [Place]        │ ║
║  └────────────────────────────┘ ║
║                                  ║
╚══════════════════════════════════╝
```

### Panel Features:
- **Title**: "📚 Symbol Library" at the top
- **Symbol Cards**: Each symbol has:
  - Symbol ID (e.g., "R", "GND")
  - Pin count (e.g., "2 pins", "1 pin")
  - Blue "Place" button
- **Hover Effect**: Cards slightly lighten on hover
- **Selected State**: Selected symbol has blue border

---

## 🎯 Placement Mode

### When You Click "Place":

```
Status: 🎯 Placing: R (click to place, ESC to cancel)
Cursor: ✚ (crosshair)

Canvas becomes interactive:
┌─────────────────────────────┐
│         ✚ ← Click here      │
│                              │
│    Symbol will appear        │
│    at this grid position     │
│                              │
└─────────────────────────────┘
```

### Visual Feedback:
1. **Status Bar**: Shows "🎯 Placing: [SymbolID]"
2. **Cursor**: Changes to crosshair (✚)
3. **Symbol Card**: Highlighted with blue border
4. **Instructions**: "click to place, ESC to cancel"

---

## 📘 Examples Dialog

### When You Click "📘 Examples":

```
┌────────────────────────────────────────────┐
│  Available examples:                       │
│                                            │
│  1. Resistors with GND                     │
│     Two resistors connected to ground      │
│                                            │
│  2. Circuit with Rotation                  │
│     Three resistors with 90° rotation      │
│                                            │
│  Enter number (1-2):  [____]               │
│                                            │
│                    [OK] [Cancel]           │
└────────────────────────────────────────────┘
```

---

## 📋 Example 1: Resistors with GND

After loading, you see:

```
    R1 ━━━━━━━━━ R2
         │
         │
        GND
```

Actual layout:
- **R1**: At position (100, 140), horizontal
- **R2**: At position (300, 140), horizontal
- **GND1**: At position (200, 240)
- **Wire 1**: Connects R1:pin2 to R2:pin1
- **Wire 2**: Connects R2:pin1 to GND1:GND

---

## 📋 Example 2: With Rotation

After loading, you see:

```
    R1 ━━━━━━━━┓
               ║ R2 (90°)
               ┣━━━━━━━━ R3
               ║
              GND
```

Actual layout:
- **R1**: Horizontal at top-left
- **R2**: Vertical (90° rotated) in middle
- **R3**: Horizontal at top-right
- **GND1**: At bottom-middle
- **3 wires** connecting them

---

## 🚫 Error Message (Loading Wrong File)

### If you try to load a SymbolDef:

```
┌──────────────────────────────────────────────┐
│  ❌ This is a Symbol Definition,            │
│     not a Schematic!                         │
│                                              │
│  Symbol ID: rect_test                        │
│                                              │
│  To use this symbol:                         │
│  1. Go to "🎨 Symbol Gallery" tab           │
│  2. Click "📂 Load Symbol" to import it     │
│  3. It will be added to your library         │
│  4. Return to "📐 Schematic Editor"         │
│     and place it using the Symbol Library    │
│     panel                                    │
│                                              │
│                    [OK]                      │
└──────────────────────────────────────────────┘
```

### Key Points:
- Clear ❌ icon indicates error
- Explains what the file actually is
- Shows the symbol ID
- Provides step-by-step instructions
- No scary stack traces!

---

## 🎨 Color Scheme

### Symbol Library Panel:
- **Background**: Dark gray (#1a1a1a)
- **Border**: Medium gray (#333)
- **Symbol Cards**: Darker gray (#252525)
- **Selected Card**: Blue tint (#2a4a5a)
- **Place Button**: Blue (#4a8aaa)
- **Text**: White / Light gray

### Status Messages:
- **Placement Mode**: Light blue (#4af)
- **Selected**: Default white
- **Wires**: Cyan (#0ff)

---

## 📱 Responsive Behavior

### Panel Width:
- Minimum: 200px
- Scrolls if many symbols
- Fixed position on right side

### Canvas:
- Flexible width (fills remaining space)
- Fixed height: 500px
- Grid: 20px spacing

---

## ⌨️ Keyboard Shortcuts

```
┌──────────────────────────────────┐
│  R        Rotate selected symbol │
│  ESC      Cancel placement mode  │
│           Cancel pending pin     │
└──────────────────────────────────┘
```

---

## 🔄 Interaction Flow

### Placing a Symbol:
1. **Click "Place"** → Placement mode ON
2. **Click Canvas** → Symbol appears
3. **Still in placement mode** → Can place more
4. **Press ESC** → Placement mode OFF

### Creating Wires:
1. **Click pin** → Pin selected (blue)
2. **Click another pin** → Wire created (cyan)
3. **Wire appears** → Connecting the two pins

### Loading Example:
1. **Click "📘 Examples"** → Dialog appears
2. **Enter number** → Example loads
3. **Success message** → "✓ Loaded: [name]"

---

## 🎉 Success Indicators

### You know it's working when:
- ✅ You see the Symbol Library panel on the right
- ✅ Clicking "Place" changes cursor to crosshair
- ✅ Status bar shows "🎯 Placing: [symbol]"
- ✅ Clicking canvas places the symbol
- ✅ Loading a SymbolDef shows friendly error
- ✅ "📘 Examples" button loads example circuits
- ✅ Examples show resistors and wires correctly

---

## 🐛 If Something's Wrong

### Library Panel Not Showing:
- Check browser console for errors
- Ensure `SymbolLibraryPanel.tsx` is imported
- Verify symbols are registered in `registry.ts`

### Place Button Not Working:
- Check if `handlePlaceSymbol` is called
- Verify `placementMode` state is updating
- Look for console errors

### Examples Not Loading:
- Check if JSON files exist in `fixtures/schematics/`
- Verify `fixturesIndex.ts` exports `schematicFixtures`
- Check JSON syntax is valid

---

## 📸 What Each Feature Looks Like

### Task 1: Library Panel
**Visual**: Vertical panel on right side listing all symbols with Place buttons

### Task 2: Type Detection
**Visual**: Alert dialog with friendly error message and instructions

### Task 3: Examples
**Visual**: Schematic with multiple resistors, GND symbol, and cyan wires connecting them

---

All features are now live! Start the app and explore! 🚀
