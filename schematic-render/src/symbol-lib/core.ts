import type { SymbolDef } from "../symbol-dsl/types"

/**
 * Core Symbols - Generic semantic components
 * These are built-in, non-deletable, and use stable pin names.
 * Vendor-specific parts (TL431PS, MAX*, ADR*) should be imported separately.
 */

// ============================================================================
// PASSIVE COMPONENTS
// ============================================================================

export const resistor: SymbolDef = {
  id: "resistor",
  bbox: { x: -20, y: -6, w: 40, h: 12 },
  primitives: [
    { kind: "line", a: { x: -30, y: 0 }, b: { x: -20, y: 0 } },
    { kind: "line", a: { x: 20, y: 0 }, b: { x: 30, y: 0 } },
    { kind: "rect", x: -20, y: -6, w: 40, h: 12, fill: false },
    { kind: "text", x: 0, y: -12, text: "R", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "1", pos: { x: -30, y: 0 }, dir: "left" },
    { name: "2", pos: { x: 30, y: 0 }, dir: "right" },
  ],
}

export const capacitor: SymbolDef = {
  id: "capacitor",
  bbox: { x: -20, y: -15, w: 40, h: 30 },
  primitives: [
    { kind: "line", a: { x: 0, y: -30 }, b: { x: 0, y: -8 } },
    { kind: "line", a: { x: -12, y: -8 }, b: { x: 12, y: -8 } },
    { kind: "line", a: { x: -12, y: 8 }, b: { x: 12, y: 8 } },
    { kind: "line", a: { x: 0, y: 8 }, b: { x: 0, y: 30 } },
    { kind: "text", x: 15, y: 0, text: "C", anchor: "l", size: 6 },
  ],
  pins: [
    { name: "1", pos: { x: 0, y: -30 }, dir: "up" },
    { name: "2", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

export const inductor: SymbolDef = {
  id: "inductor",
  bbox: { x: -40, y: -10, w: 80, h: 20 },
  primitives: [
    { kind: "line", a: { x: -40, y: 0 }, b: { x: -30, y: 0 } },
    { kind: "arc", cx: -20, cy: 0, r: 10, startAngle: 180, endAngle: 0, width: 1 },
    { kind: "arc", cx: 0, cy: 0, r: 10, startAngle: 180, endAngle: 0, width: 1 },
    { kind: "arc", cx: 20, cy: 0, r: 10, startAngle: 180, endAngle: 0, width: 1 },
    { kind: "line", a: { x: 30, y: 0 }, b: { x: 40, y: 0 } },
    { kind: "text", x: 0, y: -15, text: "L", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "1", pos: { x: -40, y: 0 }, dir: "left" },
    { name: "2", pos: { x: 40, y: 0 }, dir: "right" },
  ],
}

// ============================================================================
// DIODES
// ============================================================================

export const diode: SymbolDef = {
  id: "diode",
  bbox: { x: -20, y: -20, w: 40, h: 40 },
  primitives: [
    { kind: "line", a: { x: 0, y: -30 }, b: { x: 0, y: -10 } },
    { kind: "polyline", points: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 0, y: 10 }, { x: -10, y: -10 }], width: 1, fill: false },
    { kind: "line", a: { x: -10, y: 10 }, b: { x: 10, y: 10 } },
    { kind: "line", a: { x: 0, y: 10 }, b: { x: 0, y: 30 } },
    { kind: "text", x: 15, y: 0, text: "D", anchor: "l", size: 6 },
  ],
  pins: [
    { name: "A", pos: { x: 0, y: -30 }, dir: "up" },
    { name: "K", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

export const zener_diode: SymbolDef = {
  id: "zener_diode",
  bbox: { x: -20, y: -20, w: 40, h: 40 },
  primitives: [
    { kind: "line", a: { x: 0, y: -30 }, b: { x: 0, y: -10 } },
    { kind: "polyline", points: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 0, y: 10 }, { x: -10, y: -10 }], width: 1, fill: false },
    { kind: "line", a: { x: -10, y: 10 }, b: { x: 10, y: 10 } },
    { kind: "line", a: { x: -10, y: 10 }, b: { x: -10, y: 6 } },
    { kind: "line", a: { x: 10, y: 10 }, b: { x: 10, y: 14 } },
    { kind: "line", a: { x: 0, y: 10 }, b: { x: 0, y: 30 } },
    { kind: "text", x: 15, y: 0, text: "DZ", anchor: "l", size: 6 },
  ],
  pins: [
    { name: "A", pos: { x: 0, y: -30 }, dir: "up" },
    { name: "K", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

export const led: SymbolDef = {
  id: "led",
  bbox: { x: -20, y: -20, w: 40, h: 40 },
  primitives: [
    { kind: "line", a: { x: 0, y: -30 }, b: { x: 0, y: -10 } },
    { kind: "polyline", points: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 0, y: 10 }, { x: -10, y: -10 }], width: 1, fill: false },
    { kind: "line", a: { x: -10, y: 10 }, b: { x: 10, y: 10 } },
    { kind: "line", a: { x: 0, y: 10 }, b: { x: 0, y: 30 } },
    // LED arrows
    { kind: "line", a: { x: 5, y: -15 }, b: { x: 12, y: -22 } },
    { kind: "line", a: { x: 12, y: -22 }, b: { x: 10, y: -22 } },
    { kind: "line", a: { x: 12, y: -22 }, b: { x: 12, y: -20 } },
    { kind: "line", a: { x: 10, y: -10 }, b: { x: 17, y: -17 } },
    { kind: "line", a: { x: 17, y: -17 }, b: { x: 15, y: -17 } },
    { kind: "line", a: { x: 17, y: -17 }, b: { x: 17, y: -15 } },
    { kind: "text", x: 15, y: 5, text: "LED", anchor: "l", size: 5 },
  ],
  pins: [
    { name: "A", pos: { x: 0, y: -30 }, dir: "up" },
    { name: "K", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

// ============================================================================
// TRANSISTORS
// ============================================================================

export const transistor_npn: SymbolDef = {
  id: "transistor_npn",
  bbox: { x: -20, y: -30, w: 40, h: 60 },
  primitives: [
    { kind: "line", a: { x: -20, y: 0 }, b: { x: -5, y: 0 } },
    { kind: "line", a: { x: -5, y: -15 }, b: { x: -5, y: 15 } },
    { kind: "line", a: { x: -5, y: -10 }, b: { x: 10, y: -25 } },
    { kind: "line", a: { x: 10, y: -25 }, b: { x: 10, y: -30 } },
    { kind: "line", a: { x: -5, y: 10 }, b: { x: 10, y: 25 } },
    { kind: "line", a: { x: 10, y: 25 }, b: { x: 10, y: 30 } },
    // Arrow on emitter
    { kind: "polyline", points: [{ x: 10, y: 25 }, { x: 5, y: 20 }, { x: 6, y: 25 }], width: 1, fill: true },
    { kind: "text", x: -25, y: 0, text: "Q", anchor: "r", size: 6 },
  ],
  pins: [
    { name: "B", pos: { x: -20, y: 0 }, dir: "left" },
    { name: "C", pos: { x: 10, y: -30 }, dir: "up" },
    { name: "E", pos: { x: 10, y: 30 }, dir: "down" },
  ],
}

export const transistor_pnp: SymbolDef = {
  id: "transistor_pnp",
  bbox: { x: -20, y: -30, w: 40, h: 60 },
  primitives: [
    { kind: "line", a: { x: -20, y: 0 }, b: { x: -5, y: 0 } },
    { kind: "line", a: { x: -5, y: -15 }, b: { x: -5, y: 15 } },
    { kind: "line", a: { x: -5, y: -10 }, b: { x: 10, y: -25 } },
    { kind: "line", a: { x: 10, y: -25 }, b: { x: 10, y: -30 } },
    { kind: "line", a: { x: -5, y: 10 }, b: { x: 10, y: 25 } },
    { kind: "line", a: { x: 10, y: 25 }, b: { x: 10, y: 30 } },
    // Arrow on collector (reversed for PNP)
    { kind: "polyline", points: [{ x: -5, y: -10 }, { x: -2, y: -15 }, { x: 0, y: -10 }], width: 1, fill: true },
    { kind: "text", x: -25, y: 0, text: "Q", anchor: "r", size: 6 },
  ],
  pins: [
    { name: "B", pos: { x: -20, y: 0 }, dir: "left" },
    { name: "C", pos: { x: 10, y: -30 }, dir: "up" },
    { name: "E", pos: { x: 10, y: 30 }, dir: "down" },
  ],
}

export const mosfet_n: SymbolDef = {
  id: "mosfet_n",
  bbox: { x: -25, y: -30, w: 45, h: 60 },
  primitives: [
    { kind: "line", a: { x: -25, y: 0 }, b: { x: -10, y: 0 } },
    { kind: "line", a: { x: -10, y: -20 }, b: { x: -10, y: 20 } },
    { kind: "line", a: { x: -5, y: -15 }, b: { x: -5, y: -8 } },
    { kind: "line", a: { x: -5, y: -3 }, b: { x: -5, y: 3 } },
    { kind: "line", a: { x: -5, y: 8 }, b: { x: -5, y: 15 } },
    { kind: "line", a: { x: -5, y: -12 }, b: { x: 10, y: -12 } },
    { kind: "line", a: { x: 10, y: -12 }, b: { x: 10, y: -30 } },
    { kind: "line", a: { x: -5, y: 12 }, b: { x: 10, y: 12 } },
    { kind: "line", a: { x: 10, y: 12 }, b: { x: 10, y: 30 } },
    { kind: "line", a: { x: -5, y: 0 }, b: { x: 10, y: 0 } },
    // Arrow (body diode)
    { kind: "polyline", points: [{ x: 5, y: 0 }, { x: 2, y: -3 }, { x: 2, y: 3 }], width: 1, fill: true },
    { kind: "text", x: -30, y: 0, text: "M", anchor: "r", size: 6 },
  ],
  pins: [
    { name: "G", pos: { x: -25, y: 0 }, dir: "left" },
    { name: "D", pos: { x: 10, y: -30 }, dir: "up" },
    { name: "S", pos: { x: 10, y: 30 }, dir: "down" },
  ],
}

export const mosfet_p: SymbolDef = {
  id: "mosfet_p",
  bbox: { x: -25, y: -30, w: 45, h: 60 },
  primitives: [
    { kind: "line", a: { x: -25, y: 0 }, b: { x: -10, y: 0 } },
    { kind: "line", a: { x: -10, y: -20 }, b: { x: -10, y: 20 } },
    { kind: "line", a: { x: -5, y: -15 }, b: { x: -5, y: -8 } },
    { kind: "line", a: { x: -5, y: -3 }, b: { x: -5, y: 3 } },
    { kind: "line", a: { x: -5, y: 8 }, b: { x: -5, y: 15 } },
    { kind: "line", a: { x: -5, y: -12 }, b: { x: 10, y: -12 } },
    { kind: "line", a: { x: 10, y: -12 }, b: { x: 10, y: -30 } },
    { kind: "line", a: { x: -5, y: 12 }, b: { x: 10, y: 12 } },
    { kind: "line", a: { x: 10, y: 12 }, b: { x: 10, y: 30 } },
    { kind: "line", a: { x: -5, y: 0 }, b: { x: 10, y: 0 } },
    // Arrow reversed for P-channel
    { kind: "polyline", points: [{ x: 1, y: 0 }, { x: 4, y: -3 }, { x: 4, y: 3 }], width: 1, fill: true },
    { kind: "text", x: -30, y: 0, text: "M", anchor: "r", size: 6 },
  ],
  pins: [
    { name: "G", pos: { x: -25, y: 0 }, dir: "left" },
    { name: "D", pos: { x: 10, y: -30 }, dir: "up" },
    { name: "S", pos: { x: 10, y: 30 }, dir: "down" },
  ],
}

// ============================================================================
// INTEGRATED CIRCUITS
// ============================================================================

export const opamp: SymbolDef = {
  id: "opamp",
  bbox: { x: -30, y: -25, w: 60, h: 50 },
  primitives: [
    { kind: "polyline", points: [{ x: -30, y: -25 }, { x: -30, y: 25 }, { x: 30, y: 0 }, { x: -30, y: -25 }], width: 1, fill: false },
    { kind: "text", x: -20, y: -12, text: "+", anchor: "c", size: 8 },
    { kind: "text", x: -20, y: 12, text: "−", anchor: "c", size: 8 },
    { kind: "text", x: 0, y: -30, text: "OP", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "IN+", pos: { x: -30, y: -15 }, dir: "left" },
    { name: "IN-", pos: { x: -30, y: 15 }, dir: "left" },
    { name: "OUT", pos: { x: 30, y: 0 }, dir: "right" },
    { name: "VCC", pos: { x: 0, y: -25 }, dir: "up" },
    { name: "GND", pos: { x: 0, y: 25 }, dir: "down" },
  ],
}

export const comparator: SymbolDef = {
  id: "comparator",
  bbox: { x: -30, y: -25, w: 60, h: 50 },
  primitives: [
    { kind: "polyline", points: [{ x: -30, y: -25 }, { x: -30, y: 25 }, { x: 30, y: 0 }, { x: -30, y: -25 }], width: 1, fill: false },
    { kind: "text", x: -20, y: -12, text: "+", anchor: "c", size: 8 },
    { kind: "text", x: -20, y: 12, text: "−", anchor: "c", size: 8 },
    { kind: "text", x: 0, y: -30, text: "CMP", anchor: "c", size: 5 },
  ],
  pins: [
    { name: "IN+", pos: { x: -30, y: -15 }, dir: "left" },
    { name: "IN-", pos: { x: -30, y: 15 }, dir: "left" },
    { name: "OUT", pos: { x: 30, y: 0 }, dir: "right" },
    { name: "VCC", pos: { x: 0, y: -25 }, dir: "up" },
    { name: "GND", pos: { x: 0, y: 25 }, dir: "down" },
  ],
}

export const buffer: SymbolDef = {
  id: "buffer",
  bbox: { x: -25, y: -20, w: 50, h: 40 },
  primitives: [
    { kind: "polyline", points: [{ x: -25, y: -20 }, { x: -25, y: 20 }, { x: 25, y: 0 }, { x: -25, y: -20 }], width: 1, fill: false },
    { kind: "text", x: 0, y: -25, text: "BUF", anchor: "c", size: 5 },
  ],
  pins: [
    { name: "IN", pos: { x: -25, y: 0 }, dir: "left" },
    { name: "OUT", pos: { x: 25, y: 0 }, dir: "right" },
  ],
}

export const reference_voltage: SymbolDef = {
  id: "reference_voltage",
  bbox: { x: -25, y: -30, w: 50, h: 60 },
  primitives: [
    { kind: "rect", x: -25, y: -15, w: 50, h: 30, fill: false },
    { kind: "text", x: 0, y: 0, text: "VREF", anchor: "c", size: 6 },
    { kind: "text", x: 0, y: -25, text: "REF", anchor: "c", size: 5 },
  ],
  pins: [
    { name: "VIN", pos: { x: 0, y: -30 }, dir: "up" },
    { name: "VOUT", pos: { x: 25, y: 0 }, dir: "right" },
    { name: "GND", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

export const voltage_regulator: SymbolDef = {
  id: "voltage_regulator",
  bbox: { x: -30, y: -30, w: 60, h: 60 },
  primitives: [
    { kind: "rect", x: -30, y: -15, w: 60, h: 30, fill: false },
    { kind: "text", x: 0, y: 0, text: "REG", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "VIN", pos: { x: -30, y: 0 }, dir: "left" },
    { name: "VOUT", pos: { x: 30, y: 0 }, dir: "right" },
    { name: "GND", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

export const linear_regulator: SymbolDef = {
  id: "linear_regulator",
  bbox: { x: -30, y: -30, w: 60, h: 60 },
  primitives: [
    { kind: "rect", x: -30, y: -15, w: 60, h: 30, fill: false },
    { kind: "text", x: 0, y: -3, text: "LDO", anchor: "c", size: 6 },
    { kind: "text", x: 0, y: 5, text: "REG", anchor: "c", size: 5 },
  ],
  pins: [
    { name: "VIN", pos: { x: -30, y: 0 }, dir: "left" },
    { name: "VOUT", pos: { x: 30, y: 0 }, dir: "right" },
    { name: "GND", pos: { x: 0, y: 30 }, dir: "down" },
  ],
}

export const switching_regulator: SymbolDef = {
  id: "switching_regulator",
  bbox: { x: -30, y: -30, w: 60, h: 60 },
  primitives: [
    { kind: "rect", x: -30, y: -15, w: 60, h: 30, fill: false },
    { kind: "text", x: 0, y: -3, text: "SW", anchor: "c", size: 6 },
    { kind: "text", x: 0, y: 5, text: "REG", anchor: "c", size: 5 },
  ],
  pins: [
    { name: "VIN", pos: { x: -30, y: 0 }, dir: "left" },
    { name: "VOUT", pos: { x: 30, y: 0 }, dir: "right" },
    { name: "GND", pos: { x: 0, y: 30 }, dir: "down" },
    { name: "SW", pos: { x: 0, y: -30 }, dir: "up" },
  ],
}

export const ne555: SymbolDef = {
  id: "NE555",
  bbox: { x: -35, y: -40, w: 70, h: 80 },
  primitives: [
    { kind: "rect", x: -35, y: -40, w: 70, h: 80, fill: false },
    { kind: "text", x: 0, y: -5, text: "NE555", anchor: "c", size: 6 },
    { kind: "text", x: 0, y: 5, text: "TIMER", anchor: "c", size: 5 },
  ],
  pins: [
    { name: "GND", pos: { x: 0, y: 40 }, dir: "down" },
    { name: "TRIG", pos: { x: -35, y: 20 }, dir: "left" },
    { name: "OUT", pos: { x: 35, y: 0 }, dir: "right" },
    { name: "RESET", pos: { x: 0, y: -40 }, dir: "up" },
    { name: "CTRL", pos: { x: -35, y: -20 }, dir: "left" },
    { name: "THRES", pos: { x: -35, y: 0 }, dir: "left" },
    { name: "DISCH", pos: { x: 35, y: -20 }, dir: "right" },
    { name: "VCC", pos: { x: 35, y: 20 }, dir: "right" },
  ],
}

export const mcu: SymbolDef = {
  id: "MCU",
  bbox: { x: -40, y: -50, w: 80, h: 100 },
  primitives: [
    { kind: "rect", x: -40, y: -50, w: 80, h: 100, fill: false },
    { kind: "text", x: 0, y: -5, text: "MCU", anchor: "c", size: 8 },
    { kind: "text", x: 0, y: 5, text: "µC", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "VCC", pos: { x: 0, y: -50 }, dir: "up" },
    { name: "GND", pos: { x: 0, y: 50 }, dir: "down" },
    { name: "PA0", pos: { x: -40, y: -30 }, dir: "left" },
    { name: "PA1", pos: { x: -40, y: -10 }, dir: "left" },
    { name: "PA2", pos: { x: -40, y: 10 }, dir: "left" },
    { name: "PA3", pos: { x: -40, y: 30 }, dir: "left" },
    { name: "PB0", pos: { x: 40, y: -30 }, dir: "right" },
    { name: "PB1", pos: { x: 40, y: -10 }, dir: "right" },
    { name: "PB2", pos: { x: 40, y: 10 }, dir: "right" },
    { name: "PB3", pos: { x: 40, y: 30 }, dir: "right" },
  ],
}

// ============================================================================
// CONNECTORS
// ============================================================================

export const usb_c: SymbolDef = {
  id: "usb_c",
  bbox: { x: -30, y: -50, w: 60, h: 100 },
  primitives: [
    { kind: "rect", x: -30, y: -50, w: 60, h: 100, fill: false },
    { kind: "text", x: 0, y: -5, text: "USB-C", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "VBUS", pos: { x: 30, y: -40 }, dir: "right" },
    { name: "GND", pos: { x: 30, y: 40 }, dir: "right" },
    { name: "D+", pos: { x: 30, y: -10 }, dir: "right" },
    { name: "D-", pos: { x: 30, y: 10 }, dir: "right" },
    { name: "CC1", pos: { x: 30, y: -25 }, dir: "right" },
    { name: "CC2", pos: { x: 30, y: 25 }, dir: "right" },
  ],
}

export const pin_header_1: SymbolDef = {
  id: "pin_header_1",
  bbox: { x: -10, y: -10, w: 20, h: 20 },
  primitives: [
    { kind: "rect", x: -10, y: -10, w: 20, h: 20, fill: false },
    { kind: "circle", cx: 0, cy: 0, r: 5, fill: true },
    { kind: "text", x: 0, y: -18, text: "J", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "1", pos: { x: 0, y: 0 }, dir: "left" },
  ],
}

export const pin_header_n: SymbolDef = {
  id: "pin_header_n",
  bbox: { x: -15, y: -40, w: 30, h: 80 },
  primitives: [
    { kind: "rect", x: -15, y: -40, w: 30, h: 80, fill: false },
    { kind: "circle", cx: 0, cy: -25, r: 4, fill: true },
    { kind: "circle", cx: 0, cy: -10, r: 4, fill: true },
    { kind: "circle", cx: 0, cy: 5, r: 4, fill: true },
    { kind: "circle", cx: 0, cy: 20, r: 4, fill: true },
    { kind: "text", x: 0, y: 35, text: "...", anchor: "c", size: 6 },
    { kind: "text", x: 0, y: -48, text: "J", anchor: "c", size: 6 },
  ],
  pins: [
    { name: "1", pos: { x: -15, y: -25 }, dir: "left" },
    { name: "2", pos: { x: -15, y: -10 }, dir: "left" },
    { name: "3", pos: { x: -15, y: 5 }, dir: "left" },
    { name: "4", pos: { x: -15, y: 20 }, dir: "left" },
    { name: "n", pos: { x: -15, y: 35 }, dir: "left" },
  ],
}

// ============================================================================
// POWER SYMBOLS
// ============================================================================

export const gnd: SymbolDef = {
  id: "GND",
  bbox: { x: -10, y: -15, w: 20, h: 25 },
  primitives: [
    { kind: "line", a: { x: 0, y: -15 }, b: { x: 0, y: -6 } },
    { kind: "line", a: { x: -8, y: -6 }, b: { x: 8, y: -6 } },
    { kind: "line", a: { x: -6, y: -3 }, b: { x: 6, y: -3 } },
    { kind: "line", a: { x: -4, y: 0 }, b: { x: 4, y: 0 } },
    { kind: "text", x: 0, y: 10, text: "GND", anchor: "c", size: 6 },
  ],
  pins: [{ name: "GND", pos: { x: 0, y: -15 }, dir: "up" }],
}

export const vcc: SymbolDef = {
  id: "VCC",
  bbox: { x: -10, y: -25, w: 20, h: 25 },
  primitives: [
    { kind: "line", a: { x: 0, y: 15 }, b: { x: 0, y: 6 } },
    { kind: "line", a: { x: -8, y: 6 }, b: { x: 8, y: 6 } },
    { kind: "circle", cx: 0, cy: 0, r: 5, fill: false },
    { kind: "text", x: 0, y: -10, text: "VCC", anchor: "c", size: 6 },
  ],
  pins: [{ name: "VCC", pos: { x: 0, y: 15 }, dir: "down" }],
}

export const tag: SymbolDef = {
  id: "Tag",
  bbox: { x: -15, y: -15, w: 30, h: 30 },
  primitives: [
    { kind: "circle", cx: 0, cy: 0, r: 8, fill: false },
    { kind: "line", a: { x: -5, y: 0 }, b: { x: 5, y: 0 } },
    { kind: "line", a: { x: 0, y: -5 }, b: { x: 0, y: 5 } },
    { kind: "text", x: 0, y: 20, text: "TAG", anchor: "c", size: 5 },
  ],
  pins: [{ name: "TAG", pos: { x: 0, y: 0 }, dir: "left" }],
}

// Legacy alias for backward compatibility
export const R = resistor

// Export all core symbols as an array for easy registration
export const coreSymbols: SymbolDef[] = [
  resistor,
  capacitor,
  inductor,
  diode,
  zener_diode,
  led,
  transistor_npn,
  transistor_pnp,
  mosfet_n,
  mosfet_p,
  opamp,
  comparator,
  buffer,
  reference_voltage,
  voltage_regulator,
  linear_regulator,
  switching_regulator,
  ne555,
  mcu,
  usb_c,
  pin_header_1,
  pin_header_n,
  gnd,
  vcc,
  tag,
]

// Core symbol IDs for checking if a symbol is built-in
export const coreSymbolIds = new Set(coreSymbols.map(s => s.id))
