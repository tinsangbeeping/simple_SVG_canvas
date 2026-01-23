# tscircuit Circuit JSON Compatibility

## Overview

Our Tag/NetLabel implementation now outputs **tscircuit-compatible Circuit JSON** format, making it interoperable with the tscircuit ecosystem.

## Circuit JSON Format

### Basic Structure

```json
{
  "type": "circuit.v1",
  "version": "1.0",
  "components": [...],
  "nets": [...],
  "metadata": {
    "exporter": "schematic-render-canvas",
    "exportDate": "2026-01-23T08:20:00.000Z",
    "schematicVersion": 1
  }
}
```

### Components Array

Each component includes:

```json
{
  "ref": "TAG1",
  "symbolId": "Tag",
  "net": "SCL",
  "schematic_net_label": "SCL"
}
```

**Properties:**
- `ref` - Component reference designator (R1, C1, TAG1, etc.)
- `symbolId` - Symbol identifier from library
- `value` - Component value (optional)
- `footprint` - PCB footprint (optional)
- `net` - **NetLabel: declared net name** (for Tag components)
- `schematic_net_label` - Alternative tscircuit-style property

### Nets Array

Each net includes all connected pins:

```json
{
  "name": "SCL",
  "nodes": [
    { "ref": "R1", "pin": "1" },
    { "ref": "TAG1", "pin": "TAG" },
    { "ref": "TAG2", "pin": "TAG" },
    { "ref": "U1", "pin": "PA0" }
  ]
}
```

**Net Naming Priority:**
1. **Tag name** (explicit user label) - highest priority
2. **Power symbol** (GND, VCC, VDD)
3. **Auto-generated** (NET1, NET2, etc.)

## tscircuit NetLabel Compatibility

### What is a NetLabel?

In tscircuit, a `<netlabel />` is a component that:
- Declares a net name at a specific point
- Connects all points with the same net name
- Used for clean schematics without long wires

### Our Implementation

Our **Tag** component maps to tscircuit's netlabel:

| tscircuit | Our Implementation |
|-----------|-------------------|
| `<netlabel net="SCL" />` | Tag component with `tag="SCL"` |
| Rendered label | Green text above symbol |
| Net grouping | Union-Find algorithm |
| Circuit JSON | `net` and `schematic_net_label` properties |

### Example Comparison

**tscircuit TSX:**
```tsx
<chip name="U1" footprint="SOIC8" />
<netlabel net="SCL" />
<resistor name="R1" resistance="4.7k" />
<netlabel net="SCL" />
```

**Our Schematic:**
1. Place MCU (U1)
2. Place Tag → name "SCL" → connect to U1 pin
3. Place Resistor (R1)
4. Place Tag → name "SCL" → connect to R1 pin
5. Export Circuit JSON

**Resulting Circuit JSON (both produce similar):**
```json
{
  "type": "circuit.v1",
  "components": [
    { "ref": "U1", "symbolId": "MCU" },
    { "ref": "TAG1", "symbolId": "Tag", "net": "SCL", "schematic_net_label": "SCL" },
    { "ref": "R1", "symbolId": "resistor" },
    { "ref": "TAG2", "symbolId": "Tag", "net": "SCL", "schematic_net_label": "SCL" }
  ],
  "nets": [
    {
      "name": "SCL",
      "nodes": [
        { "ref": "U1", "pin": "PA0" },
        { "ref": "TAG1", "pin": "TAG" },
        { "ref": "TAG2", "pin": "TAG" },
        { "ref": "R1", "pin": "1" }
      ]
    }
  ]
}
```

## Built-in Elements Tracing

### tscircuit Built-in Components

