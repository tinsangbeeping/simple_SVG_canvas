import type { KicadSymbolIR, KicadPinOrientation } from './types'
import type { SymbolDef, Pin, Primitive } from '../../symbol-dsl/types'

/**
 * Default scale factor for KiCad imports (KiCad units are tiny, typically 0.1-1mm)
 * Scale up by 10x to make symbols visible and properly sized in our canvas
 */
export const KICAD_IMPORT_SCALE = 10

/**
 * Convert KiCad symbol IR to SymbolDef (pure function, no side effects)
 * Units: KiCad coordinates are scaled by KICAD_IMPORT_SCALE for proper display
 * bbox: will be auto-computed by computeSymbolBBox when symbol is registered
 */
export function kicadIRToSymbolDef(ir: KicadSymbolIR, scale: number = KICAD_IMPORT_SCALE): SymbolDef {
  const pins = ir.pins.map(kPin => convertPin(kPin, scale))
  const primitives = ir.graphics.flatMap(kGraphic => convertGraphic(kGraphic, scale))
  
  return {
    id: ir.name,
    pins,
    primitives,
    // bbox will be auto-computed by symbol registry
  }
}

function convertPin(kPin: KicadSymbolIR['pins'][0], scale: number): Pin {
  // Pin snap position = base position + (direction vector * length)
  const [dx, dy] = getDirectionVector(kPin.orientation)
  const snapX = (kPin.x + dx * kPin.length) * scale
  const snapY = (kPin.y + dy * kPin.length) * scale
  
  // Map KiCad orientation to our pin direction
  const dir = kicadOrientationToPinDir(kPin.orientation)
  
  return {
    name: kPin.name === '~' ? kPin.number : kPin.name, // Use number if name is placeholder
    number: kPin.number,
    pos: { x: snapX, y: snapY },
    dir,
  }
}

function getDirectionVector(orientation: KicadPinOrientation): [number, number] {
  // Direction vector points FROM symbol body TO connection point
  switch (orientation) {
    case 'up': return [0, 1]
    case 'down': return [0, -1]
    case 'left': return [-1, 0]
    case 'right': return [1, 0]
  }
}

function kicadOrientationToPinDir(orientation: KicadPinOrientation): Pin['dir'] {
  // Our pin 'dir' indicates which side of the symbol the pin is on
  // (where wires connect from)
  switch (orientation) {
    case 'up': return 'up'
    case 'down': return 'down'
    case 'left': return 'left'
    case 'right': return 'right'
  }
}

function convertGraphic(kGraphic: KicadSymbolIR['graphics'][0], scale: number): Primitive[] {
  switch (kGraphic.kind) {
    case 'polyline': {
      if (kGraphic.points.length < 2) return []
      return [{
        kind: 'polyline',
        points: kGraphic.points.map(p => ({ x: p.x * scale, y: p.y * scale })),
        width: kGraphic.width * scale,
        fill: kGraphic.fill,
      }]
    }
    
    case 'rectangle': {
      const x1 = kGraphic.x1 * scale
      const x2 = kGraphic.x2 * scale
      const y1 = kGraphic.y1 * scale
      const y2 = kGraphic.y2 * scale
      const x = Math.min(x1, x2)
      const y = Math.min(y1, y2)
      const w = Math.abs(x2 - x1)
      const h = Math.abs(y2 - y1)
      return [{
        kind: 'rect',
        x, y, w, h,
        fill: kGraphic.fill,
        stroke: { width: kGraphic.width * scale },
      }]
    }
    
    case 'circle': {
      return [{
        kind: 'circle',
        cx: kGraphic.cx * scale,
        cy: kGraphic.cy * scale,
        r: kGraphic.radius * scale,
        fill: kGraphic.fill,
        stroke: { width: kGraphic.width * scale },
      }]
    }
    
    case 'arc': {
      // Arc support (basic - may need refinement for 3-point arcs)
      return [{
        kind: 'arc',
        cx: kGraphic.cx * scale,
        cy: kGraphic.cy * scale,
        r: kGraphic.radius * scale,
        startAngle: kGraphic.startAngle,
        endAngle: kGraphic.endAngle,
        width: kGraphic.width * scale,
      }]
    }
    
    case 'text': {
      return [{
        kind: 'text',
        x: kGraphic.x * scale,
        y: kGraphic.y * scale,
        text: kGraphic.text,
        size: kGraphic.size * scale,
        anchor: 'c', // KiCad text is typically center-anchored
      }]
    }
    
    default:
      return []
  }
}
