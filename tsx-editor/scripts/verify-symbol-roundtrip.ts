import { buildWorkspaceComponentRegistry, buildWorkspaceSymbolRegistry, extractAllSymbols } from '../src/utils/projectManager'
import { createSymbolDocument, generateSymbolTsx, importSymbolTsxToDocument } from '../src/utils/symbolDocument'
import type { FSMap } from '../src/types/catalog'

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message)
}

const normalizeRef = (value: string): string => {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^\/+/, '')
    .replace(/^symbols\/(?:\.editor|editor)\//, '')
    .replace(/^symbols\//, '')
    .replace(/\.symbol\.json$/i, '')
    .replace(/\.(tsx|ts)$/i, '')
}

const resolveSymbolByRef = (fsMap: FSMap, symbolRef: string) => {
  const allSymbols = extractAllSymbols(fsMap)
  const map = new Map<string, ReturnType<typeof extractAllSymbols>[number]>()

  const add = (symbol: ReturnType<typeof extractAllSymbols>[number], alias: string) => {
    const key = normalizeRef(alias)
    if (!key) return
    map.set(key, symbol)
  }

  allSymbols.forEach((symbol) => {
    add(symbol, symbol.id)
    add(symbol, symbol.name)
    add(symbol, symbol.filePath)
    add(symbol, `symbols/${symbol.id}`)
    add(symbol, `symbols/${symbol.id}.tsx`)
    add(symbol, `symbols/.editor/${symbol.id}.symbol.json`)
    add(symbol, `symbols/editor/${symbol.id}.symbol.json`)
  })

  return map.get(normalizeRef(symbolRef))
}

const run = () => {
  const symbolDoc = createSymbolDocument('test1')
  symbolDoc.width = 160
  symbolDoc.height = 120
  symbolDoc.shapes = [
    { id: 'line-1', kind: 'schematicline', x1: 10, y1: 20, x2: 120, y2: 34 },
    { id: 'rect-1', kind: 'schematicrect', center: { x: 70, y: 75 }, width: 46, height: 18 },
    { id: 'circle-1', kind: 'schematiccircle', center: { x: 120, y: 36 }, radius: 20 },
    { id: 'text-1', kind: 'schematictext', schX: 14, schY: 108, text: 'ASYM' }
  ]
  symbolDoc.ports = [
    { id: 'p-left', name: 'VIN', side: 'left', schX: 0, schY: 36, electricalDirection: 'input' },
    { id: 'p-right', name: 'VOUT', side: 'right', schX: 160, schY: 64, electricalDirection: 'output' },
    { id: 'p-top', name: 'EN', side: 'top', schX: 90, schY: 0, electricalDirection: 'input' }
  ]

  const generatedTsx = generateSymbolTsx(symbolDoc)
  const directImport = importSymbolTsxToDocument(generatedTsx, 'test1')

  // A: Symbol Maker -> placed instance (geometry+ports survive symbol extraction path)
  const fsMapA: FSMap = {
    'symbols/test1.tsx': generatedTsx
  }
  const extractedA = extractAllSymbols(fsMapA).find(symbol => symbol.id === 'test1')
  assert(!!extractedA, 'A: expected extracted symbol test1')
  const extractedKinds = new Set((extractedA?.geometry?.shapes || []).map(shape => String((shape as any).kind)))
  assert((extractedA?.geometry?.shapes.length || 0) > 0, 'A: expected non-empty symbol geometry after extraction')
  assert(extractedKinds.has('schematicline'), 'A: expected schematicline to be preserved')
  assert(extractedKinds.has('schematicrect') || extractedKinds.has('schematiccircle'), 'A: expected asymmetric body primitives to be preserved')
  assert((extractedA?.ports.length || 0) === 3, 'A: expected 3 ports from Symbol Maker')

  // B: Missing symbol geometry should be detectable as unresolved reference.
  const missing = resolveSymbolByRef(fsMapA, 'symbols/does-not-exist.tsx')
  assert(!missing, 'B: unresolved symbolRef should remain missing (placeholder path expected in runtime)')

  // C: Rect primitive roundtrip must preserve center + size.
  const reimported = importSymbolTsxToDocument(generatedTsx, 'test1')
  const originalRect = symbolDoc.shapes.find(shape => shape.kind === 'schematicrect') as any
  const roundtripRect = reimported.shapes.find(shape => shape.kind === 'schematicrect') as any
  assert(!!roundtripRect, 'C: roundtrip rect is missing')
  assert(roundtripRect.center.x === originalRect.center.x, 'C: rect center.x changed during roundtrip')
  assert(roundtripRect.center.y === originalRect.center.y, 'C: rect center.y changed during roundtrip')
  assert(roundtripRect.width === originalRect.width, 'C: rect width changed during roundtrip')
  assert(roundtripRect.height === originalRect.height, 'C: rect height changed during roundtrip')

  // D: EFR32PowerChip symbolRef/port-side behavior via registry.
  const efrDoc = createSymbolDocument('EFR32PowerChip')
  efrDoc.width = 200
  efrDoc.height = 120
  efrDoc.shapes = [
    { id: 'efr-body', kind: 'schematicrect', center: { x: 100, y: 60 }, width: 120, height: 70 }
  ]
  efrDoc.ports = [
    { id: 'efr-left-1', name: 'VREGVDD', side: 'left', schX: 0, schY: 28, electricalDirection: 'input' },
    { id: 'efr-left-2', name: 'AVDD', side: 'left', schX: 0, schY: 84, electricalDirection: 'input' },
    { id: 'efr-right-1', name: 'DVDD', side: 'right', schX: 200, schY: 30, electricalDirection: 'output' },
    { id: 'efr-right-2', name: 'DECOUPLE', side: 'right', schX: 200, schY: 88, electricalDirection: 'passive' }
  ]

  const fsMapD: FSMap = {
    ...fsMapA,
    'symbols/EFR32PowerChip.tsx': generateSymbolTsx(efrDoc)
  }

  const componentRegistry = buildWorkspaceComponentRegistry(fsMapD)
  const symbolRegistry = buildWorkspaceSymbolRegistry(fsMapD)
  const componentDef = componentRegistry.EFR32PowerChip
  assert(!!componentDef, 'D: expected EFR32PowerChip component definition')
  assert(!!componentDef?.symbolRef, 'D: expected EFR32PowerChip symbolRef')

  const resolved = symbolRegistry[normalizeRef(componentDef?.symbolRef || '')]
  assert(!!resolved, 'D: EFR32PowerChip symbolRef must resolve in symbol registry')
  assert((resolved?.geometry?.shapes.length || 0) > 0, 'D: EFR32PowerChip should have renderable symbol geometry')
  const leftPorts = (resolved?.ports || []).filter(port => port.side === 'left')
  const rightPorts = (resolved?.ports || []).filter(port => port.side === 'right')
  assert(leftPorts.length >= 1, 'D: expected at least one left-side port')
  assert(rightPorts.length >= 1, 'D: expected at least one right-side port')

  console.log('PASS A: Symbol Maker geometry is preserved for placed symbol extraction path')
  console.log('PASS B: Missing symbol geometry is detectable via unresolved symbolRef')
  console.log('PASS C: Rect primitive center/size survives export-import roundtrip')
  console.log('PASS D: EFR32PowerChip symbolRef resolves with proper geometry and sided ports')
  console.log('All symbol roundtrip checks passed.')
}

run()
