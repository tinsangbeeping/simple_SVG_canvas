import { ElectricalDirection, SymbolDocument, SymbolPort, SymbolPortSide, SymbolSelection, SymbolShape, TscircuitPortDirection } from '../types/symbolDocument'

const SYMBOL_EDITOR_PREFIX = 'symbols/.editor/'
const SYMBOL_EDITOR_SUFFIX = '.symbol.json'

const toSafeSymbolName = (raw: string): string => {
  return raw.trim().replace(/[^a-zA-Z0-9_]/g, '_') || 'MySymbol'
}

export const isSymbolEditorPath = (filePath: string): boolean => {
  return filePath.startsWith(SYMBOL_EDITOR_PREFIX) && filePath.endsWith(SYMBOL_EDITOR_SUFFIX)
}

export const getSymbolNameFromEditorPath = (filePath: string): string => {
  if (!isSymbolEditorPath(filePath)) return 'MySymbol'
  return filePath.slice(SYMBOL_EDITOR_PREFIX.length, -SYMBOL_EDITOR_SUFFIX.length) || 'MySymbol'
}

export const getSymbolEditorPathFromName = (name: string): string => {
  return `${SYMBOL_EDITOR_PREFIX}${toSafeSymbolName(name)}${SYMBOL_EDITOR_SUFFIX}`
}

export const getGeneratedSymbolTsxPath = (name: string): string => {
  return `symbols/${toSafeSymbolName(name)}.tsx`
}

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const normalizeLegacyRectShape = (shape: Record<string, any>): SymbolShape => {
  const width = Math.abs(toFiniteNumber(shape.width))
  const height = Math.abs(toFiniteNumber(shape.height))
  const x = toFiniteNumber(shape.x ?? shape.schX ?? (shape.center ? shape.center.x - width / 2 : 0))
  const y = toFiniteNumber(shape.y ?? shape.schY ?? (shape.center ? shape.center.y - height / 2 : 0))

  return {
    id: String(shape.id || `rect-${Date.now()}`),
    kind: 'schematicrect',
    x,
    y,
    width,
    height
  }
}

const normalizeLegacyCircleShape = (shape: Record<string, any>): SymbolShape => {
  const cx = toFiniteNumber(shape.cx ?? shape.center?.x ?? shape.x)
  const cy = toFiniteNumber(shape.cy ?? shape.center?.y ?? shape.y)

  return {
    id: String(shape.id || `circle-${Date.now()}`),
    kind: 'schematiccircle',
    cx,
    cy,
    radius: Math.abs(toFiniteNumber(shape.radius))
  }
}

const normalizeLegacyArcShape = (shape: Record<string, any>): SymbolShape => {
  const cx = toFiniteNumber(shape.cx ?? shape.center?.x ?? shape.x)
  const cy = toFiniteNumber(shape.cy ?? shape.center?.y ?? shape.y)

  return {
    id: String(shape.id || `arc-${Date.now()}`),
    kind: 'schematicarc',
    cx,
    cy,
    radius: Math.abs(toFiniteNumber(shape.radius)),
    startAngle: toFiniteNumber(shape.startAngle ?? shape.startAngleDegrees),
    endAngle: toFiniteNumber(shape.endAngle ?? shape.endAngleDegrees)
  }
}

const normalizeLegacyTextShape = (shape: Record<string, any>): SymbolShape => {
  return {
    id: String(shape.id || `text-${Date.now()}`),
    kind: 'schematictext',
    x: toFiniteNumber(shape.x ?? shape.schX),
    y: toFiniteNumber(shape.y ?? shape.schY),
    text: String(shape.text || '')
  }
}

const normalizeSymbolShape = (shape: Record<string, any>): SymbolShape | null => {
  if (!shape || typeof shape !== 'object') return null
  const shapeKind = String(shape.kind || shape.type || '')

  if (shapeKind === 'schematicline') {
    return {
      id: String(shape.id || `line-${Date.now()}`),
      kind: 'schematicline',
      x1: toFiniteNumber(shape.x1),
      y1: toFiniteNumber(shape.y1),
      x2: toFiniteNumber(shape.x2),
      y2: toFiniteNumber(shape.y2)
    }
  }

  if (shapeKind === 'schematicrect') return normalizeLegacyRectShape(shape)
  if (shapeKind === 'schematiccircle') return normalizeLegacyCircleShape(shape)
  if (shapeKind === 'schematicarc') return normalizeLegacyArcShape(shape)
  if (shapeKind === 'schematictext') return normalizeLegacyTextShape(shape)

  return null
}

