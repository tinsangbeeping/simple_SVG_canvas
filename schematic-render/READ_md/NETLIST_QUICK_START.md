# Quick Start: Circuit Netlist Export

## 5-Minute Tutorial

### Step 1: Build a Simple Circuit

In the schematic editor:
1. Place two resistors (R)
2. Place one GND symbol
3. Wire them together:
   - R1 pin 2 → R2 pin 1
   - R2 pin 2 → GND pin 1

```
  R1
   │
   ├──── R2
   │      │
  ...    GND
```

### Step 2: Export Netlist

1. Click the **🔌 Netlist** button
2. File `circuit.v1.json` will download

### Step 3: View the Output

```json
{
  "type": "circuit.v1",
  "components": [
    { "ref": "R1", "symbolId": "R" },
    { "ref": "R2", "symbolId": "R" },
    { "ref": "GND", "symbolId": "GND" }
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

## What Just Happened?

### Automatic Transformations

| Schematic Element | Circuit Element | Notes |
|-------------------|-----------------|-------|
| Instance `id: "i1"` | Component `ref: "R1"` | Auto-numbered |
| Instance `id: "i2"` | Component `ref: "R2"` | Auto-numbered |
| Instance `id: "gnd"` | Component `ref: "GND"` | Power symbols keep name |
| Wire R1→R2 | Net "NET1" | Auto-named |
| Wire R2→GND | Net "GND" | Named after power symbol |

### Component Refs Generated

The system automatically generates standard reference designators:

```
R instances  → R1, R2, R3, ...
C instances  → C1, C2, C3, ...
U instances  → U1, U2, U3, ...
GND/VCC/VDD  → Keep original name
```

### Net Names Generated

Nets are named intelligently:

```
Contains GND?     → Name: "GND"
Contains VCC?     → Name: "VCC"  
Contains VDD?     → Name: "VDD"
Otherwise?        → Name: "NET1", "NET2", ...
```

## Real-World Example: Voltage Divider

### Circuit Design

```
     VCC (5V)
       │
      ┌┴┐
      │ │ R1 (10kΩ)
      └┬┘
       │ ← Vout (2.5V)
      ┌┴┐
      │ │ R2 (10kΩ)
      └┬┘
       │
      GND
```

### Schematic Steps

1. Place VCC symbol
2. Place R1 resistor
3. Place R2 resistor  
4. Place GND symbol
5. Wire: VCC → R1 pin 1
6. Wire: R1 pin 2 → R2 pin 1 (this is Vout node)
7. Wire: R2 pin 2 → GND

### Exported Netlist

```json
{
  "type": "circuit.v1",
  "components": [
    { "ref": "VCC", "symbolId": "VCC" },
    { "ref": "R1", "symbolId": "R" },
    { "ref": "R2", "symbolId": "R" },
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

### Analysis

- **3 nets**: VCC (power), NET1 (signal), GND (power)
- **4 components**: 2 resistors + 2 power symbols
- **Vout node**: NET1 (connection between R1 and R2)

## Next Steps

### For Designers

1. ✅ **Design** your schematic visually
2. ✅ **Export** both formats:
   - `schematic.v1.json` (geometry, for editing)
   - `circuit.v1.json` (netlist, for manufacturing)
3. ✅ **Use** netlist for:
   - PCB layout tools
   - SPICE simulation
   - Bill of Materials
   - Design verification

### For Developers

1. **Read** the netlist in your tool:
   ```typescript
   import circuitData from './circuit.v1.json'
   
   // Access components
   circuitData.components.forEach(comp => {
     console.log(`${comp.ref}: ${comp.symbolId}`)
   })
   
   // Access nets
   circuitData.nets.forEach(net => {
     console.log(`Net ${net.name}:`)
     net.nodes.forEach(node => {
       console.log(`  - ${node.ref}.${node.pin}`)
     })
   })
   ```

2. **Validate** the circuit:
   ```typescript
   // Check all components have valid refs
   const refs = new Set(circuitData.components.map(c => c.ref))
   
   // Check all net nodes reference valid components
   for (const net of circuitData.nets) {
     for (const node of net.nodes) {
       if (!refs.has(node.ref)) {
         throw new Error(`Invalid ref: ${node.ref}`)
       }
     }
   }
   ```

3. **Transform** to other formats:
   ```typescript
   // Generate SPICE netlist
   function toSPICE(circuit: CircuitDoc): string {
     let spice = ''
     circuit.nets.forEach(net => {
       // ... generate SPICE lines
     })
     return spice
   }
   ```

## Troubleshooting

### Q: Why are some pins not in any net?

**A**: Unconnected pins are intentionally excluded from the netlist. Only connected components (≥2 nodes) form nets.

### Q: Can I customize component refs?

**A**: Not yet in UI, but you can edit the JSON file manually. Future versions will support ref editing in the UI.

### Q: How do I add component values (10k, 100nF)?

**A**: Currently not supported in UI. You can manually add `"value"` fields to the JSON:
```json
{ "ref": "R1", "symbolId": "R", "value": "10k" }
```

### Q: What if I have multiple circuits?

**A**: Each schematic exports one netlist. For hierarchical designs, export each subcircuit separately and combine manually.

## Summary

✅ **Zero Learning Curve**: Just click 🔌 Netlist button  
✅ **No Configuration**: Everything is automatic  
✅ **Standard Format**: tscircuit-compatible JSON  
✅ **Non-Destructive**: Original schematic unchanged  
✅ **Production Ready**: Use immediately for PCB/BOM/SPICE

**Try it now**: Load an example, click 🔌 Netlist, see the magic! ✨
