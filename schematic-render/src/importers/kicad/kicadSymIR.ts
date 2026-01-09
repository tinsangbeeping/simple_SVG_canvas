import { parseSExp, findAll, findOne, type SExp } from './sexp'
import type { KicadSymbolIR, KicadSymFileIR, KicadPin, KicadGraphic, KicadPinOrientation } from './types'

/**
 * Parse a .kicad_sym file into intermediate representation (IR)
 * This preserves KiCad coordinates and structure without converting to SymbolDef yet
 */
export function parseKiCadSymFileToIR(content: string, filename: string): KicadSymFileIR {
  const root = parseSExp(content)
  
  if (!Array.isArray(root) || root[0] !== 'kicad_symbol_lib') {
    throw new Error('Not a valid kicad_symbol_lib file')
  }
  
  const symbolNodes = findAll(root, 'symbol')
  const symbols: KicadSymbolIR[] = []
  
  for (const symNode of symbolNodes) {
    if (!Array.isArray(symNode)) continue
    const ir = extractSymbolIR(symNode)
    if (ir) symbols.push(ir)
  }
  
  return { file: filename, symbols }
}

function extractSymbolIR(symNode: SExp[]): KicadSymbolIR | null {
  const name = extractSymbolName(symNode)
  if (!name) return null
  
  const pins = extractPins(symNode)
  const graphics = extractGraphics(symNode)
  
  return { name, pins, graphics }
}

function extractSymbolName(symNode: SExp[]): string {
  // (symbol "R" ...) or (symbol "R:1" ...)
  if (symNode.length < 2) return ''
  const nameToken = symNode[1]
  if (typeof nameToken !== 'string') return ''
  // Strip unit suffix (e.g., "R:1" → "R")
  return nameToken.split(':')[0]
}

function extractPins(symNode: SExp[]): KicadPin[] {
  const pins: KicadPin[] = []
  
  function walk(node: SExp) {
    if (!Array.isArray(node)) return
    
    if (node[0] === 'pin') {
      const pin = parsePin(node)
      if (pin) pins.push(pin)
      return
    }
    
    for (const child of node) {
      walk(child)
    }
  }
  
  walk(symNode)
  return pins
}

function parsePin(pinNode: SExp[]): KicadPin | null {
  // (pin passive line (at 0 3.81 270) (length 1.27) (name "~") (number "1"))
  if (pinNode.length < 2) return null
  
  const electricalType = typeof pinNode[1] === 'string' ? pinNode[1] : undefined
  
  const atNode = findOne(pinNode, 'at')
  if (!atNode || atNode.length < 3) return null
  
  const x = parseFloat(String(atNode[1]))
  const y = parseFloat(String(atNode[2]))
  const angle = atNode.length > 3 ? parseFloat(String(atNode[3])) : 0
  
  const lengthNode = findOne(pinNode, 'length')
  const length = lengthNode && lengthNode.length > 1 ? parseFloat(String(lengthNode[1])) : 2.54
  
  const nameNode = findOne(pinNode, 'name')
  const name = nameNode && nameNode.length > 1 ? String(nameNode[1]) : '~'
  
  const numberNode = findOne(pinNode, 'number')
  const number = numberNode && numberNode.length > 1 ? String(numberNode[1]) : '?'
  
  // Convert angle to orientation
  const orientation = angleToOrientation(angle)
  
  return { name, number, x, y, length, orientation, electricalType }
}

function angleToOrientation(angle: number): KicadPinOrientation {
  // KiCad pin angles: 0=right, 90=up, 180=left, 270=down
  const normalized = ((angle % 360) + 360) % 360
  if (normalized >= 315 || normalized < 45) return 'right'
  if (normalized >= 45 && normalized < 135) return 'up'
  if (normalized >= 135 && normalized < 225) return 'left'
  return 'down'
}

function extractGraphics(symNode: SExp[]): KicadGraphic[] {
  const graphics: KicadGraphic[] = []
  
  function walk(node: SExp) {
    if (!Array.isArray(node)) return
    
    const head = node[0]
    if (typeof head === 'string') {
      const graphic = parseGraphic(node)
      if (graphic) {
        graphics.push(graphic)
        return // don't recurse into graphic children
      }
    }
    
    for (const child of node) {
      walk(child)
    }
  }
  
  walk(symNode)
  return graphics
}

