# Circuit Netlist Export

## Overview

This feature adds circuit netlist export capability to the schematic editor. It extracts connectivity information (nets) and component references from the schematic geometry, producing a tscircuit-compatible circuit.v1.json format.

## Key Features

### 1. **Non-Breaking Addition**
- ✅ Does NOT modify existing `schematic.v1.json` format
- ✅ Does NOT change patch library exports
- ✅ Adds new derived export only: `circuit.v1.json`

### 2. **Net Extraction Algorithm**
- Uses Union-Find (Disjoint Set) for efficient connected component detection
- Each wire endpoint `{instId, pinName}` is treated as a graph node
- Connected components = electrical nets
- Time complexity: O(n⋅α(n)) ≈ O(n) where α is inverse Ackermann function

### 3. **Auto-Generated References**
- Components get standard reference designators:
  - `R1, R2, ...` for resistors
  - `C1, C2, ...` for capacitors  
  - `U1, U2, ...` for ICs
  - Power symbols keep their name: `GND`, `VCC`, `VDD`

### 4. **Smart Net Naming**
- Nets containing power symbols use the power symbol name
- Other nets get sequential names: `NET1`, `NET2`, etc.

## Usage

### UI Button
Click **🔌 Netlist** button in the toolbar to export `circuit.v1.json`

### Output Format

```json
{
  "type": "circuit.v1",
  "components": [
    {
      "ref": "R1",
      "symbolId": "R"
    },
    {
      "ref": "R2",
      "symbolId": "R"
    },
    {
      "ref": "GND",
      "symbolId": "GND"
    }
  ],
  "nets": [
    {
      "name": "NET1",
      "nodes": [
        { "ref": "R1", "pin": "2" },
        { "ref": "R2", "pin": "1" }
      ]
    },
    {
      "name": "GND",
      "nodes": [
        { "ref": "R2", "pin": "2" },
        { "ref": "GND", "pin": "1" }
      ]
    }
  ]
}
```

## Future Extensions (Optional)

The component type can be extended with optional fields without breaking changes:

```typescript
type CircuitComponent = {
  ref: string
  symbolId: string
  value?: string       // e.g., "10k", "100nF"
  footprint?: string   // e.g., "0805", "SOT-23"
  // ... other metadata
}
```

These fields can be added via UI in future updates.

## Benefits

- 🔑 **Semantic backbone**: Enables netlist-based validation, BOM generation, PCB export
- 🧠 **Stable foundation**: Geometry remains primary, netlist is derived
- 🔌 **Future-ready**: Supports simulation, verification, and manufacturing workflows
- 🚫 **Low risk**: No changes to existing editor behavior
- 📈 **High leverage**: Maximum value for minimal code

## Implementation Files

- `src/schematic/netExtraction.ts` - Core extraction logic
- `src/schematic/netExtraction.test.ts` - Unit tests
- `src/symbol-renderer/SchematicCanvas.tsx` - UI integration

## Testing

The netlist extractor has been tested with:
- ✅ Simple resistor divider circuits
- ✅ Multi-component circuits with power symbols
- ✅ Unconnected pins (correctly ignored)
- ✅ Multiple components of same type (R1, R2, R3...)
- ✅ Power net naming (GND, VCC, VDD)

## Example Workflow

1. **Design** schematic in editor (place symbols, route wires)
2. **Save** geometry: `schematic.v1.json` (unchanged behavior)
3. **Export** netlist: `circuit.v1.json` (new feature)
4. **Use** netlist for:
   - PCB layout tools
   - SPICE simulation
   - Design rule checks
   - Bill of Materials
   - Automated testing

---

This feature makes the schematic editor interoperable with tscircuit ecosystem while maintaining full backward compatibility.