From [tscircuit docs](https://docs.tscircuit.com/category/built-in-elements/):

| tscircuit Element | Our Symbol | Circuit JSON Output |
|-------------------|------------|---------------------|
| `<resistor />` | `resistor` | `ref: "R1", symbolId: "resistor"` |
| `<capacitor />` | `capacitor` | `ref: "C1", symbolId: "capacitor"` |
| `<diode />` | `diode` | `ref: "D1", symbolId: "diode"` |
| `<led />` | `led` | `ref: "LED1", symbolId: "led"` |
| `<chip />` | `mcu`, `opamp`, etc. | `ref: "U1", symbolId: "mcu"` |
| `<netlabel />` | `Tag` | `ref: "TAG1", symbolId: "Tag", net: "SCL"` |
| `<ground />` | `GND` | `ref: "GND", symbolId: "GND"` |

### Net Name Semantics

**tscircuit approach:**
- Nets automatically named by power symbols or netlabels
- `<netlabel net="SCL" />` forces net name

**Our approach (compatible):**
- Same priority system
- Tag components declare net names
- Power symbols (GND, VCC) also influence names
- Auto-numbered fallback (NET1, NET2...)

## Export Format Examples

### Example 1: Simple I²C Bus

**Schematic:**
- MCU with SDA/SCL pins
- Pull-up resistors R1, R2
- Tags: "SDA", "SCL"

**Circuit JSON:**
```json
{
  "type": "circuit.v1",
  "version": "1.0",
  "components": [
    { "ref": "U1", "symbolId": "MCU" },
    { "ref": "R1", "symbolId": "resistor" },
    { "ref": "R2", "symbolId": "resistor" },
    { "ref": "TAG1", "symbolId": "Tag", "net": "SDA", "schematic_net_label": "SDA" },
    { "ref": "TAG2", "symbolId": "Tag", "net": "SDA", "schematic_net_label": "SDA" },
    { "ref": "TAG3", "symbolId": "Tag", "net": "SCL", "schematic_net_label": "SCL" },
    { "ref": "TAG4", "symbolId": "Tag", "net": "SCL", "schematic_net_label": "SCL" }
  ],
  "nets": [
    {
      "name": "SDA",
      "nodes": [
        { "ref": "U1", "pin": "PA0" },
        { "ref": "TAG1", "pin": "TAG" },
        { "ref": "R1", "pin": "1" },
        { "ref": "TAG2", "pin": "TAG" }
      ]
    },
    {
      "name": "SCL",
      "nodes": [
        { "ref": "U1", "pin": "PA1" },
        { "ref": "TAG3", "pin": "TAG" },
        { "ref": "R2", "pin": "1" },
        { "ref": "TAG4", "pin": "TAG" }
      ]
    }
  ],
  "metadata": {
    "exporter": "schematic-render-canvas",
    "exportDate": "2026-01-23T08:20:00.000Z",
    "schematicVersion": 1
  }
}
```

### Example 2: Power Distribution

**Schematic:**
- VCC symbol
- Multiple capacitors
- Tags: "VCC", "GND"

**Circuit JSON:**
```json
{
  "type": "circuit.v1",
  "components": [
    { "ref": "VCC", "symbolId": "VCC" },
    { "ref": "GND", "symbolId": "GND" },
    { "ref": "C1", "symbolId": "capacitor" },
    { "ref": "C2", "symbolId": "capacitor" },
    { "ref": "TAG1", "symbolId": "Tag", "net": "VCC", "schematic_net_label": "VCC" }
  ],
  "nets": [
    {
      "name": "VCC",
      "nodes": [
        { "ref": "VCC", "pin": "VCC" },
        { "ref": "TAG1", "pin": "TAG" },
        { "ref": "C1", "pin": "1" },
        { "ref": "C2", "pin": "1" }
      ]
    },
    {
      "name": "GND",
      "nodes": [
        { "ref": "GND", "pin": "GND" },
        { "ref": "C1", "pin": "2" },
        { "ref": "C2", "pin": "2" }
      ]
    }
  ]
}
```

## Interoperability Notes

### What Works

✅ **Tag/NetLabel semantics** - Fully compatible  
✅ **Net naming** - Same priority rules  
✅ **Component references** - Standard designators (R1, C1, U1)  
✅ **Net grouping** - All tags with same name merge  
✅ **JSON structure** - tscircuit-parseable format  

### Differences

⚠️ **Visual representation** - Our canvas vs tscircuit's layout engine  
⚠️ **Component properties** - We use `symbolId`, tscircuit uses element types  
⚠️ **Coordinate system** - Different schematic positioning  

### Import/Export Flow

```
[Our Schematic]
    ↓ (Export Circuit JSON)
[circuit.v1.json]
    ↓ (Compatible format)
[tscircuit tools]
    ↓ (PCB layout, simulation, etc.)
[Manufacturing files]
```

## Usage Recommendations

### For tscircuit Compatibility

1. **Use meaningful tag names**: Match tscircuit conventions (SCL, SDA, MISO, MOSI, etc.)
2. **Export Circuit JSON**: Use "🔌 Circuit JSON" button
3. **Include metadata**: Automatic in export
4. **Test with tscircuit tools**: Validate compatibility

### Common Tag Names

Standard names from tscircuit ecosystem:

**I²C:**
- SDA (Serial Data)
- SCL (Serial Clock)

**SPI:**
- MOSI (Master Out Slave In)
- MISO (Master In Slave Out)
- SCK (Serial Clock)
- CS (Chip Select)

**UART:**
- TX (Transmit)
- RX (Receive)
- RTS (Request To Send)
- CTS (Clear To Send)

**Power:**
- VCC (Voltage Common Collector)
- GND (Ground)
- VDD (Voltage Drain Drain)
- VBUS (USB Bus Voltage)
- 3V3 (3.3V supply)
- 5V (5V supply)

**Signals:**
- CLK (Clock)
- RST (Reset)
- EN (Enable)
- INT (Interrupt)
- CS (Chip Select)

## Validation

### Check Circuit JSON Output

After exporting, verify:

1. **Tag components present**: Each Tag has `net` property
2. **Net names match**: Nets use tag names when available
3. **Metadata included**: Exporter info present
4. **Valid JSON**: Can be parsed by standard tools

### Example Validation

```bash
# Export circuit.v1.json from app
# Then check with jq
cat circuit.v1.json | jq '.components[] | select(.symbolId == "Tag")'
```

Expected output:
```json
{
  "ref": "TAG1",
  "symbolId": "Tag",
  "net": "SCL",
  "schematic_net_label": "SCL"
}
```

## Future Enhancements

### Short-term
- [ ] Add more tscircuit element types (transistor, mosfet, etc.)
- [ ] Support component properties (value, footprint)
- [ ] Add schematic positioning to circuit.json

### Medium-term
- [ ] Import tscircuit circuit.json
- [ ] Bidirectional conversion
- [ ] Full tscircuit API compatibility

### Long-term
- [ ] PCB layout export
- [ ] SPICE netlist generation
- [ ] Manufacturing file output (Gerbers, BOM, etc.)

## References

- [tscircuit Documentation](https://docs.tscircuit.com/)
- [tscircuit NetLabel Element](https://docs.tscircuit.com/elements/netlabel/)
- [tscircuit Built-in Elements](https://docs.tscircuit.com/category/built-in-elements/)
- [Our Tag Implementation](TAG_IMPLEMENTATION.md)
- [Circuit JSON Export Guide](READ_md/NETLIST_EXPORT_GUIDE.md)
