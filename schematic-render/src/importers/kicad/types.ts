/**
 * Intermediate representation (IR) for KiCad symbols
 * Separates "parsing KiCad" from "converting to SymbolDef"
 * All coordinates in KiCad native units (mil = 0.001 inch)
 */

export type KicadPinOrientation = "up" | "down" | "left" | "right"

export type KicadPin = {
  name: string
  number: string
  x: number // KiCad mil units
  y: number // KiCad mil units
  length: number // pin length in mil
  orientation: KicadPinOrientation
  electricalType?: string // input/output/passive/power etc.
}

export type KicadGraphic = 
  | { kind: "polyline"; points: Array<{ x: number; y: number }>; width: number; fill?: boolean }
  | { kind: "rectangle"; x1: number; y1: number; x2: number; y2: number; width: number; fill?: boolean }
  | { kind: "circle"; cx: number; cy: number; radius: number; width: number; fill?: boolean }
  | { kind: "arc"; cx: number; cy: number; radius: number; startAngle: number; endAngle: number; width: number }
  | { kind: "text"; x: number; y: number; text: string; size: number; angle?: number }

export type KicadSymbolIR = {
  name: string
  pins: KicadPin[]
  graphics: KicadGraphic[]
}

export type KicadSymFileIR = {
  file: string
  symbols: KicadSymbolIR[]
}
