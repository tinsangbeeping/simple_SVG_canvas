import { parseSExp, findAll, type SExp } from './sexp'

export interface SymbolSummary {
  name: string
  pinCount: number
  graphicPrimitiveCount: number
}

export interface KiCadSymFileSummary {
  file: string
  symbols: SymbolSummary[]
}

/**
 * Parse a .kicad_sym file and extract summary info
 */
export function summarizeKiCadSymFile(content: string, filename: string): KiCadSymFileSummary {
  const root = parseSExp(content)
  
  if (!Array.isArray(root) || root[0] !== 'kicad_symbol_lib') {
    throw new Error('Not a valid kicad_symbol_lib file')
  }
  
  const symbolNodes = findAll(root, 'symbol')
  const symbols: SymbolSummary[] = []
  
  for (const symNode of symbolNodes) {
    if (!Array.isArray(symNode)) continue
    const name = extractSymbolName(symNode)
    const pinCount = countPins(symNode)
    const graphicPrimitiveCount = countGraphicPrimitives(symNode)
    
    symbols.push({ name, pinCount, graphicPrimitiveCount })
  }
  
  return { file: filename, symbols }
}

function extractSymbolName(symNode: SExp[]): string {
  // (symbol "R" ...)
  if (symNode.length < 2) return 'unknown'
  const nameToken = symNode[1]
  return typeof nameToken === 'string' ? nameToken : 'unknown'
}

function countPins(symNode: SExp[]): number {
  // Pins can be in (symbol "R:1" (pin ...)) or nested deeper
  // Recursively count all (pin ...) nodes
  let count = 0
  
  function walk(node: SExp) {
    if (!Array.isArray(node)) return
    
    if (node[0] === 'pin') {
      count++
      return
    }
    
    for (const child of node) {
      walk(child)
    }
  }
  
  walk(symNode)
  return count
}

function countGraphicPrimitives(symNode: SExp[]): number {
  // Graphics: (polyline ...), (rectangle ...), (circle ...), (arc ...), (text ...)
  let count = 0
  
  const graphicKinds = ['polyline', 'rectangle', 'circle', 'arc', 'text']
  
  function walk(node: SExp) {
    if (!Array.isArray(node)) return
    
    const head = node[0]
    if (typeof head === 'string' && graphicKinds.includes(head)) {
      count++
      return
    }
    
    for (const child of node) {
      walk(child)
    }
  }
  
  walk(symNode)
  return count
}
