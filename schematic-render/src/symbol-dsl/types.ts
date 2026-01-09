export type Point = { x: number; y: number }

export type StrokeStyle = {
  width?: number
  dash?: number[] // e.g., [5, 3] for dashed line
  cap?: "butt" | "round" | "square"
  join?: "miter" | "round" | "bevel"
}

export type Primitive =
  | ({ kind: "line"; a: Point; b: Point } & Partial<StrokeStyle>)
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill?: boolean; stroke?: Partial<StrokeStyle> }
  | { kind: "circle"; cx: number; cy: number; r: number; fill?: boolean; stroke?: Partial<StrokeStyle> }
  | { kind: "text"; x: number; y: number; text: string; size?: number; anchor?: "l" | "c" | "r" }
  | ({ kind: "arc"; cx: number; cy: number; r: number; startAngle: number; endAngle: number; fill?: boolean } & Partial<StrokeStyle>)
  | ({ kind: "polyline"; points: Point[]; closed?: boolean; fill?: boolean } & Partial<StrokeStyle>)

export type Pin = {
  name: string
  number?: string
  pos: Point
  dir: "left" | "right" | "up" | "down"
}

export type SymbolDef = {
  id: string
  bbox?: { x: number; y: number; w: number; h: number } // Optional now
  primitives: Primitive[]
  pins: Pin[]
}