const normalizeSymbolPort = (port: Record<string, any>, fallbackOrder: number): SymbolPort | null => {
  if (!port || typeof port !== 'object') return null
  const name = String(port.name || '').trim()
  if (!name) return null
  return {
    id: String(port.id || `port-${Date.now()}-${fallbackOrder}`),
    name,
    electricalDirection: port.electricalDirection,
    side: port.side,
    order: port.order !== undefined ? Number(port.order) : fallbackOrder,
    x: toFiniteNumber(port.x ?? port.schX),
    y: toFiniteNumber(port.y ?? port.schY)
  }
}

export const createSymbolDocument = (name: string): SymbolDocument => {
  return {
    kind: 'symbol',
    name: toSafeSymbolName(name),
    description: '',
    width: 120,
    height: 80,
    shapes: [],
    ports: []
  }
}

export const parseSymbolDocument = (raw: string, fallbackName: string): SymbolDocument | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<SymbolDocument>
    if (parsed.kind !== 'symbol') return null

    const normalizedShapes = (Array.isArray(parsed.shapes) ? parsed.shapes : [])
      .map(shape => normalizeSymbolShape(shape as Record<string, any>))
      .filter(Boolean) as SymbolShape[]

    const normalizedPorts = (Array.isArray(parsed.ports) ? parsed.ports : [])
      .map((port, index) => normalizeSymbolPort(port as Record<string, any>, index))
      .filter(Boolean) as SymbolPort[]

    return {
      kind: 'symbol',
      name: toSafeSymbolName(String(parsed.name || fallbackName || 'MySymbol')),
      description: String(parsed.description || ''),
      width: Number(parsed.width || 120),
      height: Number(parsed.height || 80),
      needsManualReview: !!parsed.needsManualReview,
      shapes: normalizedShapes,
      ports: normalizedPorts
    }
  } catch {
    return null
  }
}

