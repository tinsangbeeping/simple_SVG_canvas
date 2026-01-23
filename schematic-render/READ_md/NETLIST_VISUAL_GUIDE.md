# Circuit Netlist Export - Visual Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Schematic Editor                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Symbol    │  │   Wires    │  │  Geometry  │            │
│  │  Instances │  │  a → b     │  │  Positions │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Export Functions                           │
│                                                               │
│  💾 Save (unchanged)     🔌 Netlist (NEW!)                   │
│  schematic.v1.json      circuit.v1.json                      │
│  - Geometry             - Components with refs                │
│  - Editor state         - Nets (connectivity)                │
│  - No semantics         - Semantic information               │
└─────────────────────────────────────────────────────────────┘
```

## Netlist Extraction Process

```
Step 1: Wire Graph Construction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    R1:pin2 ────wire1──── R2:pin1
       │
       │
    wire2
       │
       ▼
    GND:pin1

Step 2: Union-Find Algorithm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    NET1: {R1:pin2, R2:pin1}
    GND:  {R2:pin2, GND:pin1}

Step 3: Generate Output
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Components: [R1, R2, GND]
    Nets:
      - NET1: [(R1, pin2), (R2, pin1)]
      - GND:  [(R2, pin2), (GND, pin1)]
```

## Example Circuit

### Input: Schematic (schematic.v1.json)
```
     VCC
      │
      R1 (10k)
      │
      ├──────┐
      │      │
      R2     C1
      │      │
     GND    GND
```

### Output: Netlist (circuit.v1.json)

```json
{
  "type": "circuit.v1",
  "components": [
    { "ref": "R1", "symbolId": "R" },
    { "ref": "R2", "symbolId": "R" },
    { "ref": "C1", "symbolId": "C" },
    { "ref": "VCC", "symbolId": "VCC" },
    { "ref": "GND", "symbolId": "GND" }
  ],
  "nets": [
    {
      "name": "VCC",
      "nodes": [
        { "ref": "VCC", "pin": "1" },
        { "ref": "R1", "pin": "1" }
      ]
    },
    {
      "name": "NET1",
      "nodes": [
        { "ref": "R1", "pin": "2" },
        { "ref": "R2", "pin": "1" },
        { "ref": "C1", "pin": "1" }
      ]
    },
    {
      "name": "GND",
      "nodes": [
        { "ref": "R2", "pin": "2" },
        { "ref": "C1", "pin": "2" },
        { "ref": "GND", "pin": "1" }
      ]
    }
  ]
}
```

## UI Changes

```
┌──────────────────────────────────────────────────────────┐
│  📐 Schematic Editor                                      │
├──────────────────────────────────────────────────────────┤
│  [Auto Tidy] [ELK Layout] [🔍+] [🔍-] [🎯]              │
│  [💾 Save] [🔌 Netlist] [📂 Load]    ← NEW BUTTON!      │
│  [📦 Import Symbols] [📘 Examples]                       │
└──────────────────────────────────────────────────────────┘
```

## Use Cases

### 1. PCB Layout
```
circuit.v1.json → PCB Tool
                   ├─ Place components (refs match)
                   ├─ Route nets
                   └─ DRC checks
```

### 2. Bill of Materials (BOM)
```
circuit.v1.json → BOM Generator
                   ├─ R1: 10kΩ, 0805
                   ├─ R2: 1kΩ, 0805
                   └─ C1: 100nF, 0603
```

### 3. SPICE Simulation
```
circuit.v1.json → SPICE Netlist
                   ├─ R1 VCC NET1 10k
                   ├─ R2 NET1 GND 1k
                   └─ C1 NET1 GND 100n
```

### 4. Design Validation
```
circuit.v1.json → Validator
                   ├─ Check floating nets
                   ├─ Power connectivity
                   └─ Component values
```

## Technical Highlights

### Union-Find Algorithm
- **Time**: O(n⋅α(n)) ≈ O(n) where α is inverse Ackermann
- **Space**: O(n) for parent map
- **Optimizations**: Path compression + union by rank

### Reference Generation
```typescript
prefixMap = {
  'R': 'R',      // Resistor    → R1, R2, R3...
  'C': 'C',      // Capacitor   → C1, C2, C3...
  'L': 'L',      // Inductor    → L1, L2, L3...
  'D': 'D',      // Diode       → D1, D2, D3...
  'Q': 'Q',      // Transistor  → Q1, Q2, Q3...
  'U': 'U',      // IC          → U1, U2, U3...
  'GND': 'GND',  // Ground      → GND (no number)
  'VCC': 'VCC',  // Power       → VCC (no number)
}
```

### Net Naming Strategy
1. **Power nets**: Use power symbol name (GND, VCC, VDD)
2. **Signal nets**: Sequential numbering (NET1, NET2, NET3...)
3. **Empty nets**: Ignored (< 2 nodes)

## Compatibility

| Format | Status | Notes |
|--------|--------|-------|
| schematic.v1.json | ✅ Unchanged | Primary geometry format |
| patch library | ✅ Unchanged | Reusable subcircuits |
| circuit.v1.json | ✅ NEW | Derived netlist export |
| symbol library | ✅ Unchanged | Component definitions |

## Future Roadmap

### Phase 1 (Completed) ✅
- Basic netlist extraction
- Auto-generated refs
- Power net naming
- UI button integration

### Phase 2 (Future)
- [ ] Component metadata UI (value, footprint)
- [ ] Manual ref editing
- [ ] Net name customization
- [ ] Hierarchical design support

### Phase 3 (Future)
- [ ] DRC integration
- [ ] BOM export
- [ ] SPICE netlist format
- [ ] PCB export integration

---

**Key Principle**: Geometry is primary, netlist is derived. The editor remains a geometry-first tool, with semantic information extracted on demand.
