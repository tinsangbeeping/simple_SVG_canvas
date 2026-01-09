import type { KicadSymbolIR, KicadPinOrientation } from './types'
import type { SymbolDef, Pin, Primitive } from '../../symbol-dsl/types'

/**
 * Convert KiCad symbol IR to SymbolDef (pure function, no side effects)
 * Units: keep KiCad coordinates as-is (typically mm in modern KiCad files)
 * bbox: will be auto-computed by computeSymbolBBox when symbol is registered
 */
export function kicadIRToSymbolDef(ir: KicadSymbolIR): SymbolDef {
  const pins = ir.pins.map(convertPin)
  const primitives = ir.graphics.flatMap(convertGraphic)
  
  return {
    id: ir.name,
    pins,
    primitives,
    // bbox will be auto-computed by symbol registry
  }
}

function convertPin(kPin: KicadSymbolIR['pins'][0]): Pin {
  // Pin snap position = base position + (direction vector * length)
  const [dx, dy] = getDirectionVector(kPin.orientation)
  const snapX = kPin.x + dx * kPin.length
  const snapY = kPin.y + dy * kPin.length
  
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

function convertGraphic(kGraphic: KicadSymbolIR['graphics'][0]): Primitive[] {
  switch (kGraphic.kind) {
    case 'polyline': {
      if (kGraphic.points.length < 2) return []
      return [{
        kind: 'polyline',
        points: kGraphic.points,
        width: kGraphic.width,
        fill: kGraphic.fill,
      }]
    }
    
    case 'rectangle': {
      const x = Math.min(kGraphic.x1, kGraphic.x2)
      const y = Math.min(kGraphic.y1, kGraphic.y2)
      const w = Math.abs(kGraphic.x2 - kGraphic.x1)
      const h = Math.abs(kGraphic.y2 - kGraphic.y1)
      return [{
        kind: 'rect',
        x, y, w, h,
        fill: kGraphic.fill,
        stroke: { width: kGraphic.width },
      }]
    }
    
    case 'circle': {
      return [{
        kind: 'circle',
        cx: kGraphic.cx,
        cy: kGraphic.cy,
        r: kGraphic.radius,
        fill: kGraphic.fill,
        stroke: { width: kGraphic.width },
      }]
    }
    
    case 'arc': {
      // Arc support (basic - may need refinement for 3-point arcs)
      return [{
        kind: 'arc',
        cx: kGraphic.cx,
        cy: kGraphic.cy,
        r: kGraphic.radius,
        startAngle: kGraphic.startAngle,
        endAngle: kGraphic.endAngle,
        width: kGraphic.width,
      }]
    }
    
    case 'text': {
      return [{
        kind: 'text',
        x: kGraphic.x,
        y: kGraphic.y,
        text: kGraphic.text,
        size: kGraphic.size,
        anchor: 'c', // KiCad text is typically center-anchored
      }]
    }
    
    default:
      return []
  }
}