const toTsxNumber = (value: number): string => {
  const rounded = Number(value.toFixed(3))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

const escapeStringLiteral = (value: string): string => {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const isRenderableSymbolShape = (shape: SymbolShape): boolean => {
  if (shape.kind === 'schematicline') {
    return shape.x1 !== shape.x2 || shape.y1 !== shape.y2
  }

  if (shape.kind === 'schematicrect') {
    return Math.abs(shape.width) > 0 && Math.abs(shape.height) > 0
  }

  if (shape.kind === 'schematiccircle') {
    return Math.abs(shape.radius) > 0
  }

  if (shape.kind === 'schematicarc') {
    const delta = Math.abs(((shape.endAngle - shape.startAngle) % 360 + 360) % 360)
    return Math.abs(shape.radius) > 0 && delta > 0
  }

  if (shape.kind === 'schematictext') {
    return shape.text.trim().length > 0
  }

  return false
}

const symbolShapeToTsx = (shape: SymbolShape): string => {
  if (shape.kind === 'schematicline') {
    return `<schematicline x1={${toTsxNumber(shape.x1)}} y1={${toTsxNumber(shape.y1)}} x2={${toTsxNumber(shape.x2)}} y2={${toTsxNumber(shape.y2)}} />`
  }

  if (shape.kind === 'schematicrect') {
    return `<schematicrect x={${toTsxNumber(shape.x)}} y={${toTsxNumber(shape.y)}} width={${toTsxNumber(shape.width)}} height={${toTsxNumber(shape.height)}} />`
  }

  if (shape.kind === 'schematiccircle') {
    return `<schematiccircle cx={${toTsxNumber(shape.cx)}} cy={${toTsxNumber(shape.cy)}} radius={${toTsxNumber(shape.radius)}} />`
  }

  if (shape.kind === 'schematicarc') {
    return `<schematicarc cx={${toTsxNumber(shape.cx)}} cy={${toTsxNumber(shape.cy)}} radius={${toTsxNumber(shape.radius)}} startAngle={${toTsxNumber(shape.startAngle)}} endAngle={${toTsxNumber(shape.endAngle)}} />`
  }

  return `<schematictext x={${toTsxNumber(shape.x)}} y={${toTsxNumber(shape.y)}} text="${escapeStringLiteral(shape.text)}" />`
}

const symbolPortToTsx = (port: SymbolPort, symbolWidth: number, symbolHeight: number): string => {
  const sideToTscDirection: Record<SymbolPortSide, TscircuitPortDirection> = {
    left: 'left',
    right: 'right',
    top: 'up',
    bottom: 'down'
  }
  const normalizedCoord = (() => {
    if (port.side === 'left') return { x: 0, y: port.y }
    if (port.side === 'right') return { x: symbolWidth, y: port.y }
    if (port.side === 'top') return { x: port.x, y: 0 }
    return { x: port.x, y: symbolHeight }
  })()
  const sidePart = ` side="${port.side}"`
  const orderPart = port.order !== undefined ? ` order={${port.order}}` : ''
  const direction = sideToTscDirection[port.side]
  return `<port name="${escapeStringLiteral(port.name)}" direction="${direction}"${sidePart}${orderPart} x={${toTsxNumber(normalizedCoord.x)}} y={${toTsxNumber(normalizedCoord.y)}} />`
}

const toSafeComponentIdentifier = (raw: string): string => {
  const safe = toSafeSymbolName(raw)
  if (/^[0-9]/.test(safe)) return `Symbol_${safe}`
  return safe
}

const normalizeSymbolDocumentLocal = (document: SymbolDocument): { normalizedShapes: SymbolShape[]; normalizedPorts: SymbolPort[]; width: number; height: number } => {
  const normalizedShapes = (document.shapes as Array<Record<string, any>>)
    .map(shape => normalizeSymbolShape(shape))
    .filter(Boolean) as SymbolShape[]

  const normalizedPorts = (document.ports as Array<Record<string, any>>)
    .map((port, index) => normalizeSymbolPort(port, index))
    .filter(Boolean) as SymbolPort[]

  return {
    normalizedShapes,
    normalizedPorts,
    width: Math.max(20, Number(document.width || 120)),
    height: Math.max(20, Number(document.height || 80))
  }
}

export const generateSymbolTsx = (document: SymbolDocument): string => {
  const fnName = toSafeComponentIdentifier(document.name || 'MySymbol')
  const normalized = normalizeSymbolDocumentLocal(document)
  const symbolWidth = Math.max(20, Number(normalized.width || 120))
  const symbolHeight = Math.max(20, Number(normalized.height || 80))
  const rows = [
    ...normalized.normalizedShapes.filter(isRenderableSymbolShape).map(symbolShapeToTsx),
    ...normalized.normalizedPorts.map(port => symbolPortToTsx(port, symbolWidth, symbolHeight))
  ]

  const body = rows.length > 0
    ? rows.map(row => `          ${row}`).join('\n')
    : '          {/* Empty symbol */}'

  return `export default function ${fnName}(props: { name: string; schX?: number; schY?: number }) {\n  return (\n    <chip\n      name={props.name}\n      schX={props.schX}\n      schY={props.schY}\n      symbol={\n        <symbol>\n${body}\n        </symbol>\n      }\n    />\n  )\n}\n`
}

const parseNumericProp = (tag: string, propName: string): { value: number | null; dynamic: boolean } => {
  const exprMatch = tag.match(new RegExp(`${propName}\\s*=\\s*\\{([^}]+)\\}`))
  if (exprMatch?.[1] !== undefined) {
    const raw = exprMatch[1].trim()
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
      return { value: Number(raw), dynamic: false }
    }
    return { value: null, dynamic: true }
  }

  const stringMatch = tag.match(new RegExp(`${propName}\\s*=\\s*[\"']([^\"']+)[\"']`))
  if (stringMatch?.[1] !== undefined) {
    const raw = stringMatch[1].trim()
    if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
      return { value: Number(raw), dynamic: false }
    }
    return { value: null, dynamic: true }
  }

  return { value: null, dynamic: false }
}

