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

    const normalizedShapes = (Array.isArray(parsed.shapes) ? parsed.shapes : []).map((shape: any) => {
      if (shape?.kind === 'schematicrect') {
        if (shape.center && Number.isFinite(Number(shape.center.x)) && Number.isFinite(Number(shape.center.y))) {
          return {
            ...shape,
            center: {
              x: Number(shape.center.x),
              y: Number(shape.center.y)
            },
            width: Number(shape.width || 0),
            height: Number(shape.height || 0)
          }
        }

        // Legacy migration: schX/schY used as top-left in older JSON.
        const schX = Number(shape.schX || 0)
        const schY = Number(shape.schY || 0)
        const width = Number(shape.width || 0)
        const height = Number(shape.height || 0)
        return {
          ...shape,
          center: {
            x: schX + width / 2,
            y: schY + height / 2
          },
          width,
          height
        }
      }

      return shape
    })

    return {
      kind: 'symbol',
      name: toSafeSymbolName(String(parsed.name || fallbackName || 'MySymbol')),
      description: String(parsed.description || ''),
      width: Number(parsed.width || 120),
      height: Number(parsed.height || 80),
      needsManualReview: !!parsed.needsManualReview,
      shapes: normalizedShapes as SymbolShape[],
      ports: Array.isArray(parsed.ports) ? (parsed.ports as SymbolPort[]) : []
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
    const delta = Math.abs(((shape.endAngleDegrees - shape.startAngleDegrees) % 360 + 360) % 360)
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
    return `<schematicrect schX={${toTsxNumber(shape.center.x)}} schY={${toTsxNumber(shape.center.y)}} width={${toTsxNumber(shape.width)}} height={${toTsxNumber(shape.height)}} />`
  }

  if (shape.kind === 'schematiccircle') {
    return `<schematiccircle center={{ x: ${toTsxNumber(shape.center.x)}, y: ${toTsxNumber(shape.center.y)} }} radius={${toTsxNumber(shape.radius)}} />`
  }

  if (shape.kind === 'schematicarc') {
    return `<schematicarc center={{ x: ${toTsxNumber(shape.center.x)}, y: ${toTsxNumber(shape.center.y)} }} radius={${toTsxNumber(shape.radius)}} startAngleDegrees={${toTsxNumber(shape.startAngleDegrees)}} endAngleDegrees={${toTsxNumber(shape.endAngleDegrees)}} />`
  }

  return `<schematictext schX={${toTsxNumber(shape.schX)}} schY={${toTsxNumber(shape.schY)}} text="${escapeStringLiteral(shape.text)}" />`
}

const symbolPortToTsx = (port: SymbolPort, symbolWidth: number, symbolHeight: number): string => {
  const sideToTscDirection: Record<SymbolPortSide, TscircuitPortDirection> = {
    left: 'left',
    right: 'right',
    top: 'up',
    bottom: 'down'
  }
  const normalizedCoord = (() => {
    if (port.side === 'left') return { schX: 0, schY: port.schY }
    if (port.side === 'right') return { schX: symbolWidth, schY: port.schY }
    if (port.side === 'top') return { schX: port.schX, schY: 0 }
    return { schX: port.schX, schY: symbolHeight }
  })()
  const sidePart = ` side="${port.side}"`
  const orderPart = port.order !== undefined ? ` order={${port.order}}` : ''
  const direction = sideToTscDirection[port.side]
  return `<port name="${escapeStringLiteral(port.name)}" direction="${direction}"${sidePart}${orderPart} schX={${toTsxNumber(normalizedCoord.schX)}} schY={${toTsxNumber(normalizedCoord.schY)}} />`
}

const toSafeComponentIdentifier = (raw: string): string => {
  const safe = toSafeSymbolName(raw)
  if (/^[0-9]/.test(safe)) return `Symbol_${safe}`
  return safe
}

