# TSX Schematic Editor - Advanced Features Guide

## 🎯 Quick Start

### Basic Workflow
1. **Place Components**: Drag from left catalog to canvas
2. **Connect Pins**: Move cursor near pin → it highlights → click to start wire → hover over another pin → click to complete
3. **Edit Properties**: Click component to select, edit in right panel
4. **Multi-Select**: Hold Ctrl/Cmd and click multiple components
5. **Export**: Use "Export as Component" to create reusable subcircuits

---

## 🆕 Advanced Features

### 1. Smart Pin Connection (No Mode Toggle!)
- **Auto-Detection**: Move cursor near any pin (within 15px)
- **Visual Feedback**: 
  - Pin enlarges and turns blue when near
  - Cursor changes to crosshair
- **Click to Connect**: 
  - First click: Select starting pin (turns yellow)
  - Second click: Select ending pin → wire created
  - Click same component: Cancel wiring

### 2. Intelligent Wire Routing
- **Orthogonal Routing**: Wires automatically route at right angles
- **Visual Style**: 
  - Blue solid lines for completed wires
  - Yellow dashed lines for preview while hovering
  - Connection dots at pin endpoints
- **Live Preview**: See wire path while hovering over potential endpoint

### 3. Multi-Component Selection
- **Ctrl/Cmd + Click**: Toggle selection of components
- **Group Operations**: 
  - Move all selected components together
  - Delete multiple components at once
  - Create subcircuit from selection
- **Visual Feedback**: Blue border and glow on selected components

### 4. Subcircuit Creation 🎨

#### From Selection
1. Select multiple components (Ctrl+Click)
2. Click "Create Subcircuit" in properties panel
3. Name your subcircuit
4. Result: Saved to `lib/patches/YourName.tsx`

#### Example Output
```tsx
export function LEDCircuit(props: { schX?: number; schY?: number }) {
  return (
    <subcircuit name="ledcircuit" schX={props.schX} schY={props.schY}>
      <resistor name="R1" resistance="330" schX={0} schY={0} />
      <led name="LED1" color="red" schX={60} schY={0} />
      <trace from=".R1 > .pin2" to=".LED1 > .anode" />
    </subcircuit>
  )
}
```

### 5. Component Export System 📦

#### Export as Reusable Component
1. Build your circuit
2. Click "Export as Component" in header
3. Name your component
4. Downloads as `.tsx` file

#### Export Format
The exported file includes:
- Proper TypeScript types
- Subcircuit wrapper
- All components and wires
- Usage example

#### Use Like tscircuit Components
```tsx
import { LEDCircuit } from './LEDCircuit'

// Use in your circuit
<board width="50mm" height="50mm">
  <LEDCircuit schX={10} schY={20} />
</board>
```

---

## 🎨 UI/UX Improvements

### Dynamic Cursor Feedback
- **Default**: Arrow cursor
- **Near Pin**: Crosshair cursor
- **Dragging**: Grabbing hand
- **Wiring Active**: Crosshair with yellow pin highlight

### Status Bar
Bottom bar shows contextual information:
- Current action (wiring, editing, etc.)
- Selection count
- Component and wire statistics
- Helpful tips

### Component Labels
- Shows component name and value
- Color changes when selected (blue)
- Position adjusts to avoid overlap

---

## 🔧 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl/Cmd + Click** | Toggle component selection |
| **Click on canvas** | Clear selection |
| **Escape** (planned) | Cancel wiring |
| **Delete** (planned) | Delete selected |

---

## 📋 Export Formats

### 1. Export Circuit
- Exports `main.tsx` with current board layout
- Includes all components and traces
- Ready to use with tscircuit CLI

### 2. Export as Component
- Wraps circuit in reusable function
- Adds proper TypeScript interface
- Can be imported into other projects

### 3. Create Subcircuit (Multi-select)
- Saves to project's `lib/patches/` folder
- Extracts selected components and their wires
- Maintains relative positioning

---

## 🎯 Real-World Examples

### Example 1: LED Indicator
```tsx
// Created in editor, exported as component
export function LEDIndicator(props: { 
  resistance?: string
  color?: string 
}) {
  return (
    <subcircuit name="led_indicator">
      <resistor name="R1" resistance={props.resistance || "330"} />
      <led name="LED1" color={props.color || "red"} />
      <trace from=".R1 > .pin2" to=".LED1 > .anode" />
      <trace from=".LED1 > .cathode" to="net.GND" />
    </subcircuit>
  )
}
```

### Example 2: Voltage Regulator Module
```tsx
export function VoltageRegulator(props: { schX?: number; schY?: number }) {
  return (
    <subcircuit name="voltage_regulator" schX={props.schX} schY={props.schY}>
      <chip name="U1" manufacturerPartNumber="LM7805" />
      <capacitor name="C1" capacitance="100uF" />
      <capacitor name="C2" capacitance="10uF" />
      <trace from=".C1 > .pin1" to=".U1 > .VIN" />
      <trace from=".C2 > .pin1" to=".U1 > .VOUT" />
      <trace from=".U1 > .GND" to="net.GND" />
    </subcircuit>
  )
}
```

---

## 🚀 Comparison with tscircuit.com Examples

### Your Editor vs tscircuit.com/editor

| Feature | Your Editor | tscircuit.com |
|---------|-------------|---------------|
| **Visual Symbol Drawing** | ✅ Schematic symbols | ✅ Schematic view |
| **Pin-to-Pin Wiring** | ✅ Visual + TSX | ✅ TSX only |
| **Drag & Drop** | ✅ Component placement | ❌ Code only |
| **Multi-Select** | ✅ Ctrl+Click | ❌ |
| **Smart Cursor** | ✅ Auto-detect pins | ❌ |
| **Export as Component** | ✅ One-click export | ✅ Manual export |
| **Subcircuit Creation** | ✅ From selection | ✅ Manual |
| **Orthogonal Wiring** | ✅ Auto-routing | ❌ |

### Benefits of Your Editor
1. **Visual First**: See circuit symbols while designing
2. **Intuitive Wiring**: No mode switching, cursor adapts automatically
3. **Component Reuse**: Easy subcircuit creation and export
4. **Multi-Select**: Group operations for faster workflow
5. **Better Routing**: Orthogonal wires look professional

---

## 💡 Best Practices

### Organizing Your Circuit
1. **Group Related Components**: Use multi-select → Create Subcircuit
2. **Name Meaningfully**: Use clear names like `PowerSupply`, `LEDArray`
3. **Modular Design**: Export reusable sections as components
4. **Test Wiring**: Verify connections in wiring panel before export

### Creating Reusable Components
1. **Start Simple**: Build and test basic circuit first
2. **Add Parameters**: Export with configurable props
3. **Document Usage**: Add comments in exported file
4. **Share**: Upload to npm or GitHub for reuse

---

## 🔮 Future Enhancements (Potential)

- [ ] Net labels visualization
- [ ] Auto-arrange components
- [ ] Undo/Redo
- [ ] Component library import
- [ ] Live schematic preview
- [ ] PCB layout export
- [ ] Simulation integration
- [ ] Collaborative editing
- [ ] Cloud save/load

---

## 📚 Resources

- [tscircuit Documentation](https://docs.tscircuit.com)
- [Example Components](https://tscircuit.com/explore)
- [Red LED Example](https://tscircuit.com/seveibar/red-led)
- [USB-C Flashlight Example](https://tscircuit.com/editor?template=usb-c-led-flashlight)

---

Built with ❤️ for the tscircuit community
