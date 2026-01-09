import type { SymbolDef, Primitive } from "./types"

export type BBox = { x: number; y: number; w: number; h: number }

function expandBBox(bbox: BBox, x: number, y: number): BBox {
  const minX = Math.min(bbox.x, x)
  const minY = Math.min(bbox.y, y)
  const maxX = Math.max(bbox.x + bbox.w, x)
  const maxY = Math.max(bbox.y + bbox.h, y)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function expandBBoxByRect(bbox: BBox, other: BBox): BBox {
  const minX = Math.min(bbox.x, other.x)
  const minY = Math.min(bbox.y, other.y)
  const maxX = Math.max(bbox.x + bbox.w, other.x + other.w)
  const maxY = Math.max(bbox.y + bbox.h, other.y + other.h)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function getPrimitiveBBox(p: Primitive): BBox {
  const padding = 2 // Extra padding for stroke width
  
  switch (p.kind) {
    case "line": {
      const minX = Math.min(p.a.x, p.b.x) - padding
      const minY = Math.min(p.a.y, p.b.y) - padding
      const maxX = Math.max(p.a.x, p.b.x) + padding
      const maxY = Math.max(p.a.y, p.b.y) + padding
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    }
    case "rect":
      return { x: p.x - padding, y: p.y - padding, w: p.w + 2 * padding, h: p.h + 2 * padding }
    case "circle":
      return { x: p.cx - p.r - padding, y: p.cy - p.r - padding, w: 2 * (p.r + padding), h: 2 * (p.r + padding) }
    case "arc":
      // Simplified: treat arc as full circle
      return { x: p.cx - p.r - padding, y: p.cy - p.r - padding, w: 2 * (p.r + padding), h: 2 * (p.r + padding) }
    case "polyline": {
      if (p.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
      let minX = p.points[0].x
      let minY = p.points[0].y
      let maxX = p.points[0].x
      let maxY = p.points[0].y
      for (const pt of p.points) {
        minX = Math.min(minX, pt.x)
        minY = Math.min(minY, pt.y)
        maxX = Math.max(maxX, pt.x)
        maxY = Math.max(maxY, pt.y)
      }
      return { x: minX - padding, y: minY - padding, w: maxX - minX + 2 * padding, h: maxY - minY + 2 * padding }
    }
    case "text":
      // Rough estimate: assume text is 10 units wide per char, height = size
      const size = p.size || 6
      const width = p.text.length * size * 0.6
      return { x: p.x - padding, y: p.y - size / 2 - padding, w: width + 2 * padding, h: size + 2 * padding }
  }
}

export function computeSymbolBBox(symbol: SymbolDef): BBox {
  let bbox: BBox | null = null

  // Include all primitives
  for (const prim of symbol.primitives) {
    const primBBox = getPrimitiveBBox(prim)
    if (!bbox) {
      bbox = primBBox
    } else {
      bbox = expandBBoxByRect(bbox, primBBox)
    }
  }

  // Include all pins (with small padding)
  const pinPadding = 5
  for (const pin of symbol.pins) {
    if (!bbox) {
      bbox = { x: pin.pos.x - pinPadding, y: pin.pos.y - pinPadding, w: 2 * pinPadding, h: 2 * pinPadding }
    } else {
      bbox = expandBBox(bbox, pin.pos.x - pinPadding, pin.pos.y - pinPadding)
      bbox = expandBBox(bbox, pin.pos.x + pinPadding, pin.pos.y + pinPadding)
    }
  }

  // Fallback if symbol is completely empty
  if (!bbox || bbox.w === 0 || bbox.h === 0) {
    return { x: -10, y: -10, w: 20, h: 20 }
  }

  return bbox
}

export function rotatePoint(point: { x: number; y: number }, rotDeg: 0 | 90 | 180 | 270): { x: number; y: number } {
  switch (rotDeg) {
    case 0:
      return point
    case 90:
      return { x: -point.y, y: point.x }
    case 180:
      return { x: -point.x, y: -point.y }
    case 270:
      return { x: point.y, y: -point.x }
  }
}
