import type { SymbolInstance, Wire, SchematicDoc, Point } from "./types"
import { getSymbolDef } from "../symbol-lib/registry"
import { rotatePoint } from "../symbol-dsl/geometry"

/**
 * Test if a point hits an instance's bounding box
 */
export function hitTestInstance(inst: SymbolInstance, point: Point): boolean {
  const symbolDef = getSymbolDef(inst.symbolId)
  if (!symbolDef || !symbolDef.bbox) return false

  const bbox = symbolDef.bbox
  
  // Transform point from world space to instance local space
  const localPoint = {
    x: point.x - inst.pos.x,
    y: point.y - inst.pos.y,
  }
  
  // Rotate point backwards to test against non-rotated bbox
  const angleRad = (-inst.rotDeg * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const rotatedLocal = {
    x: localPoint.x * cos - localPoint.y * sin,
    y: localPoint.x * sin + localPoint.y * cos,
  }
  
  // Test against bounding box
  return (
    rotatedLocal.x >= bbox.x &&
    rotatedLocal.x <= bbox.x + bbox.w &&
    rotatedLocal.y >= bbox.y &&
    rotatedLocal.y <= bbox.y + bbox.h
  )
}

/**
 * Distance from point to line segment
 */
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  
  if (lengthSq === 0) {
    // Degenerate segment (point)
    const pdx = p.x - a.x
    const pdy = p.y - a.y
    return Math.sqrt(pdx * pdx + pdy * pdy)
  }
  
  // Parametric position along segment (0 to 1)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  
  // Closest point on segment
  const closestX = a.x + t * dx
  const closestY = a.y + t * dy
  
  // Distance from p to closest point
  const pdx = p.x - closestX
  const pdy = p.y - closestY
  return Math.sqrt(pdx * pdx + pdy * pdy)
}

/**
 * Test if a point hits a wire (within tolerance)
 */
export function hitTestWire(wire: Wire, point: Point, doc: SchematicDoc, tolerance = 5): boolean {
  // Find endpoints
  const instA = doc.instances.find((i) => i.id === wire.a.instId)
  const instB = doc.instances.find((i) => i.id === wire.b.instId)
  
  if (!instA || !instB) return false
  
  // Get pin positions
  const pinA = getAbsolutePinPosition(instA, wire.a.pinName)
  const pinB = getAbsolutePinPosition(instB, wire.b.pinName)
  
  if (!pinA || !pinB) return false
  
  // Test distance to wire segment
  const distance = distanceToSegment(point, pinA, pinB)
  return distance <= tolerance
}

/**
 * Get absolute position of a pin on an instance
 */
function getAbsolutePinPosition(inst: SymbolInstance, pinName: string): Point | null {
  const symbolDef = getSymbolDef(inst.symbolId)
  if (!symbolDef) return null
  
  const pin = symbolDef.pins.find((p) => p.name === pinName)
  if (!pin) return null
  
  // Rotate pin position
  const rotated = rotatePoint(pin.pos, inst.rotDeg)
  
  return {
    x: inst.pos.x + rotated.x,
    y: inst.pos.y + rotated.y,
  }
}

/**
 * Find what is under a point (instances have priority over wires)
 */
export function findHitTarget(
  point: Point,
  doc: SchematicDoc
): { type: "instance"; id: string } | { type: "wire"; id: string } | null {
  // Check instances first (they have priority)
  for (const inst of doc.instances) {
    if (hitTestInstance(inst, point)) {
      return { type: "instance", id: inst.id }
    }
  }
  
  // Check wires
  for (const wire of doc.wires) {
    if (hitTestWire(wire, point, doc)) {
      return { type: "wire", id: wire.id }
    }
  }
  
  return null
}
