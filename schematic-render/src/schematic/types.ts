import type { Point } from "../symbol-dsl/types"

export type SymbolInstance = {
  id: string
  symbolId: string
  pos: Point
  rotDeg: 0 | 90 | 180 | 270
}

export type { Point }

export type WireEndpoint = {
  instId: string
  pinName: string
}

export type Wire = {
  id: string
  a: WireEndpoint
  b: WireEndpoint
}

export type SchematicDoc = {
  schemaVersion: number
  instances: SymbolInstance[]
  wires: Wire[]
}

export type Selection = 
  | { type: "instance"; id: string }
  | { type: "wire"; id: string }
  | null
