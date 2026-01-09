import type { SymbolInstance, Wire, WireEndpoint, SchematicDoc } from "./types"
import { getSymbolDef } from "../symbol-lib/registry"
import { computeWirePointsSmartFromPoints } from "./wireRouting"

export function rotatePoint(x: number, y: number, rotDeg: 0 | 90 | 180 | 270) {
  switch (rotDeg) {
    case 0:
      return { x, y }
    case 90:
      return { x: -y, y: x }
    case 180:
      return { x: -x, y: -y }
    case 270:
      return { x: y, y: -x }
  }
}

export function getAbsPins(inst: SymbolInstance) {
  const sym = getSymbolDef(inst.symbolId)
  if (!sym) return []
  return sym.pins.map((p) => {
    const rp = rotatePoint(p.pos.x, p.pos.y, inst.rotDeg)
    return {
      instId: inst.id,
      pinName: p.name,
      x: inst.pos.x + rp.x,
      y: inst.pos.y + rp.y,
    }
  })
}

export function getPinPosition(endpoint: WireEndpoint, doc: SchematicDoc): { x: number; y: number } | null {
  const inst = doc.instances.find((i) => i.id === endpoint.instId)
  if (!inst) return null
  const pins = getAbsPins(inst)
  const pin = pins.find((p) => p.pinName === endpoint.pinName)
  return pin ? { x: pin.x, y: pin.y } : null
}

export function computeWirePoints(wire: Wire, doc: SchematicDoc): { x: number; y: number }[] {
  const aPos = getPinPosition(wire.a, doc)
  const bPos = getPinPosition(wire.b, doc)
  if (!aPos || !bPos) return []

  // Smart routing (Manhattan) that avoids component bodies.
  // Note: no `require()` here; Vite runs ESM in the browser.
  const smartPoints = computeWirePointsSmartFromPoints(
    aPos,
    bPos,
    doc,
    new Set([wire.a.instId, wire.b.instId])
  )
  if (smartPoints.length > 0) return smartPoints
  
  // Simple L-shape: a -> (b.x, a.y) -> b
  const mid = { x: bPos.x, y: aPos.y }
  return [aPos, mid, bPos]
}