export const generateSymbolTsx = (document: SymbolDocument): string => {
  const fnName = toSafeComponentIdentifier(document.name || 'MySymbol')
  const symbolWidth = Math.max(20, Number(document.width || 120))
  const symbolHeight = Math.max(20, Number(document.height || 80))
  const rows = [
    ...document.shapes.filter(isRenderableSymbolShape).map(symbolShapeToTsx),
    ...document.ports.map(port => symbolPortToTsx(port, symbolWidth, symbolHeight))
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

const parseCenter = (tag: string): { center: { x: number; y: number } | null; dynamic: boolean } => {
  const match = tag.match(/center\s*=\s*\{\{\s*x\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*y\s*:\s*(-?\d+(?:\.\d+)?)\s*\}\}/)
  if (match) {
    return {
      center: { x: Number(match[1]), y: Number(match[2]) },
      dynamic: false
    }
  }

  if (/center\s*=/.test(tag)) {
    return { center: null, dynamic: true }
  }

  return { center: null, dynamic: false }
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
    const schX = parseNumericProp(tag, 'schX')
    const schY = parseNumericProp(tag, 'schY')
    const width = parseNumericProp(tag, 'width')
    const height = parseNumericProp(tag, 'height')
    if ([schX.value, schY.value, width.value, height.value].every(v => v !== null)) {
      document.shapes.push({
        id: nextImportedId('rect'),
        kind: 'schematicrect',
        center: {
          x: schX.value as number,
          y: schY.value as number
        },
        width: width.value as number,
        height: height.value as number
      })
    } else {
      needsManualReview = needsManualReview || schX.dynamic || schY.dynamic || width.dynamic || height.dynamic
    }
  })

  const circleTags = [...body.matchAll(/<schematiccircle\b[^>]*\/?>(?:<\/schematiccircle>)?/g)].map(match => match[0])
  circleTags.forEach(tag => {
    const center = parseCenter(tag)
    const radius = parseNumericProp(tag, 'radius')
    if (center.center && radius.value !== null) {
      document.shapes.push({ id: nextImportedId('circle'), kind: 'schematiccircle', center: center.center, radius: radius.value })
    } else {
      needsManualReview = needsManualReview || center.dynamic || radius.dynamic
    }
  })

  const arcTags = [...body.matchAll(/<schematicarc\b[^>]*\/?>(?:<\/schematicarc>)?/g)].map(match => match[0])
  arcTags.forEach(tag => {
    const center = parseCenter(tag)
    const radius = parseNumericProp(tag, 'radius')
    const startAngle = parseNumericProp(tag, 'startAngleDegrees')
    const endAngle = parseNumericProp(tag, 'endAngleDegrees')
    if (center.center && radius.value !== null && startAngle.value !== null && endAngle.value !== null) {
      document.shapes.push({
        id: nextImportedId('arc'),
        kind: 'schematicarc',
        center: center.center,
        radius: radius.value,
        startAngleDegrees: startAngle.value,
        endAngleDegrees: endAngle.value
      })
    } else {
      needsManualReview = needsManualReview || center.dynamic || radius.dynamic || startAngle.dynamic || endAngle.dynamic
    }
  })

  const textTags = [...body.matchAll(/<schematictext\b[^>]*\/?>(?:<\/schematictext>)?/g)].map(match => match[0])
  textTags.forEach(tag => {
    const schX = parseNumericProp(tag, 'schX')
    const schY = parseNumericProp(tag, 'schY')
    const text = parseStringProp(tag, 'text')
    if (schX.value !== null && schY.value !== null && text.value !== null) {
      document.shapes.push({
        id: nextImportedId('text'),
        kind: 'schematictext',
        schX: schX.value,
        schY: schY.value,
        text: text.value
      })
    } else {
      needsManualReview = needsManualReview || schX.dynamic || schY.dynamic || text.dynamic
    }
  })

  const portTags = [...body.matchAll(/<port\b[^>]*\/?>(?:<\/port>)?/g)].map(match => match[0])
  portTags.forEach(tag => {
    const name = parseStringProp(tag, 'name')
    const direction = parseStringProp(tag, 'direction')
    const side = parseStringProp(tag, 'side')
    const order = parseNumericProp(tag, 'order')
    const schX = parseNumericProp(tag, 'schX')
    const schY = parseNumericProp(tag, 'schY')
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
          const x = schX.value !== null ? schX.value : 0
          const y = schY.value !== null ? schY.value : 0
          const absX = Math.abs(x)
          const absY = Math.abs(y)
          if (absX >= absY) return x >= 0 ? 'right' : 'left'
          return y >= 0 ? 'bottom' : 'top'
      })()
      document.ports.push({
        id: nextImportedId('port'),
        name: name.value,
          electricalDirection: parsedElectricalDirection,
        side: parsedSide,
        order: order.value !== null ? order.value : undefined,
        schX: schX.value !== null ? schX.value : 0,
        schY: schY.value !== null ? schY.value : 0
      })
      if (schX.value === null || schY.value === null) {
        needsManualReview = true
      }
    } else {
      needsManualReview = needsManualReview || name.dynamic || direction.dynamic || schX.dynamic || schY.dynamic
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