function parseGraphic(node: SExp[]): KicadGraphic | null {
  const kind = node[0]
  if (typeof kind !== 'string') return null
  
  switch (kind) {
    case 'polyline': {
      const ptsNode = findOne(node, 'pts')
      if (!ptsNode) return null
      const points = extractPoints(ptsNode)
      const strokeNode = findOne(node, 'stroke')
      const width = strokeNode ? extractStrokeWidth(strokeNode) : 0.254
      const fillNode = findOne(node, 'fill')
      const fill = fillNode ? extractFillType(fillNode) !== 'none' : false
      return { kind: 'polyline', points, width, fill }
    }
    
    case 'rectangle': {
      const startNode = findOne(node, 'start')
      const endNode = findOne(node, 'end')
      if (!startNode || !endNode || startNode.length < 3 || endNode.length < 3) return null
      const x1 = parseFloat(String(startNode[1]))
      const y1 = parseFloat(String(startNode[2]))
      const x2 = parseFloat(String(endNode[1]))
      const y2 = parseFloat(String(endNode[2]))
      const strokeNode = findOne(node, 'stroke')
      const width = strokeNode ? extractStrokeWidth(strokeNode) : 0.254
      const fillNode = findOne(node, 'fill')
      const fill = fillNode ? extractFillType(fillNode) !== 'none' : false
      return { kind: 'rectangle', x1, y1, x2, y2, width, fill }
    }
    
    case 'circle': {
      const centerNode = findOne(node, 'center')
      const radiusNode = findOne(node, 'radius')
      if (!centerNode || !radiusNode || centerNode.length < 3 || radiusNode.length < 2) return null
      const cx = parseFloat(String(centerNode[1]))
      const cy = parseFloat(String(centerNode[2]))
      const radius = parseFloat(String(radiusNode[1]))
      const strokeNode = findOne(node, 'stroke')
      const width = strokeNode ? extractStrokeWidth(strokeNode) : 0.254
      const fillNode = findOne(node, 'fill')
      const fill = fillNode ? extractFillType(fillNode) !== 'none' : false
      return { kind: 'circle', cx, cy, radius, width, fill }
    }
    
    case 'arc': {
      const startNode = findOne(node, 'start')
      const midNode = findOne(node, 'mid')
      const endNode = findOne(node, 'end')
      if (!startNode || !midNode || !endNode) return null
      // Simplified: compute center/radius/angles from 3-point arc (not implemented fully here)
      // For now, return a placeholder
      return { kind: 'arc', cx: 0, cy: 0, radius: 1, startAngle: 0, endAngle: 90, width: 0.254 }
    }
    
    case 'text': {
      const atNode = findOne(node, 'at')
      if (!atNode || atNode.length < 3) return null
      const x = parseFloat(String(atNode[1]))
      const y = parseFloat(String(atNode[2]))
      const angle = atNode.length > 3 ? parseFloat(String(atNode[3])) : 0
      const effectsNode = findOne(node, 'effects')
      const size = effectsNode ? extractTextSize(effectsNode) : 1.27
      const text = node.length > 1 && typeof node[1] === 'string' ? node[1] : ''
      return { kind: 'text', x, y, text, size, angle }
    }
    
    default:
      return null
  }
}

function extractPoints(ptsNode: SExp[]): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  for (const child of ptsNode) {
    if (Array.isArray(child) && child[0] === 'xy' && child.length >= 3) {
      const x = parseFloat(String(child[1]))
      const y = parseFloat(String(child[2]))
      points.push({ x, y })
    }
  }
  return points
}

function extractStrokeWidth(strokeNode: SExp[]): number {
  const widthNode = findOne(strokeNode, 'width')
  if (widthNode && widthNode.length > 1) {
    return parseFloat(String(widthNode[1]))
  }
  return 0.254 // default
}

function extractFillType(fillNode: SExp[]): string {
  const typeNode = findOne(fillNode, 'type')
  if (typeNode && typeNode.length > 1) {
    return String(typeNode[1])
  }
  return 'none'
}

function extractTextSize(effectsNode: SExp[]): number {
  const fontNode = findOne(effectsNode, 'font')
  if (!fontNode) return 1.27
  const sizeNode = findOne(fontNode, 'size')
  if (sizeNode && sizeNode.length >= 3) {
    return parseFloat(String(sizeNode[1]))
  }
  return 1.27
}
