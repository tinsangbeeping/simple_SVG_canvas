import type { SymbolDef } from "../symbol-dsl/types"

export const resistor: SymbolDef = {
  id: "R",
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