const parseStringProp = (tag: string, propName: string): { value: string | null; dynamic: boolean } => {
  const stringMatch = tag.match(new RegExp(`${propName}\\s*=\\s*[\"']([^\"']*)[\"']`))
  if (stringMatch?.[1] !== undefined) {
    return { value: String(stringMatch[1]), dynamic: false }
  }

  const exprMatch = tag.match(new RegExp(`${propName}\\s*=\\s*\\{([^}]+)\\}`))
  if (exprMatch?.[1] !== undefined) {
    const raw = exprMatch[1].trim()
    const quoted = raw.match(/^[\"']([\s\S]*)[\"']$/)
    if (quoted) {
      return { value: quoted[1], dynamic: false }
    }
    return { value: null, dynamic: true }
  }

  return { value: null, dynamic: false }
}

const parseCoordinatePair = (tag: string, firstProp: string, secondProp: string): { x: number | null; y: number | null; dynamic: boolean } => {
  const first = parseNumericProp(tag, firstProp)
  const second = parseNumericProp(tag, secondProp)
  const dynamic = first.dynamic || second.dynamic
  if (first.value === null || second.value === null) {
    return { x: first.value, y: second.value, dynamic }
  }
  return { x: first.value, y: second.value, dynamic }
}

const parseCenterLike = (tag: string): { cx: number | null; cy: number | null; dynamic: boolean } => {
  const direct = parseCoordinatePair(tag, 'cx', 'cy')
  if (direct.x !== null && direct.y !== null) {
    return { cx: direct.x, cy: direct.y, dynamic: direct.dynamic }
  }

  const legacyCenter = tag.match(/center\s*=\s*\{\{\s*x\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*y\s*:\s*(-?\d+(?:\.\d+)?)\s*\}\}/)
  if (legacyCenter) {
    return { cx: Number(legacyCenter[1]), cy: Number(legacyCenter[2]), dynamic: false }
  }

  const legacyXY = parseCoordinatePair(tag, 'x', 'y')
  return { cx: legacyXY.x, cy: legacyXY.y, dynamic: legacyXY.dynamic || /center\s*=/.test(tag) }
}

const nextImportedId = (() => {
  let index = 0
  return (prefix: string): string => {
    index += 1
    return `${prefix}-${index}`
  }
})()

export const importSymbolTsxToDocument = (tsx: string, symbolNameHint: string): SymbolDocument => {
  const body = tsx.match(/<symbol\b[^>]*>([\s\S]*?)<\/symbol>/)?.[1] || ''
  const document = createSymbolDocument(symbolNameHint)
  let needsManualReview = false

  const lineTags = [...body.matchAll(/<schematicline\b[^>]*\/?>(?:<\/schematicline>)?/g)].map(match => match[0])
  lineTags.forEach(tag => {
    const x1 = parseNumericProp(tag, 'x1')
    const y1 = parseNumericProp(tag, 'y1')
    const x2 = parseNumericProp(tag, 'x2')
    const y2 = parseNumericProp(tag, 'y2')
    if ([x1.value, y1.value, x2.value, y2.value].every(v => v !== null)) {
      document.shapes.push({ id: nextImportedId('line'), kind: 'schematicline', x1: x1.value as number, y1: y1.value as number, x2: x2.value as number, y2: y2.value as number })
    } else {
      needsManualReview = needsManualReview || x1.dynamic || y1.dynamic || x2.dynamic || y2.dynamic
    }
  })

  const rectTags = [...body.matchAll(/<schematicrect\b[^>]*\/?>(?:<\/schematicrect>)?/g)].map(match => match[0])
  rectTags.forEach(tag => {
    const x = parseNumericProp(tag, 'x')
    const y = parseNumericProp(tag, 'y')
    const width = parseNumericProp(tag, 'width')
    const height = parseNumericProp(tag, 'height')
    if ([x.value, y.value, width.value, height.value].every(v => v !== null)) {
      document.shapes.push({
        id: nextImportedId('rect'),
        kind: 'schematicrect',
        x: x.value as number,
        y: y.value as number,
        width: width.value as number,
        height: height.value as number
      })
    } else {
      needsManualReview = needsManualReview || x.dynamic || y.dynamic || width.dynamic || height.dynamic || /center\s*=/.test(tag)
    }
  })

  const circleTags = [...body.matchAll(/<schematiccircle\b[^>]*\/?>(?:<\/schematiccircle>)?/g)].map(match => match[0])
  circleTags.forEach(tag => {
    const center = parseCenterLike(tag)
    const radius = parseNumericProp(tag, 'radius')
    if (center.cx !== null && center.cy !== null && radius.value !== null) {
      document.shapes.push({ id: nextImportedId('circle'), kind: 'schematiccircle', cx: center.cx, cy: center.cy, radius: radius.value })
    } else {
      needsManualReview = needsManualReview || center.dynamic || radius.dynamic
    }
  })

  const arcTags = [...body.matchAll(/<schematicarc\b[^>]*\/?>(?:<\/schematicarc>)?/g)].map(match => match[0])
  arcTags.forEach(tag => {
    const center = parseCenterLike(tag)
    const radius = parseNumericProp(tag, 'radius')
    const startAngle = parseNumericProp(tag, 'startAngle')
    const endAngle = parseNumericProp(tag, 'endAngle')
    if (center.cx !== null && center.cy !== null && radius.value !== null && startAngle.value !== null && endAngle.value !== null) {
      document.shapes.push({
        id: nextImportedId('arc'),
        kind: 'schematicarc',
        cx: center.cx,
        cy: center.cy,
        radius: radius.value,
        startAngle: startAngle.value,
        endAngle: endAngle.value
      })
    } else {
      needsManualReview = needsManualReview || center.dynamic || radius.dynamic || startAngle.dynamic || endAngle.dynamic
    }
  })

  const textTags = [...body.matchAll(/<schematictext\b[^>]*\/?>(?:<\/schematictext>)?/g)].map(match => match[0])
  textTags.forEach(tag => {
    const x = parseNumericProp(tag, 'x')
    const y = parseNumericProp(tag, 'y')
    const text = parseStringProp(tag, 'text')
    if (x.value !== null && y.value !== null && text.value !== null) {
      document.shapes.push({
        id: nextImportedId('text'),
        kind: 'schematictext',
        x: x.value,
        y: y.value,
        text: text.value
      })
    } else {
      needsManualReview = needsManualReview || x.dynamic || y.dynamic || text.dynamic
    }
  })

  const portTags = [...body.matchAll(/<port\b[^>]*\/?>(?:<\/port>)?/g)].map(match => match[0])
  portTags.forEach(tag => {
    const name = parseStringProp(tag, 'name')
    const direction = parseStringProp(tag, 'direction')
    const side = parseStringProp(tag, 'side')
    const order = parseNumericProp(tag, 'order')
    const x = parseNumericProp(tag, 'x')
    const y = parseNumericProp(tag, 'y')
    if (name.value !== null) {
      const rawDirection = String(direction.value || 'passive').toLowerCase()
      const validElectricalDirections: ElectricalDirection[] = ['input', 'output', 'inout', 'passive']
      const directionAsSide: Record<string, SymbolPortSide> = {
        left: 'left',
        right: 'right',
        top: 'top',
        bottom: 'bottom',
        up: 'top',
        down: 'bottom'
      }
      const parsedElectricalDirection = validElectricalDirections.includes(rawDirection as ElectricalDirection)
        ? (rawDirection as ElectricalDirection)
        : undefined
      const sideValue = String(side.value || '').toLowerCase()
      const parsedSide = ((): SymbolPortSide => {
        if (sideValue in directionAsSide) return directionAsSide[sideValue]
        if (rawDirection in directionAsSide) return directionAsSide[rawDirection]
        const px = x.value !== null ? x.value : 0
        const py = y.value !== null ? y.value : 0
        const absX = Math.abs(px)
        const absY = Math.abs(py)
        if (absX >= absY) return px >= 0 ? 'right' : 'left'
        return py >= 0 ? 'bottom' : 'top'
      })()
      document.ports.push({
        id: nextImportedId('port'),
        name: name.value,
        electricalDirection: parsedElectricalDirection,
        side: parsedSide,
        order: order.value !== null ? order.value : undefined,
        x: x.value !== null ? x.value : 0,
        y: y.value !== null ? y.value : 0
      })
      if (x.value === null || y.value === null) {
        needsManualReview = true
      }
    } else {
      needsManualReview = needsManualReview || name.dynamic || direction.dynamic || x.dynamic || y.dynamic
    }
  })

  if (/\{[^}]*=>|\{[^}]*\bprops\b|\{[^}]*\bmap\b/.test(body)) {
    needsManualReview = true
  }

  document.needsManualReview = needsManualReview
  return document
}

export const updateSymbolSelectionAfterDelete = (
  selection: SymbolSelection,
  deletedId: string,
  deletedKind: 'shape' | 'port'
): SymbolSelection => {
  if (!selection) return null
  if (selection.kind === 'multi') {
    const shapeIds = deletedKind === 'shape'
      ? selection.shapeIds.filter(id => id !== deletedId)
      : selection.shapeIds
    const portIds = deletedKind === 'port'
      ? selection.portIds.filter(id => id !== deletedId)
      : selection.portIds
    if (shapeIds.length === 0 && portIds.length === 0) return null
    if (shapeIds.length === 1 && portIds.length === 0) return { kind: 'shape', id: shapeIds[0] }
    if (portIds.length === 1 && shapeIds.length === 0) return { kind: 'port', id: portIds[0] }
    return { kind: 'multi', shapeIds, portIds }
  }
  if (selection.kind === deletedKind && selection.id === deletedId) return null
  return selection
}
