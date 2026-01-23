# Core Symbols Guide

## Overview

The symbol library now includes **24 built-in core symbols** that are always available and cannot be deleted. These are generic, semantic components suitable for most schematic designs.

## What Changed

### Before
- Only 2 built-in symbols: `R` (resistor) and `GND`
- All other symbols must be imported

### After
- 24 core symbols spanning:
  - **Passives**: resistor, capacitor, inductor
  - **Diodes**: diode, zener_diode, led
  - **Transistors**: transistor_npn, transistor_pnp, mosfet_n, mosfet_p
  - **ICs**: opamp, comparator, buffer, voltage regulators, NE555, MCU
  - **Connectors**: usb_c, pin headers
  - **Power**: GND, VCC

## UI Changes

### Symbol Library Panel (Right Side)

The library is now organized into **three sections**:

1. **🕒 Recent** (if applicable)
   - Last 5 used symbols for quick access

2. **🔧 Core Symbols**
   - 24 built-in symbols
   - Marked with blue "CORE" badge
   - Cannot be deleted
   - Always available

3. **📦 Imported Symbols**
   - Custom symbols from KiCad JSON imports
   - Can be deleted individually or in bulk
   - Vendor-specific components

### Visual Indicators

- **Core symbols**: Blue section header, "CORE" badge
- **Imported symbols**: Purple section header, no badge
- **Selected symbol**: Blue highlight border

## Core Symbol List

### Passives (3)
- `resistor` - 2-terminal resistor (pins: 1, 2)
- `capacitor` - 2-terminal capacitor (pins: 1, 2)
- `inductor` - 2-terminal inductor (pins: 1, 2)

### Diodes (3)
- `diode` - Standard diode (pins: A, K)
- `zener_diode` - Zener diode (pins: A, K)
- `led` - LED with arrow (pins: A, K)

### Transistors (4)
- `transistor_npn` - NPN BJT (pins: B, C, E)
- `transistor_pnp` - PNP BJT (pins: B, C, E)
- `mosfet_n` - N-channel MOSFET (pins: G, D, S)
- `mosfet_p` - P-channel MOSFET (pins: G, D, S)

### Op-Amps & Comparators (3)
- `opamp` - Operational amplifier (pins: IN+, IN-, OUT, VCC, GND)
- `comparator` - Voltage comparator (pins: IN+, IN-, OUT, VCC, GND)
- `buffer` - Unity-gain buffer (pins: IN, OUT, VCC, GND)

### Voltage References & Regulators (4)
- `reference_voltage` - Voltage reference (pins: VIN, VOUT, GND)
- `voltage_regulator` - Generic regulator (pins: VIN, VOUT, GND)
- `linear_regulator` - Linear LDO (pins: VIN, VOUT, GND, ADJ)
- `switching_regulator` - Switching regulator (pins: VIN, SW, FB, GND, EN)

### ICs (2)
- `ne555` - 555 timer (pins: VCC, GND, TRIG, OUT, RST, CV, THR, DIS)
- `mcu` - Generic microcontroller (pins: VCC, GND, P0, P1, P2, P3, RST)

### Connectors (3)
- `usb_c` - USB-C connector (pins: VBUS, GND, DP, DN, CC1, CC2)
- `pin_header_1` - Single pin header (pins: 1)
- `pin_header_n` - N-pin header (pins: 1, 2, 3, 4)

### Power (2)
- `GND` - Ground symbol (pin: GND)
- `VCC` - Power supply symbol (pin: VCC)

## Pin Naming Conventions

Core symbols use **stable, semantic pin names**:

- **Passives**: `1`, `2`
- **Diodes**: `A` (anode), `K` (cathode)
- **Transistors (BJT)**: `B` (base), `C` (collector), `E` (emitter)
- **Transistors (MOSFET)**: `G` (gate), `D` (drain), `S` (source)
- **Op-Amps**: `IN+`, `IN-`, `OUT`, `VCC`, `GND`
- **Power**: `GND`, `VCC`

These names are used in:
- Circuit netlist export (`circuit.v1.json`)
- Wire connection validation
- Pin mapping for PCB export (future)

## Backward Compatibility

- Old schematics referencing `R` (resistor) still work
- Alias: `R` → `resistor` (both IDs valid)
- All legacy schematic files load without changes

## Demo Circuit

A sample circuit is available at:
```
demo-circuit.json
```

This demonstrates:
- VCC → Resistor → LED → GND
- Proper use of core symbols
- Wire connections
- Netlist export readiness

Load it via:
1. Click "📂 Load" button
2. Select `demo-circuit.json`
3. Click "🔌 Netlist" to export circuit.v1.json

## Management Functions

### Clear User Symbols
- Removes only imported symbols
- Core symbols remain intact
- Useful for switching between projects

### Clear All Symbols
- Removes imported symbols only
- Core symbols are protected and cannot be deleted

### Import KiCad JSON
- Adds vendor-specific symbols to "Imported Symbols" section
- Does not override core symbols

## Implementation Files

- `src/symbol-lib/core.ts` - Core symbol definitions (24 symbols)
- `src/symbol-lib/registry.ts` - Symbol registry with core protection
- `src/symbol-renderer/SymbolLibraryPanel.tsx` - UI with grouping

## Next Steps

1. **Test all core symbols**: Place each on canvas, verify pins connect
2. **Export netlist**: Use "🔌 Netlist" button to generate circuit.v1.json
3. **Import KiCad parts**: Add vendor-specific components (e.g., TI, Analog Devices)
4. **Build circuits**: Combine core + imported symbols for complete designs

## Troubleshooting

### "Symbol not found" error
- Ensure you're using core symbol IDs (lowercase, e.g., `resistor` not `R`)
- Check spelling (case-sensitive)

### Core symbol appears in "Imported Symbols"
- This is a bug - core symbols should be in "Core Symbols" section
- Reload page (localStorage might be stale)

### Cannot delete core symbol
- Expected behavior - core symbols are protected
- Use "Clear User Symbols" to remove only imported parts

### VCC symbol missing
- VCC is a core symbol, should always be visible
- Check browser console for errors
- Try clearing localStorage: `localStorage.clear()` in console

## Further Reading

- [Netlist Export Guide](NETLIST_EXPORT_GUIDE.md) - Circuit.v1.json format
- [Netlist Visual Guide](NETLIST_VISUAL_GUIDE.md) - Architecture diagrams
- [Quick Test Guide](QUICK_TEST_GUIDE.md) - Testing workflows
