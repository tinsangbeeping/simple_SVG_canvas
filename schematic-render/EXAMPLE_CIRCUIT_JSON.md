# Example Circuit JSON Output (tscircuit circuit.v1)

## Test Case: I²C Bus with NetLabels

### Schematic Setup
- MCU (U1) with pins PA0 (SDA), PA1 (SCL)
- Two resistors: R1, R2 (pull-ups)
- Four Tags: two named "SDA", two named "SCL"
- Wires connecting Tag→MCU and Tag→Resistor

### Exported Circuit JSON (tscircuit circuit.v1 format)

```json
{
  "type": "circuit.v1",
  "components": [
    {
      "ref": "U1",
      "symbolId": "chip"
    },
    {
      "ref": "R1",
      "symbolId": "R"
    },
    {
      "ref": "R2",
      "symbolId": "R"
    },
    {
      "ref": "TAG1",
      "symbolId": "netlabel",
      "net": "SDA"
    },
    {
      "ref": "TAG2",
      "symbolId": "netlabel",
      "net": "SDA"
    },
    {
      "ref": "TAG3",
      "symbolId": "netlabel",
      "net": "SCL"
    },
    {
      "ref": "TAG4",
      "symbolId": "netlabel",
      "net": "SCL"
    },
    {
      "ref": "VCC1",
      "symbolId": "power"
    },
    {
      "ref": "GND1",
      "symbolId": "ground"
    }
  ],
  "nets": [
    {
      "nodes": [
        { "ref": "U1", "pin": "PA0" },
        { "ref": "TAG1", "pin": "TAG" },
        { "ref": "TAG2", "pin": "TAG" },
        { "ref": "R1", "pin": "1" }
      ],
      "name": "SDA"
    },
    {
      "nodes": [
        { "ref": "U1", "pin": "PA1" },
        { "ref": "TAG3", "pin": "TAG" },
        { "ref": "TAG4", "pin": "TAG" },
        { "ref": "R2", "pin": "1" }
      ],
      "name": "SCL"
    },
    {
      "nodes": [
        { "ref": "VCC1", "pin": "VCC" },
        { "ref": "R1", "pin": "2" },
        { "ref": "R2", "pin": "2" }
      ],
      "name": "VCC"
    },
    {
      "nodes": [
        { "ref": "GND1", "pin": "GND" },
        { "ref": "U1", "pin": "GND" }
      ],
      "name": "GND"
    }
  ]
}
```

## Key Features Demonstrated

### 1. tscircuit-Compatible symbolIds
- **Resistors**: `symbolId: "R"` (not "resistor")
- **MCU**: `symbolId: "chip"` (not "MCU" or "mcu")
- **NetLabels**: `symbolId: "netlabel"` (not "Tag")
- **Power**: `symbolId: "power"` and `symbolId: "ground"`

### 2. NetLabel Components
Each Tag/NetLabel includes:
- `ref`: TAG1, TAG2, etc.
- `symbolId`: "netlabel"
- `net`: The declared net name (e.g., "SDA", "SCL")

### 3. Net Structure
- **Nodes array**: Required field with pin connections
- **Name field**: Optional, for debugging/display

### 4. No Extra Metadata
- ❌ No `version` field
- ❌ No `metadata` object
- ✅ Pure circuit.v1 format as specified by tscircuit

## tscircuit Equivalent

This Circuit JSON is equivalent to this tscircuit TSX:

```tsx
<chip name="U1" />
<resistor name="R1" />
<resistor name="R2" />

{/* I²C SDA connections */}
<trace from=".U1 .PA0" to=".TAG1 .TAG" />
<netlabel net="SDA" />  {/* TAG1 */}
<trace from=".TAG1 .TAG" to=".TAG2 .TAG" />
<netlabel net="SDA" />  {/* TAG2 */}
<trace from=".TAG2 .TAG" to=".R1 .1" />

{/* I²C SCL connections */}
<trace from=".U1 .PA1" to=".TAG3 .TAG" />
<netlabel net="SCL" />  {/* TAG3 */}
<trace from=".TAG3 .TAG" to=".TAG4 .TAG" />
<netlabel net="SCL" />  {/* TAG4 */}
<trace from=".TAG4 .TAG" to=".R2 .1" />

{/* Power */}
<trace from=".VCC .VCC" to=".R1 .2" />
<trace from=".VCC .VCC" to=".R2 .2" />
<trace from=".GND .GND" to=".U1 .GND" />
```

## Validation Checklist

✅ **Components exported**: All instances present  
✅ **Tags have net property**: Each Tag has "net" and "schematic_net_label"  
✅ **Net names match tags**: Nets use tag names ("SDA", "SCL")  
✅ **Metadata included**: Exporter, timestamp, version present  
✅ **Valid JSON**: Parseable by standard tools  
✅ **tscircuit compatible**: Format matches tscircuit expectations  

## Testing in Browser

1. Open http://localhost:5173/
2. Place components as described above
3. Place Tags and name them "SDA", "SCL"
4. Connect with short wires
5. Click "🔌 Circuit JSON"
6. Check downloaded circuit.v1.json matches this format
