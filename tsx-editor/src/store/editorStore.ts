import { create } from 'zustand'
import { getCatalogItem } from '../catalog'
import { loadEditorMeta, saveEditorMeta, getNetAnchor, setNetAnchor } from './metaHelpers'
import * as parser from '@babel/parser'

// Round 0 DEBUG — set to true in browser console: window.__NETPORT_DEBUG = true
const NETPORT_DEBUG = () => !!(window as any).__NETPORT_DEBUG
import { ExposedPortSelection, FSMap, PlacedComponent, EditorState, SelectedPinRef, WireConnection } from '../types/catalog'
import { getPinConfig } from '../types/schematic'
import { SCHEMATIC_COORD_SCALE, pixelToSchematic, schematicToPixel } from '../utils/coordinateScale'
import { NetRegistry } from '../net/NetRegistry'

interface EditorStore extends EditorState {
  codeViewTab: 'source' | 'export'
  exportPreview: {
    fileName: string
    content: string
  } | null
  copiedSelection: {
    components: PlacedComponent[]
    wires: WireConnection[]
  } | null
  pasteCount: number
  // Actions
  setFSMap: (fsMap: FSMap) => void
  setActiveFilePath: (filePath: string) => void
  openSubcircuitEditor: (name: string) => void
  goBackFile: () => void
  updateFile: (filePath: string, content: string) => void
  addPlacedComponent: (component: PlacedComponent) => void
  updatePlacedComponent: (id: string, updates: Partial<PlacedComponent>) => void
  rotateSelectedComponents: () => void
  removePlacedComponent: (id: string) => void
  removeSelectedComponents: () => void
  setSelectedComponents: (ids: string[]) => void
  toggleComponentSelection: (id: string) => void
  copySelectedComponents: () => void
  pasteCopiedComponents: () => void
  setViewport: (viewport: Partial<EditorState['viewport']>) => void
  startWiring: (componentId: string, pinName: string) => void
  completeWiring: (componentId: string, pinName: string) => void
  cancelWiring: () => void
  removeWire: (wireId: string) => void
  disconnectPin: (componentId: string, pinName: string) => void
  beginSubcircuitPinSelection: (componentIds: string[]) => void
  toggleSubcircuitPinSelection: (componentId: string, pinName: string) => void
  cancelSubcircuitPinSelection: () => void
  exposeSubcircuitPort: (componentId: string, pinName: string, portName: string) => void
  setCursorNearPin: (info: { componentId: string; pinName: string } | null) => void
  createSubcircuit: (name: string, componentIds: string[], exposedPorts: ExposedPortSelection[]) => void
  applyLayout: () => Promise<void>
  regenerateTSX: () => void
  generateFlatCircuitTSX: () => string
  generateProjectStructure: () => { parent: string; children: Record<string, string> }
  generateParentChildrenStructure: () => { parent: string; children: Record<string, string> }
  importTSXIntoActiveFile: (content: string) => void
  setCodeViewTab: (tab: 'source' | 'export') => void
  setExportPreview: (preview: { fileName: string; content: string } | null) => void
}

const DEFAULT_MAIN_TSX = `export default () => (
  <board width="50mm" height="50mm">
    {/* Add components here */}
  </board>
)
`

const DEFAULT_SUBCIRCUITS_INDEX = ''

const getDefaultImportPosition = (index: number): { schX: number; schY: number } => ({
  schX: 80 + (index % 4) * 140,
  schY: 80 + Math.floor(index / 4) * 100
})

const normalizeImportedTSXContent = (content: string, activeFilePath: string): string => {
  const trimmed = content.trim()

  if (!trimmed) {
    return activeFilePath === 'main.tsx'
      ? DEFAULT_MAIN_TSX
      : `export function ${activeFilePath.replace('subcircuits/', '').replace('.tsx', '')}(props: { name: string; schX?: number; schY?: number }) {\n  return (\n    <subcircuit name={props.name}>\n      {/* Add components here */}\n    </subcircuit>\n  )\n}\n`
  }

  if (/<board[\s>]/.test(trimmed) || /<subcircuit[\s>]/.test(trimmed)) {
    return trimmed
  }

  const indented = trimmed.split('\n').map(line => `    ${line}`).join('\n')
  if (activeFilePath === 'main.tsx') {
    return `export default () => (\n  <board width="50mm" height="50mm">\n${indented}\n  </board>\n)\n`
  }

  const name = activeFilePath.replace('subcircuits/', '').replace('.tsx', '')
  return `export function ${name}(props: { name: string; schX?: number; schY?: number }) {\n  return (\n    <subcircuit name={props.name}>\n${trimmed.split('\n').map(line => `      ${line}`).join('\n')}\n    </subcircuit>\n  )\n}\n`
}

const toSafeIdentifier = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '')
  if (!cleaned) return 'MySubcircuit'
  if (/^[0-9]/.test(cleaned)) return `S${cleaned}`
  return cleaned[0].toUpperCase() + cleaned.slice(1)
}

const toUniqueName = (prefix: string, used: string[]): string => {
  let i = 1
  let candidate = `${prefix}${i}`
  while (used.includes(candidate)) {
    i += 1
    candidate = `${prefix}${i}`
  }
  return candidate
}

const ensureFsMapDefaults = (rawMap: FSMap): FSMap => {
  const fsMap = { ...rawMap }

  if (!fsMap['main.tsx']) {
    fsMap['main.tsx'] = DEFAULT_MAIN_TSX
  }

  if (!fsMap['subcircuits/index.ts']) {
    fsMap['subcircuits/index.ts'] = DEFAULT_SUBCIRCUITS_INDEX
  }

  if (!fsMap['editor/meta.json']) {
    fsMap['editor/meta.json'] = JSON.stringify({ netAnchors: {} }, null, 2)
  }

  // Migrate old patches/* files to subcircuits/*
  Object.entries(rawMap).forEach(([path, content]) => {
    if (path.startsWith('patches/') && path.endsWith('.tsx')) {
      fsMap[path.replace('patches/', 'subcircuits/')] = content
    }
  })

  return fsMap
}

const saveFSMapToStorage = (fsMap: FSMap) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem('editor_fsMap', JSON.stringify(fsMap))
  } catch (e) {
    console.warn('Failed to save fsMap from localStorage:', e)
  }
}

const loadFSMapFromStorage = (): FSMap => {
  if (typeof localStorage === 'undefined') {
    return ensureFsMapDefaults({ 'main.tsx': DEFAULT_MAIN_TSX })
  }

  try {
    const stored = localStorage.getItem('editor_fsMap')
    if (stored) {
      return ensureFsMapDefaults(JSON.parse(stored))
    }
  } catch (e) {
    console.warn('Failed to load fsMap from localStorage:', e)
  }
  return ensureFsMapDefaults({ 'main.tsx': DEFAULT_MAIN_TSX })
}

const extractExplicitSubcircuitPorts = (content: string): string[] | null => {
  try {
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    })

    for (const node of ast.program.body) {
      if (node.type !== 'ExportNamedDeclaration') continue
      const declaration = node.declaration
      if (!declaration || declaration.type !== 'VariableDeclaration') continue

      for (const decl of declaration.declarations) {
        if (decl.id.type !== 'Identifier' || decl.id.name !== 'ports') continue

        const init = decl.init
        if (!init) return null

        const arrayExpr =
          init.type === 'TSAsExpression' || init.type === 'TSSatisfiesExpression'
            ? init.expression
            : init

        if (arrayExpr.type !== 'ArrayExpression') return null

        const values: string[] = []
        for (const element of arrayExpr.elements) {
          if (!element || element.type !== 'StringLiteral') return null
          values.push(element.value)
        }

        return values
      }
    }

    return null
  } catch {
    return null
  }
}
const warnedSubcircuitPortFallback = new Set<string>()

const getSubcircuitPorts = (fsMap: FSMap, name: string): string[] => {
  const filePath = `subcircuits/${name}.tsx`
  const content = fsMap[filePath] || ''

  const explicitPorts = extractExplicitSubcircuitPorts(content)
  if (explicitPorts) {
    return explicitPorts
  }

  if (!warnedSubcircuitPortFallback.has(filePath)) {
    warnedSubcircuitPortFallback.add(filePath)
    console.warn(`[subcircuit ports] Falling back to net.* scan for ${filePath}; add \`export const ports = ["..."] as const\``)
  }

  const ports = new Set<string>()
  const netRegex = /net\.([A-Za-z_][A-Za-z0-9_]*)/g
  let m

  while ((m = netRegex.exec(content)) !== null) {
    ports.add(m[1])
  }

  return [...ports]
}

const regenerateSubcircuitIndex = (fsMap: FSMap): FSMap => {
  const names = Object.keys(fsMap)
    .filter(path => path.startsWith('subcircuits/') && path.endsWith('.tsx'))
    .map(path => path.replace('subcircuits/', '').replace('.tsx', ''))
    .sort()

  const indexContent = names.map(name => `export { ${name} } from "./${name}"`).join('\n')

  return {
    ...fsMap,
    'subcircuits/index.ts': indexContent ? `${indexContent}\n` : ''
  }
}

const parseComponentRef = (ref: string): { componentName: string; pinName: string } | null => {
  const m = ref.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*>\s*\.([A-Za-z_][A-Za-z0-9_]*)$/)
  if (!m) return null
  return { componentName: m[1], pinName: m[2] }
}

class NetUnionFind {
  private parent = new Map<string, string>()

  add(id: string): void {
    if (!this.parent.has(id)) {
      this.parent.set(id, id)
    }
  }

  find(id: string): string {
    const current = this.parent.get(id)
    if (!current) {
      this.parent.set(id, id)
      return id
    }

    if (current === id) return id
    const root = this.find(current)
    this.parent.set(id, root)
    return root
  }

  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra === rb) return
    if (ra < rb) {
      this.parent.set(rb, ra)
      return
    }
    this.parent.set(ra, rb)
  }
}

const isNetLikeComponent = (component: PlacedComponent | undefined): boolean => {
  if (!component) return false
  return component.catalogId === 'net' || component.catalogId === 'netport'
}

const getComponentNetName = (component: PlacedComponent): string => {
  return String(component.props.netName || component.props.name || component.name || '').trim().toUpperCase()
}

const getOrphanedNetportsAfterRemovingWires = (
  components: PlacedComponent[],
  currentWires: WireConnection[],
  removedWireIds: Set<string>
): string[] => {
  const remainingWires = currentWires.filter(wire => !removedWireIds.has(wire.id))
  const connectedComponentIds = new Set<string>()

  remainingWires.forEach((wire) => {
    connectedComponentIds.add(wire.from.componentId)
    connectedComponentIds.add(wire.to.componentId)
  })

  return components
    .filter(component => component.catalogId === 'netport' && !connectedComponentIds.has(component.id))
    .map(component => String(component.props.netName || component.name || '').trim())
    .filter(Boolean)
}

const mergeElectricalNets = (
  components: PlacedComponent[],
  wires: WireConnection[]
): { components: PlacedComponent[]; wires: WireConnection[] } => {
  const byId = new Map(components.map(component => [component.id, component]))
  const netLikeIds = components
    .filter(component => isNetLikeComponent(component))
    .map(component => component.id)

  if (netLikeIds.length === 0) {
    return { components, wires }
  }

  const uf = new NetUnionFind()
  netLikeIds.forEach(id => uf.add(id))

  wires.forEach((wire) => {
    const fromComp = byId.get(wire.from.componentId)
    const toComp = byId.get(wire.to.componentId)
    if (!isNetLikeComponent(fromComp) || !isNetLikeComponent(toComp)) return
    uf.union(wire.from.componentId, wire.to.componentId)
  })

  const groups = new Map<string, PlacedComponent[]>()
  netLikeIds.forEach((id) => {
    const component = byId.get(id)
    if (!component) return
    const root = uf.find(id)
    const bucket = groups.get(root) || []
    bucket.push(component)
    groups.set(root, bucket)
  })

  const aliasToCanonicalName = new Map<string, string>()
  const componentToRepresentative = new Map<string, string>()
  const representativeToCanonicalName = new Map<string, string>()

  groups.forEach((members) => {
    const names = members
      .map(getComponentNetName)
      .filter(Boolean)
      .sort()

    const canonicalName = names[0] || 'NET'

    members.forEach((member) => {
      const alias = getComponentNetName(member)
      if (alias) aliasToCanonicalName.set(alias, canonicalName)
    })

    const representative = [...members].sort((a, b) => {
      const aNetPriority = a.catalogId === 'net' ? 0 : 1
      const bNetPriority = b.catalogId === 'net' ? 0 : 1
      if (aNetPriority !== bNetPriority) return aNetPriority - bNetPriority

      const aNamePriority = getComponentNetName(a) === canonicalName ? 0 : 1
      const bNamePriority = getComponentNetName(b) === canonicalName ? 0 : 1
      if (aNamePriority !== bNamePriority) return aNamePriority - bNamePriority

      return a.id.localeCompare(b.id)
    })[0]

    members.forEach((member) => {
      componentToRepresentative.set(member.id, representative.id)
    })
    representativeToCanonicalName.set(representative.id, canonicalName)
  })

  const canonicalRegistry = new NetRegistry()
  representativeToCanonicalName.forEach((name) => {
    canonicalRegistry.getNetId(name)
  })

  const mergedComponents = components.map((component) => {
    if (isNetLikeComponent(component)) {
      const repId = componentToRepresentative.get(component.id) || component.id
      const canonicalName = representativeToCanonicalName.get(repId) || getComponentNetName(component)
      const netId = canonicalRegistry.getNetId(canonicalName)

      if (component.catalogId === 'net') {
        return {
          ...component,
          name: canonicalName,
          props: {
            ...component.props,
            netId,
            name: canonicalName
          }
        }
      }

      return {
        ...component,
        name: canonicalName,
        props: {
          ...component.props,
          netId,
          netName: canonicalName
        }
      }
    }

    if (component.catalogId === 'netlabel') {
      const rawNet = String(component.props.net || component.props.netName || '').trim().toUpperCase()
      if (!rawNet) return component
      const canonicalName = aliasToCanonicalName.get(rawNet) || rawNet
      const netId = canonicalRegistry.getNetId(canonicalName)

      return {
        ...component,
        props: {
          ...component.props,
          net: canonicalName,
          netId
        }
      }
    }

    return component
  })

  const mergedWires = wires.map((wire) => {
    const remapEndpoint = (endpoint: { componentId: string; pinName: string }) => {
      const comp = byId.get(endpoint.componentId)
      if (!isNetLikeComponent(comp)) return endpoint
      const repId = componentToRepresentative.get(endpoint.componentId) || endpoint.componentId
      return { componentId: repId, pinName: 'port' }
    }

    return {
      ...wire,
      from: remapEndpoint(wire.from),
      to: remapEndpoint(wire.to)
    }
  })

  return {
    components: mergedComponents,
    wires: mergedWires
  }
}

const parseSchExpr = (expr: string, isSubcircuitFile: boolean): number => {
  const toCanvasCoordinate = (value: number): number => {
    // Legacy files stored canvas-pixel coordinates directly in schX/schY.
    // Keep large literals in pixel space while converting schematic-unit values.
    if (Math.abs(value) >= SCHEMATIC_COORD_SCALE * 10) {
      return value
    }
    return schematicToPixel(value)
  }

  const compact = expr.replace(/\s+/g, '')
  if (isSubcircuitFile) {
    const withOffset = compact.match(/^[xy]\+(-?\d+(?:\.\d+)?)$/)
    if (withOffset) return toCanvasCoordinate(Number(withOffset[1]))
  }

  const num = Number(compact)
  return Number.isFinite(num) ? toCanvasCoordinate(num) : 0
}

const parseFileToCanvas = (filePath: string, fsMap: FSMap): { components: PlacedComponent[]; wires: WireConnection[] } => {
  const content = fsMap[filePath] || ''
  const isMain = filePath === 'main.tsx'
  const isSubcircuitFile = filePath.startsWith('subcircuits/')
  const bodyMatch = isMain
    ? content.match(/<board[^>]*>([\s\S]*?)<\/board>/)
    : content.match(/<subcircuit[^>]*>([\s\S]*?)<\/subcircuit>/)

  if (!bodyMatch) {
    return { components: [], wires: [] }
  }

  const body = bodyMatch[1]
  const components: PlacedComponent[] = []
  const wires: WireConnection[] = []
  const nameToId = new Map<string, string>()
  const netRegistry = new NetRegistry()

  const componentRegex = /<([A-Za-z_][A-Za-z0-9_]*)\s+([^>]*?)\/>/g
  let componentMatch
  let parseCursor = 0
  let defaultImportIndex = 0

  while ((componentMatch = componentRegex.exec(body)) !== null) {
    const tagName = componentMatch[1]
    const propsStr = componentMatch[2]
    const leadingSegment = body.slice(parseCursor, componentMatch.index)
    const schXCommentMatches = [...leadingSegment.matchAll(/\{\/\*\s*\/\/\s*schX=\{([^}]+)\}\s*\*\/\}/g)]
    const schYCommentMatches = [...leadingSegment.matchAll(/\{\/\*\s*\/\/\s*schY=\{([^}]+)\}\s*\*\/\}/g)]
    const schXCommentExpr = schXCommentMatches.length > 0 ? schXCommentMatches[schXCommentMatches.length - 1][1] : null
    const schYCommentExpr = schYCommentMatches.length > 0 ? schYCommentMatches[schYCommentMatches.length - 1][1] : null

    parseCursor = componentRegex.lastIndex

    if (tagName === 'trace' || tagName === 'board' || tagName === 'subcircuit') continue

    const attrRegex = /([A-Za-z_][A-Za-z0-9_]*)=(?:"([^"]*)"|\{([^}]*)\})/g
    const props: Record<string, any> = {}
    let name = ''
    let attr

    while ((attr = attrRegex.exec(propsStr)) !== null) {
      const key = attr[1]
      const stringValue = attr[2]
      const exprValue = attr[3]

      if (key === 'name' && stringValue) {
        name = stringValue
        continue
      }

      if (key === 'schX' && exprValue) {
        props.schX = parseSchExpr(exprValue, isSubcircuitFile)
        continue
      }

      if (key === 'schY' && exprValue) {
        props.schY = parseSchExpr(exprValue, isSubcircuitFile)
        continue
      }

      if (stringValue !== undefined) {
        props[key] = stringValue
      } else if (exprValue !== undefined) {
        const n = Number(exprValue)
        props[key] = Number.isFinite(n) ? n : exprValue.trim()
      }
    }

    if (tagName === 'switch') {
      if (props.type === undefined && props.variant !== undefined) {
        props.type = props.variant
      }
      delete props.variant
      if (props.footprint === undefined || props.footprint === '') {
        props.footprint = 'pushbutton'
      }
    }

    if (props.schX === undefined && schXCommentExpr !== null) {
      props.schX = parseSchExpr(schXCommentExpr, isSubcircuitFile)
    }

    if (props.schY === undefined && schYCommentExpr !== null) {
      props.schY = parseSchExpr(schYCommentExpr, isSubcircuitFile)
    }

    if (props.schX === undefined && props.schY === undefined) {
      const fallback = getDefaultImportPosition(defaultImportIndex++)
      props.schX = fallback.schX
      props.schY = fallback.schY
    }

    if (tagName === 'netlabel') {
      const rawNet = String(props.net || '').trim()
      if (rawNet) {
        const netId = netRegistry.getNetId(rawNet)
        props.netId = netId
        props.net = netRegistry.getNetName(netId) || rawNet
      }
    }

    if (!name) {
      if (tagName === 'netlabel') {
        name = `netlabel-${components.length + 1}`
      } else {
        continue
      }
    }

    const isCustomChip = tagName === 'chip' && (
      props.pinCount !== undefined ||
      props.pinNames !== undefined ||
      props.symbolPreset !== undefined
    )
    const effectiveCatalogId = isCustomChip ? 'customchip' : tagName
    const isKnownPart = !!getCatalogItem(effectiveCatalogId)
    const id = `comp-${filePath}-${name}-${components.length}`

    if (!isKnownPart) {
      const ports = getSubcircuitPorts(fsMap, tagName)
      props.subcircuitName = tagName
      props.ports = ports
    }

    const component: PlacedComponent = {
      id,
      catalogId: isKnownPart ? effectiveCatalogId : 'subcircuit-instance',
      name,
      props: {
        ...props,
        schX: props.schX ?? 0,
        schY: props.schY ?? 0
      },
      tsxSnippet: ''
    }

    components.push(component)
    nameToId.set(name, id)
  }

  const netPortComponents = new Map<string, string>()
  const explicitNetComponents = new Map<string, string[]>()

  components.forEach((component) => {
    if (component.catalogId !== 'net') return
    const netName = String(component.props.name || component.name || '').trim()
    if (!netName) return
    const netId = netRegistry.getNetId(netName)
    component.props = {
      ...component.props,
      netId
    }
    const bucket = explicitNetComponents.get(netId) || []
    bucket.push(component.id)
    explicitNetComponents.set(netId, bucket)
  })

  const _editorMeta = loadEditorMeta(fsMap)

  const createNetPort = (
    portName: string,
    nearX: number,
    nearY: number,
    options?: { implicitImported?: boolean }
  ): string => {
    const netId = netRegistry.getNetId(portName)
    const canonicalName = netRegistry.getNetName(netId) || portName

    if (netPortComponents.has(netId)) {
      return netPortComponents.get(netId)!
    }

    const id = `net-${filePath}-${netId}`
    const index = netPortComponents.size
    const savedAnchor = getNetAnchor(_editorMeta, filePath, canonicalName)
    const schX = savedAnchor ? savedAnchor.schX : nearX + 24
    const schY = savedAnchor ? savedAnchor.schY : nearY + index * 12
    if (NETPORT_DEBUG()) console.log('[netport:create]', { netName: canonicalName, id, schX, schY, fromMeta: !!savedAnchor, kind: options?.implicitImported ? 'implicit-import' : 'generated-anchor' })
    components.push({
      id,
      catalogId: 'netport',
      name: canonicalName,
      props: {
        netId,
        netName: canonicalName,
        netAnchorKind: options?.implicitImported ? 'implicit-import' : 'generated-anchor',
        isImplicitImportedNetAnchor: !!options?.implicitImported,
        schX,
        schY
      },
      tsxSnippet: ''
    })

    netPortComponents.set(netId, id)
    return id
  }

  const resolveNetComponent = (portName: string, nearX: number, nearY: number): string => {
    const netId = netRegistry.getNetId(portName)
    const explicitIds = explicitNetComponents.get(netId) || []
    if (explicitIds.length === 0) {
      return createNetPort(portName, nearX, nearY, { implicitImported: true })
    }

    if (explicitIds.length === 1) {
      return explicitIds[0]
    }

    let bestId = explicitIds[0]
    let bestDistance = Number.POSITIVE_INFINITY

    explicitIds.forEach((id) => {
      const component = components.find(c => c.id === id)
      if (!component) return
      const dx = (component.props.schX || 0) - nearX
      const dy = (component.props.schY || 0) - nearY
      const distance = dx * dx + dy * dy
      if (distance < bestDistance) {
        bestDistance = distance
        bestId = id
      }
    })

    return bestId
  }

  const traceRegex = /<trace\s+from="([^"]+)"\s+to="([^"]+)"\s*\/>/g
  let traceMatch
  let traceIndex = 0

  while ((traceMatch = traceRegex.exec(body)) !== null) {
    const fromRaw = traceMatch[1]
    const toRaw = traceMatch[2]

    const fromRef = parseComponentRef(fromRaw)
    const toRef = parseComponentRef(toRaw)
    const fromNet = fromRaw.match(/^net\.([A-Za-z_][A-Za-z0-9_]*)$/)
    const toNet = toRaw.match(/^net\.([A-Za-z_][A-Za-z0-9_]*)$/)

    if (fromRef && toRef) {
      const fromId = nameToId.get(fromRef.componentName)
      const toId = nameToId.get(toRef.componentName)
      if (!fromId || !toId) continue

      wires.push({
        id: `wire-${filePath}-${traceIndex++}`,
        from: { componentId: fromId, pinName: fromRef.pinName },
        to: { componentId: toId, pinName: toRef.pinName },
        tsxSnippet: ''
      })
      continue
    }

    if (fromRef && toNet) {
      const fromId = nameToId.get(fromRef.componentName)
      if (!fromId) continue
      const near = components.find(c => c.id === fromId)
      const netId = resolveNetComponent(toNet[1], near?.props.schX || 0, near?.props.schY || 0)
      wires.push({
        id: `wire-${filePath}-${traceIndex++}`,
        from: { componentId: fromId, pinName: fromRef.pinName },
        to: { componentId: netId, pinName: 'port' },
        tsxSnippet: ''
      })
      continue
    }

    if (fromNet && toRef) {
      const toId = nameToId.get(toRef.componentName)
      if (!toId) continue
      const near = components.find(c => c.id === toId)
      const netId = resolveNetComponent(fromNet[1], near?.props.schX || 0, near?.props.schY || 0)
      wires.push({
        id: `wire-${filePath}-${traceIndex++}`,
        from: { componentId: netId, pinName: 'port' },
        to: { componentId: toId, pinName: toRef.pinName },
        tsxSnippet: ''
      })
      continue
    }

    if (fromNet && toNet) {
      const fromId = resolveNetComponent(fromNet[1], 0, 0)
      const toId = resolveNetComponent(toNet[1], 40, 0)
      wires.push({
        id: `wire-${filePath}-${traceIndex++}`,
        from: { componentId: fromId, pinName: 'port' },
        to: { componentId: toId, pinName: 'port' },
        tsxSnippet: ''
      })
    }
  }

  const normalizeComponentsToViewport = (items: PlacedComponent[]): PlacedComponent[] => {
    if (items.length === 0) return items

    const points = items
      .map((component) => ({
        id: component.id,
        x: Number(component.props.schX || 0),
        y: Number(component.props.schY || 0)
      }))

    const minX = Math.min(...points.map(p => p.x))
    const maxX = Math.max(...points.map(p => p.x))
    const minY = Math.min(...points.map(p => p.y))
    const maxY = Math.max(...points.map(p => p.y))

    const width = Math.max(1, maxX - minX)
    const height = Math.max(1, maxY - minY)

    // Keep imported circuits in view so connected wires/components stay visible.
    const targetWidth = 1200
    const targetHeight = 700
    const margin = 80

    const scaleX = (targetWidth - margin * 2) / width
    const scaleY = (targetHeight - margin * 2) / height
    const scaleToFit = Math.min(scaleX, scaleY, 1)

    const shouldScale = width > (targetWidth - margin * 2) || height > (targetHeight - margin * 2)
    const scale = shouldScale ? Math.max(0.1, scaleToFit) : 1

    return items.map((component) => {
      const sourceX = Number(component.props.schX || 0)
      const sourceY = Number(component.props.schY || 0)

      const normalizedX = Math.round((sourceX - minX) * scale + margin)
      const normalizedY = Math.round((sourceY - minY) * scale + margin)

      return {
        ...component,
        props: {
          ...component.props,
          schX: normalizedX,
          schY: normalizedY
        }
      }
    })
  }

  const merged = mergeElectricalNets(components, wires)
  return { components: normalizeComponentsToViewport(merged.components), wires: merged.wires }
}

const getComponentTagName = (component: PlacedComponent): string => {
  if (component.catalogId === 'subcircuit-instance') {
    return component.props.subcircuitName || component.name
  }
  if (component.catalogId === 'customchip') {
    return 'chip'
  }
  return component.catalogId
}

const sanitizeComponentName = (name: string): string => name.trim().replace(/^\.+/, '')

const canonicalizeNetName = (value: string): string => value.trim().toUpperCase()

const buildNetRegistryFromComponents = (components: PlacedComponent[]): NetRegistry => {
  const registry = new NetRegistry()

  components.forEach((component) => {
    if (component.catalogId !== 'net' && component.catalogId !== 'netport') return
    const rawName = String(component.props.netName || component.props.name || component.name || '').trim()
    if (!rawName) return
    registry.getNetId(rawName)
  })

  return registry
}

const toAttrList = (props: Record<string, any>): string[] => {
  const attrs: string[] = []

  Object.entries(props)
    .filter(([key]) => ![
      'name',
      'schX',
      'schY',
      'schRotation',
      'subcircuitName',
      'ports',
      'netName',
      'netId',
      'netAnchorKind',
      'isImplicitImportedNetAnchor'
    ].includes(key))
    .forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      if (typeof value === 'number') {
        attrs.push(`${key}={${value}}`)
        return
      }
      if (typeof value === 'boolean') {
        if (value) attrs.push(key)
        return
      }
      attrs.push(`${key}="${String(value).replace(/"/g, '&quot;')}"`)
    })

  return attrs
}

const createComponentSnippet = (component: PlacedComponent, inSubcircuitFile: boolean): string => {
  if (component.catalogId === 'netport') return ''

  const tagName = getComponentTagName(component)
  const normalizedProps = { ...component.props }
  if (component.catalogId === 'switch') {
    if (normalizedProps.type === undefined && normalizedProps.variant !== undefined) {
      normalizedProps.type = normalizedProps.variant
    }
    delete normalizedProps.variant
    if (normalizedProps.footprint === undefined || normalizedProps.footprint === '') {
      normalizedProps.footprint = 'pushbutton'
    }
  }

  if (component.catalogId === 'customchip') {
    const pinCount = Math.max(2, Number(normalizedProps.pinCount || 8))
    if (normalizedProps.footprint === undefined || normalizedProps.footprint === '') {
      normalizedProps.footprint = pinCount === 8 ? 'soic8' : 'soic8'
    }
  }

  if (component.catalogId === 'net') {
    const rawNetName = String(normalizedProps.name || component.name || '').trim()
    if (rawNetName) {
      const canonical = canonicalizeNetName(rawNetName)
      normalizedProps.name = canonical
    }
  }

  if (component.catalogId === 'netlabel') {
    const rawNetName = String(normalizedProps.net || normalizedProps.netName || '').trim()
    if (rawNetName) {
      normalizedProps.net = canonicalizeNetName(rawNetName)
    }
  }

  const attrs = toAttrList(normalizedProps)
  const name = sanitizeComponentName(String(normalizedProps.name || component.name || ''))
  const x = pixelToSchematic(Number(normalizedProps.schX || 0))
  const y = pixelToSchematic(Number(normalizedProps.schY || 0))
  const coordX = Number.isInteger(x) ? String(x) : String(Number(x.toFixed(3)))
  const coordY = Number.isInteger(y) ? String(y) : String(Number(y.toFixed(3)))
  const schXExpr = inSubcircuitFile ? `{x + ${coordX}}` : `{${coordX}}`
  const schYExpr = inSubcircuitFile ? `{y + ${coordY}}` : `{${coordY}}`
  const propLines: string[] = []

  if (name && component.catalogId !== 'netlabel') propLines.push(`name="${name}"`)
  if (attrs.length > 0) propLines.push(...attrs)
  const rotation = String(normalizedProps.schRotation || '0deg')
  propLines.push(`schRotation="${rotation}"`)
  const commentX = inSubcircuitFile ? `x + ${coordX}` : coordX
  const commentY = inSubcircuitFile ? `y + ${coordY}` : coordY

  const multiline = [`{/* // schX={${commentX}} */}`, `{/* // schY={${commentY}} */}`, `<${tagName}`, ...propLines.map(line => `  ${line}`), '/>']
  return multiline.join('\n')
}

const traceEndpointRef = (component: PlacedComponent | undefined, pinName: string): string | null => {
  if (!component) return null
  if (component.catalogId === 'netport' || component.catalogId === 'net') {
    const rawNetName = String(component.props.netName || component.props.name || component.name || '').trim()
    if (!rawNetName) return null
    const netName = canonicalizeNetName(rawNetName)
    return `net.${netName}`
  }
  const cleanName = sanitizeComponentName(String(component.name || component.props.name || ''))
  if (!cleanName) return null
  return `.${cleanName} > .${pinName}`
}

const createWireSnippet = (wire: WireConnection, components: PlacedComponent[]): string => {
  const fromComponent = components.find(c => c.id === wire.from.componentId)
  const toComponent = components.find(c => c.id === wire.to.componentId)

  const from = traceEndpointRef(fromComponent, wire.from.pinName)
  const to = traceEndpointRef(toComponent, wire.to.pinName)
  if (!from || !to) return ''

  return `<trace from="${from}" to="${to}" />`
}

const normalizeLogicalNets = (
  components: PlacedComponent[],
  wires: WireConnection[]
): {
  components: PlacedComponent[]
  wires: WireConnection[]
  duplicateNetComments: string[]
} => {
  const canonicalToPrimaryId = new Map<string, string>()
  const duplicateToPrimaryId = new Map<string, string>()
  const duplicateCounts = new Map<string, { displayName: string; count: number }>()

  components.forEach((component) => {
    if (component.catalogId !== 'net') return
    const displayName = String(component.props.name || component.name || '').trim()
    if (!displayName) return

    const canonical = canonicalizeNetName(displayName)
    const primaryId = canonicalToPrimaryId.get(canonical)
    if (!primaryId) {
      canonicalToPrimaryId.set(canonical, component.id)
      return
    }

    duplicateToPrimaryId.set(component.id, primaryId)
    const existing = duplicateCounts.get(canonical)
    if (existing) {
      existing.count += 1
      return
    }

    duplicateCounts.set(canonical, { displayName, count: 1 })
  })

  const dedupedComponents = components
    .filter(component => !duplicateToPrimaryId.has(component.id))
    .map((component) => {
      if (component.catalogId !== 'net') return component

      const raw = String(component.props.name || component.name || '').trim()
      if (!raw) return component

      const canonical = canonicalizeNetName(raw)
      return {
        ...component,
        name: canonical,
        props: {
          ...component.props,
          name: canonical
        }
      }
    })

  const remappedWires = wires.map((wire) => {
    const remapEndpoint = (endpoint: { componentId: string; pinName: string }) => ({
      componentId: duplicateToPrimaryId.get(endpoint.componentId) || endpoint.componentId,
      pinName: endpoint.pinName
    })

    return {
      ...wire,
      from: remapEndpoint(wire.from),
      to: remapEndpoint(wire.to)
    }
  })

  const duplicateNetComments = [...duplicateCounts.values()].map(({ displayName, count }) =>
    `/* Duplicate net symbols for ${displayName} collapsed (${count + 1} visual instances -> 1 logical <net />) */`
  )

  return {
    components: dedupedComponents,
    wires: remappedWires,
    duplicateNetComments
  }
}

const generateFileTSX = (filePath: string, components: PlacedComponent[], wires: WireConnection[]): string => {
  const isMain = filePath === 'main.tsx'
  const inSubcircuit = !isMain
  const lines: string[] = []

  const merged = mergeElectricalNets(components, wires)

  const {
    components: normalizedComponents,
    wires: normalizedWires,
    duplicateNetComments
  } = normalizeLogicalNets(merged.components, merged.wires)

  const renderedComponents = normalizedComponents
    .map(component => createComponentSnippet(component, inSubcircuit))
    .filter(Boolean)
    .map(line => line.split('\n').map(inner => `    ${inner}`).join('\n'))

  const renderedWires = normalizedWires
    // Drop self-loop wires produced by merging two net nodes into one
    .filter(wire => wire.from.componentId !== wire.to.componentId)
    .map(wire => createWireSnippet(wire, normalizedComponents))
    .filter(Boolean)
    .map(line => `    ${line}`)

  lines.push(
    // Only emit collapse comments when actual visual duplicates were collapsed
    ...(duplicateNetComments.length > 0 ? duplicateNetComments.map(comment => `    ${comment}`) : []),
    ...renderedComponents,
    ...renderedWires
  )
  const body = lines.length > 0 ? lines.join('\n') : '    {/* Add components here */}'

  if (isMain) {
    const importSet = new Set(
      components
        .filter(c => c.catalogId === 'subcircuit-instance')
        .map(c => c.props.subcircuitName as string)
        .filter(Boolean)
    )

    const imports = [...importSet]
      .sort()
      .map(name => `import { ${name} } from "./${name}"`)
      .join('\n')

    return `${imports ? `${imports}\n\n` : ''}export default () => (\n  <board width="50mm" height="50mm">\n${body}\n  </board>\n)\n`
  }

  const subcircuitName = filePath.replace('subcircuits/', '').replace('.tsx', '')
  return `export function ${subcircuitName}(props: { name: string; schX?: number; schY?: number }) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n${body}\n    </subcircuit>\n  )\n}\n`
}

const generateFlatMainTSX = (fsMap: FSMap): string => {
  const rootPath = 'main.tsx'
  const flatComponents: PlacedComponent[] = []
  const flatWires: WireConnection[] = []
  const netEndpointByName = new Map<string, string>()
  const componentById = new Map<string, PlacedComponent>()
  const parsedCache = new Map<string, { components: PlacedComponent[]; wires: WireConnection[] }>()
  let idCounter = 0

  const generateId = (prefix: string): string => `${prefix}-${idCounter++}`

  const ensureNetEndpoint = (netName: string): string => {
    const existing = netEndpointByName.get(netName)
    if (existing) return existing

    const id = generateId('net')
    const endpoint: PlacedComponent = {
      id,
      catalogId: 'netport',
      name: netName,
      props: {
        netName,
        schX: 0,
        schY: 0
      },
      tsxSnippet: ''
    }

    netEndpointByName.set(netName, id)
    componentById.set(id, endpoint)
    return id
  }

  const parseCached = (filePath: string): { components: PlacedComponent[]; wires: WireConnection[] } => {
    const existing = parsedCache.get(filePath)
    if (existing) return existing
    const parsed = parseFileToCanvas(filePath, fsMap)
    parsedCache.set(filePath, parsed)
    return parsed
  }

  const expandFile = (
    filePath: string,
    offsetX: number,
    offsetY: number,
    instancePrefix: string,
    pinNetMap?: Map<string, string>
  ) => {
    const parsed = parseCached(filePath)
    const localIdMap = new Map<string, string>()
    const localById = new Map(parsed.components.map(component => [component.id, component]))

    parsed.components.forEach((component) => {
      if (component.catalogId === 'subcircuit-instance') {
        return
      }

      if (component.catalogId === 'netport') {
        const localNet = String(component.props.netName || component.name || '').trim()
        if (!localNet) return
        const mappedNet = pinNetMap?.get(localNet) || `${instancePrefix}${localNet}`
        localIdMap.set(component.id, ensureNetEndpoint(mappedNet))
        return
      }

      const componentId = generateId('flat-comp')
      const originalName = String(component.props.name || component.name || '')
      const nextName = instancePrefix ? `${instancePrefix}${originalName}` : originalName
      const nextComponent: PlacedComponent = {
        ...component,
        id: componentId,
        name: nextName,
        props: {
          ...component.props,
          name: nextName,
          schX: Number(component.props.schX || 0) + offsetX,
          schY: Number(component.props.schY || 0) + offsetY
        }
      }

      localIdMap.set(component.id, componentId)
      componentById.set(componentId, nextComponent)
      flatComponents.push(nextComponent)
    })

    parsed.components
      .filter(component => component.catalogId === 'subcircuit-instance')
      .forEach((component) => {
        const subName = String(component.props.subcircuitName || component.name || '').trim()
        if (!subName) return

        const nestedPrefixBase = instancePrefix ? `${instancePrefix}${component.name}` : String(component.name || subName)
        const nestedPrefix = `${nestedPrefixBase}__`
        const nestedPortMap = new Map<string, string>()
        const ports = ((component.props.ports as string[] | undefined) || []).map(port => String(port))

        ports.forEach((portName) => {
          nestedPortMap.set(portName, `${nestedPrefix}${portName}`)
        })

        const subPath = `subcircuits/${subName}.tsx`
        expandFile(
          subPath,
          offsetX + Number(component.props.schX || 0),
          offsetY + Number(component.props.schY || 0),
          nestedPrefix,
          nestedPortMap
        )
      })

    const resolveEndpoint = (endpoint: { componentId: string; pinName: string }): { componentId: string; pinName: string } | null => {
      const component = localById.get(endpoint.componentId)
      if (!component) return null

      if (component.catalogId === 'subcircuit-instance') {
        const nestedPrefixBase = instancePrefix ? `${instancePrefix}${component.name}` : String(component.name || component.props.subcircuitName || 'sub')
        const netName = `${nestedPrefixBase}__${endpoint.pinName}`
        return { componentId: ensureNetEndpoint(netName), pinName: 'port' }
      }

      const mapped = localIdMap.get(endpoint.componentId)
      if (!mapped) return null

      const mappedComponent = componentById.get(mapped)
      if (mappedComponent?.catalogId === 'netport') {
        return { componentId: mapped, pinName: 'port' }
      }

      return { componentId: mapped, pinName: endpoint.pinName }
    }

    parsed.wires.forEach((wire) => {
      const from = resolveEndpoint(wire.from)
      const to = resolveEndpoint(wire.to)
      if (!from || !to) return

      flatWires.push({
        id: generateId('flat-wire'),
        from,
        to,
        tsxSnippet: ''
      })
    })
  }

  expandFile(rootPath, 0, 0, '')

  const renderedComponents = flatComponents
    .map(component => createComponentSnippet(component, false))
    .filter(Boolean)
    .map(line => `    ${line}`)

  const allComponentsForWires = [...componentById.values()]

  const renderedWires = flatWires
    .map(wire => createWireSnippet(wire, allComponentsForWires))
    .filter(Boolean)
    .map(line => `    ${line}`)

  const body = [...renderedComponents, ...renderedWires]
  const content = body.length > 0 ? body.join('\n') : '    {/* Add components here */}'

  return `export default () => (\n  <board width="50mm" height="50mm">\n${content}\n  </board>\n)\n`
}

const initialFsMap = loadFSMapFromStorage()
const initialCanvas = parseFileToCanvas('main.tsx', initialFsMap)

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state - load from localStorage
  fsMap: initialFsMap,
  activeFilePath: 'main.tsx',
  breadcrumbStack: [],
  selectedComponentIds: [],
  codeViewTab: 'source',
  exportPreview: null,
  placedComponents: initialCanvas.components,
  wires: initialCanvas.wires,
  wiringStart: null,
  cursorNearPin: null,
  subcircuitCreation: {
    active: false,
    componentIds: [],
    candidatePins: [],
    selectedPins: []
  },
  copiedSelection: null,
  pasteCount: 0,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  },

  // Actions
  setFSMap: (fsMap) => {
    const next = regenerateSubcircuitIndex(ensureFsMapDefaults(fsMap))
    saveFSMapToStorage(next)
    set({ fsMap: next })
  },

  setActiveFilePath: (filePath) => {
    const state = get()
    if (filePath === state.activeFilePath) return

    get().regenerateTSX()

    let fsMap = { ...state.fsMap }
    if (!fsMap[filePath] && filePath.startsWith('subcircuits/')) {
      const name = filePath.replace('subcircuits/', '').replace('.tsx', '')
      fsMap[filePath] = `export function ${name}(props: { name: string; schX?: number; schY?: number }) {\n  return (\n    <subcircuit name={props.name}>\n      {/* Add components here */}\n    </subcircuit>\n  )\n}\n`
      fsMap = regenerateSubcircuitIndex(fsMap)
      saveFSMapToStorage(fsMap)
    }

    const parsed = parseFileToCanvas(filePath, fsMap)
    set({
      fsMap,
      activeFilePath: filePath,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      wiringStart: null,
      cursorNearPin: null
    })
  },

  openSubcircuitEditor: (name) => {
    const safe = toSafeIdentifier(name)
    const filePath = `subcircuits/${safe}.tsx`
    const state = get()

    if (state.activeFilePath === filePath) return

    get().regenerateTSX()

    let fsMap = { ...state.fsMap }
    if (!fsMap[filePath]) {
      fsMap[filePath] = `export function ${safe}(props: { name: string; schX?: number; schY?: number }) {\n  return (\n    <subcircuit name={props.name}>\n      {/* Add components here */}\n    </subcircuit>\n  )\n}\n`
      fsMap = regenerateSubcircuitIndex(fsMap)
      saveFSMapToStorage(fsMap)
    }

    const parsed = parseFileToCanvas(filePath, fsMap)
    set({
      fsMap,
      activeFilePath: filePath,
      breadcrumbStack: [...state.breadcrumbStack, state.activeFilePath],
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      wiringStart: null,
      cursorNearPin: null
    })
  },

  goBackFile: () => {
    const state = get()
    if (state.breadcrumbStack.length === 0) return

    get().regenerateTSX()

    const previous = state.breadcrumbStack[state.breadcrumbStack.length - 1]
    const nextStack = state.breadcrumbStack.slice(0, -1)
    const parsed = parseFileToCanvas(previous, state.fsMap)

    set({
      activeFilePath: previous,
      breadcrumbStack: nextStack,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      wiringStart: null,
      cursorNearPin: null
    })
  },

  updateFile: (filePath, content) => set((state) => {
    const newFsMap = regenerateSubcircuitIndex({
      ...state.fsMap,
      [filePath]: content
    })
    saveFSMapToStorage(newFsMap)
    return { fsMap: newFsMap }
  }),

  addPlacedComponent: (component) => set((state) => {
    const newComponents = [...state.placedComponents, component]
    setTimeout(() => get().regenerateTSX(), 0)
    return { placedComponents: newComponents }
  }),

  updatePlacedComponent: (id, updates) => set((state) => {
    const newComponents = state.placedComponents.map((component) =>
      component.id === id ? { ...component, ...updates } : component
    )

    // Persist netport position into editor/meta.json so it survives regeneration
    const updatedComp = newComponents.find(c => c.id === id)
    let nextFsMap = state.fsMap
    if (
      updatedComp?.catalogId === 'netport' &&
      updates.props?.schX !== undefined &&
      updates.props?.schY !== undefined
    ) {
      const netName = String(updatedComp.props.netName || updatedComp.name || '').trim()
      if (netName) {
        const meta = loadEditorMeta(state.fsMap)
        const nextMeta = setNetAnchor(meta, state.activeFilePath, netName, {
          schX: updates.props.schX,
          schY: updates.props.schY
        })
        if (NETPORT_DEBUG()) console.log('[netport:saved-to-meta]', { netName, schX: updates.props.schX, schY: updates.props.schY })
        nextFsMap = saveEditorMeta(state.fsMap, nextMeta)
        saveFSMapToStorage(nextFsMap)
      }
    }

    setTimeout(() => get().regenerateTSX(), 0)
    return { placedComponents: newComponents, fsMap: nextFsMap }
  }),

  rotateSelectedComponents: () => {
    const state = get()
    if (state.selectedComponentIds.length === 0) return

    const selectedSet = new Set(state.selectedComponentIds)
    const nextComponents = state.placedComponents.map((component) => {
      if (!selectedSet.has(component.id)) return component

      const rawRotation = String(component.props.schRotation || '0deg').trim()
      const parsed = Number(rawRotation.replace(/deg$/, ''))
      const current = Number.isFinite(parsed) ? parsed : 0
      const normalized = ((current % 360) + 360) % 360
      const nextRotation = (normalized + 90) % 360

      return {
        ...component,
        props: {
          ...component.props,
          schRotation: `${nextRotation}deg`
        }
      }
    })

    set({ placedComponents: nextComponents })
    setTimeout(() => get().regenerateTSX(), 0)
  },

  removePlacedComponent: (id) => set((state) => {
    const newComponents = state.placedComponents.filter((comp) => comp.id !== id)
    const newWires = state.wires.filter((wire) => wire.from.componentId !== id && wire.to.componentId !== id)
    const newSelectedIds = state.selectedComponentIds.filter(selectedId => selectedId !== id)
    setTimeout(() => get().regenerateTSX(), 0)
    return { 
      placedComponents: newComponents,
      wires: newWires,
      selectedComponentIds: newSelectedIds
    }
  }),

  removeSelectedComponents: () => {
    const state = get()
    let newComponents = state.placedComponents
    let newWires = state.wires

    // Remove all selected components
    for (const id of state.selectedComponentIds) {
      newComponents = newComponents.filter(comp => comp.id !== id)
      newWires = newWires.filter(w => 
        w.from.componentId !== id && w.to.componentId !== id
      )
    }

    set({ 
      placedComponents: newComponents,
      wires: newWires,
      selectedComponentIds: []
    })
    
    setTimeout(() => get().regenerateTSX(), 0)
  },

  setSelectedComponents: (ids) => set({ selectedComponentIds: ids }),

  toggleComponentSelection: (id) => set((state) => {
    const isSelected = state.selectedComponentIds.includes(id)
    if (isSelected) {
      return { selectedComponentIds: state.selectedComponentIds.filter(selectedId => selectedId !== id) }
    } else {
      return { selectedComponentIds: [...state.selectedComponentIds, id] }
    }
  }),

  copySelectedComponents: () => {
    const state = get()
    if (state.selectedComponentIds.length === 0) return

    const selectedSet = new Set(state.selectedComponentIds)
    const components = state.placedComponents
      .filter(component => selectedSet.has(component.id))
      .map(component => ({
        ...component,
        props: { ...component.props }
      }))

    const wires = state.wires
      .filter(wire => selectedSet.has(wire.from.componentId) && selectedSet.has(wire.to.componentId))
      .map(wire => ({
        ...wire,
        from: { ...wire.from },
        to: { ...wire.to }
      }))

    set({ copiedSelection: { components, wires } })
  },

  pasteCopiedComponents: () => {
    const state = get()
    if (!state.copiedSelection || state.copiedSelection.components.length === 0) return

    const nextPasteCount = state.pasteCount + 1
    const offset = nextPasteCount * 8
    const usedNames = new Set(state.placedComponents.map(component => component.name))
    const idMap = new Map<string, string>()
    const now = Date.now()

    const pastedComponents: PlacedComponent[] = state.copiedSelection.components.map((component, index) => {
      const newId = `comp-paste-${now}-${index}-${Math.random().toString(36).slice(2, 7)}`
      idMap.set(component.id, newId)

      let nextName = component.name
      if (component.catalogId !== 'net' && usedNames.has(nextName)) {
        let i = 1
        while (usedNames.has(`${component.name}_${i}`)) {
          i += 1
        }
        nextName = `${component.name}_${i}`
      }
      usedNames.add(nextName)

      return {
        ...component,
        id: newId,
        name: nextName,
        props: {
          ...component.props,
          schX: Number(component.props.schX || 0) + offset,
          schY: Number(component.props.schY || 0) + offset
        }
      }
    })

    const pastedWires: WireConnection[] = state.copiedSelection.wires
      .map((wire, index) => {
        const nextFromId = idMap.get(wire.from.componentId)
        const nextToId = idMap.get(wire.to.componentId)
        if (!nextFromId || !nextToId) return null

        return {
          ...wire,
          id: `wire-paste-${now}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          from: {
            componentId: nextFromId,
            pinName: wire.from.pinName
          },
          to: {
            componentId: nextToId,
            pinName: wire.to.pinName
          }
        }
      })
      .filter((wire): wire is WireConnection => wire !== null)

    set({
      placedComponents: [...state.placedComponents, ...pastedComponents],
      wires: [...state.wires, ...pastedWires],
      selectedComponentIds: pastedComponents.map(component => component.id),
      pasteCount: nextPasteCount
    })

    setTimeout(() => get().regenerateTSX(), 0)
  },

  setViewport: (viewport) => set((state) => ({
    viewport: { ...state.viewport, ...viewport }
  })),

  setCursorNearPin: (info) => set({ cursorNearPin: info }),

  startWiring: (componentId, pinName) => set({
    wiringStart: { componentId, pinName }
  }),

  completeWiring: (componentId, pinName) => {
    const state = get()
    if (!state.wiringStart) return

    const fromComp = state.placedComponents.find(c => c.id === state.wiringStart!.componentId)
    const toComp = state.placedComponents.find(c => c.id === componentId)

    if (!fromComp || !toComp) return

    const newWire: WireConnection = {
      id: `wire-${Date.now()}`,
      from: {
        componentId: state.wiringStart.componentId,
        pinName: state.wiringStart.pinName
      },
      to: {
        componentId,
        pinName
      },
      tsxSnippet: `<trace from=".${fromComp.name} > .${state.wiringStart.pinName}" to=".${toComp.name} > .${pinName}" />`
    }

    set((state) => ({
      wires: [...state.wires, newWire],
      wiringStart: null
    }))

    setTimeout(() => get().regenerateTSX(), 0)
  },

  cancelWiring: () => set({ wiringStart: null }),

  removeWire: (wireId) => set((state) => {
    const orphanedNetports = getOrphanedNetportsAfterRemovingWires(
      state.placedComponents,
      state.wires,
      new Set([wireId])
    )

    if (orphanedNetports.length > 0) {
      const label = orphanedNetports.join(', ')
      const shouldContinue = window.confirm(
        `Removing this wire disconnects net anchor(s): ${label}. Continue?`
      )
      if (!shouldContinue) {
        return state
      }
    }

    const newWires = state.wires.filter(w => w.id !== wireId)
    setTimeout(() => get().regenerateTSX(), 0)
    return { wires: newWires }
  }),

  disconnectPin: (componentId, pinName) => set((state) => {
    const removedWireIds = new Set(
      state.wires
        .filter(w =>
          (w.from.componentId === componentId && w.from.pinName === pinName) ||
          (w.to.componentId === componentId && w.to.pinName === pinName)
        )
        .map(w => w.id)
    )

    const orphanedNetports = getOrphanedNetportsAfterRemovingWires(
      state.placedComponents,
      state.wires,
      removedWireIds
    )

    if (orphanedNetports.length > 0) {
      const label = orphanedNetports.join(', ')
      const shouldContinue = window.confirm(
        `Disconnecting this pin removes the last wire for net anchor(s): ${label}. Continue?`
      )
      if (!shouldContinue) {
        return state
      }
    }

    const newWires = state.wires.filter(w => !removedWireIds.has(w.id))
    setTimeout(() => get().regenerateTSX(), 0)
    return { wires: newWires }
  }),

  beginSubcircuitPinSelection: (componentIds) => {
    const state = get()
    const selectedSet = new Set(componentIds)
    const candidatePins: SelectedPinRef[] = []
    const seen = new Set<string>()

    state.wires.forEach((wire) => {
      const fromInside = selectedSet.has(wire.from.componentId)
      const toInside = selectedSet.has(wire.to.componentId)
      if (fromInside === toInside) return

      const endpoint = fromInside ? wire.from : wire.to
      const key = `${endpoint.componentId}:${endpoint.pinName}`
      if (seen.has(key)) return
      seen.add(key)

      candidatePins.push({
        componentId: endpoint.componentId,
        pinName: endpoint.pinName
      })
    })

    if (candidatePins.length === 0) {
      state.placedComponents
        .filter(component => selectedSet.has(component.id))
        .forEach((component) => {
          const pins = getPinConfig(component.catalogId)?.pins || []
          pins.forEach((pin) => {
            const key = `${component.id}:${pin.name}`
            if (seen.has(key)) return
            seen.add(key)

            candidatePins.push({
              componentId: component.id,
              pinName: pin.name
            })
          })
        })
    }

    set({
      subcircuitCreation: {
        active: true,
        componentIds,
        candidatePins,
        selectedPins: []
      }
    })
  },

  toggleSubcircuitPinSelection: (componentId, pinName) => {
    const state = get()
    if (!state.subcircuitCreation.active) return

    const key = `${componentId}:${pinName}`
    const isCandidate = state.subcircuitCreation.candidatePins.some(
      pin => `${pin.componentId}:${pin.pinName}` === key
    )
    if (!isCandidate) return

    const alreadySelected = state.subcircuitCreation.selectedPins.some(
      pin => `${pin.componentId}:${pin.pinName}` === key
    )

    const selectedPins = alreadySelected
      ? state.subcircuitCreation.selectedPins.filter(pin => `${pin.componentId}:${pin.pinName}` !== key)
      : [...state.subcircuitCreation.selectedPins, { componentId, pinName }]

    set({
      subcircuitCreation: {
        ...state.subcircuitCreation,
        selectedPins
      }
    })
  },

  cancelSubcircuitPinSelection: () => set({
    subcircuitCreation: {
      active: false,
      componentIds: [],
      candidatePins: [],
      selectedPins: []
    }
  }),

  exposeSubcircuitPort: (componentId, pinName, portName) => {
    const state = get()
    if (!state.activeFilePath.startsWith('subcircuits/')) return

    const sanitizedPort = portName.trim().replace(/[^A-Za-z0-9_]/g, '_')
    if (!sanitizedPort) return

    const sourceComponent = state.placedComponents.find(component => component.id === componentId)
    if (!sourceComponent || sourceComponent.catalogId === 'netport' || sourceComponent.catalogId === 'subcircuit-instance') {
      return
    }

    const nextComponents = [...state.placedComponents]
    const netRegistry = buildNetRegistryFromComponents(nextComponents)
    const netId = netRegistry.getNetId(sanitizedPort)
    const canonicalName = netRegistry.getNetName(netId) || sanitizedPort

    let netPortComponent = nextComponents.find(
      component => component.catalogId === 'netport' && (
        component.props.netId === netId ||
        component.props.netName === canonicalName ||
        component.name === canonicalName
      )
    )

    if (!netPortComponent) {
      netPortComponent = {
        id: `net-${Date.now()}-${netId}`,
        catalogId: 'netport',
        name: canonicalName,
        props: {
          netId,
          netName: canonicalName,
          schX: (sourceComponent.props.schX || 0) + 24,
          schY: sourceComponent.props.schY || 0
        },
        tsxSnippet: ''
      }
      nextComponents.push(netPortComponent)
    }

    const alreadyConnected = state.wires.some(wire => (
      wire.from.componentId === componentId &&
      wire.from.pinName === pinName &&
      wire.to.componentId === netPortComponent!.id
    ) || (
      wire.to.componentId === componentId &&
      wire.to.pinName === pinName &&
      wire.from.componentId === netPortComponent!.id
    ))

    if (alreadyConnected) return

    const nextWires = [
      ...state.wires,
      {
        id: `wire-port-${Date.now()}`,
        from: { componentId, pinName },
        to: { componentId: netPortComponent.id, pinName: 'port' },
        tsxSnippet: ''
      }
    ]

    set({
      placedComponents: nextComponents,
      wires: nextWires,
      selectedComponentIds: [componentId]
    })

    setTimeout(() => get().regenerateTSX(), 0)
  },

  createSubcircuit: (name, componentIds, exposedPorts) => {
    const state = get()
    const safeName = toSafeIdentifier(name)
    if (!safeName || componentIds.length === 0) return

    const selectedSet = new Set(componentIds)
    const selectedComponents = state.placedComponents.filter(c => selectedSet.has(c.id) && c.catalogId !== 'netport')
    if (selectedComponents.length === 0) return

    const minX = Math.min(...selectedComponents.map(c => c.props.schX || 0))
    const minY = Math.min(...selectedComponents.map(c => c.props.schY || 0))

    const validBoundary = new Set<string>()
    state.wires.forEach(wire => {
      const fromInside = selectedSet.has(wire.from.componentId)
      const toInside = selectedSet.has(wire.to.componentId)
      if (fromInside !== toInside) {
        if (fromInside) validBoundary.add(`${wire.from.componentId}:${wire.from.pinName}`)
        if (toInside) validBoundary.add(`${wire.to.componentId}:${wire.to.pinName}`)
      }
    })

    const chosenPorts = exposedPorts
      .map(port => ({
        ...port,
        portName: port.portName.trim().replace(/[^A-Za-z0-9_]/g, '_')
      }))
      .filter(port => port.portName.length > 0)

    const boundaryToPort = new Map<string, string>()
    chosenPorts.forEach(port => {
      boundaryToPort.set(`${port.componentId}:${port.pinName}`, port.portName)
    })

    const subComponents: PlacedComponent[] = selectedComponents.map(component => ({
      ...component,
      props: {
        ...component.props,
        schX: (component.props.schX || 0) - minX,
        schY: (component.props.schY || 0) - minY
      }
    }))

    const internalWires = state.wires
      .filter(wire => selectedSet.has(wire.from.componentId) && selectedSet.has(wire.to.componentId))
      .map(wire => ({ ...wire }))

    const subNetRegistry = buildNetRegistryFromComponents(subComponents)
    const netIdToComponentId = new Map<string, string>()
    const portNameToNetId = new Map<string, string>()
    chosenPorts.forEach((port, index) => {
      const netId = subNetRegistry.getNetId(port.portName)
      const canonicalName = subNetRegistry.getNetName(netId) || port.portName
      portNameToNetId.set(port.portName, netId)

      if (netIdToComponentId.has(netId)) return

      const source = subComponents.find(c => c.id === port.componentId)
      const componentId = `net-${safeName}-${netId}`
      netIdToComponentId.set(netId, componentId)
      subComponents.push({
        id: componentId,
        catalogId: 'netport',
        name: canonicalName,
        props: {
          netId,
          netName: canonicalName,
          schX: (source?.props.schX || 0) + 24,
          schY: (source?.props.schY || 0) + index * 12
        },
        tsxSnippet: ''
      })
    })

    chosenPorts.forEach((port, index) => {
      const netId = portNameToNetId.get(port.portName)
      const netComponentId = netId ? netIdToComponentId.get(netId) : undefined
      if (!netComponentId) return
      internalWires.push({
        id: `wire-port-${Date.now()}-${index}`,
        from: { componentId: port.componentId, pinName: port.pinName },
        to: { componentId: netComponentId, pinName: 'port' },
        tsxSnippet: ''
      })
    })

    const portList = [...new Set(chosenPorts.map(port => port.portName))]
    const subPath = `subcircuits/${safeName}.tsx`
    const subContent = generateFileTSX(subPath, subComponents, internalWires)
    const portsConst = `export const ports = [${portList.map(port => `"${port}"`).join(', ')}] as const\n\n`
    const subContentWithPorts = subContent.includes('export const ports =')
      ? subContent
      : `${portsConst}${subContent}`

    let nextFsMap = regenerateSubcircuitIndex({
      ...state.fsMap,
      [subPath]: subContentWithPorts
    })

    const boundaryWires = state.wires.filter(wire => {
      const fromInside = selectedSet.has(wire.from.componentId)
      const toInside = selectedSet.has(wire.to.componentId)
      return fromInside !== toInside
    })

    const instanceName = toUniqueName(safeName, state.placedComponents.map(c => c.name))
    const instanceId = `sub-${Date.now()}`

    const instance: PlacedComponent = {
      id: instanceId,
      catalogId: 'subcircuit-instance',
      name: instanceName,
      props: {
        subcircuitName: safeName,
        ports: portList,
        schX: minX,
        schY: minY
      },
      tsxSnippet: ''
    }

    const remainingComponents = state.placedComponents.filter(component => !selectedSet.has(component.id))
    const remainingWires = state.wires.filter(wire => !selectedSet.has(wire.from.componentId) && !selectedSet.has(wire.to.componentId))

    const rewiredBoundary: WireConnection[] = []
    boundaryWires.forEach((wire, index) => {
      const fromInside = selectedSet.has(wire.from.componentId)
      const insideEndpoint = fromInside ? wire.from : wire.to
      const outsideEndpoint = fromInside ? wire.to : wire.from
      const key = `${insideEndpoint.componentId}:${insideEndpoint.pinName}`
      const portName = boundaryToPort.get(key)
      if (!portName) return

      rewiredBoundary.push({
        id: `wire-rewire-${Date.now()}-${index}`,
        from: {
          componentId: outsideEndpoint.componentId,
          pinName: outsideEndpoint.pinName
        },
        to: {
          componentId: instanceId,
          pinName: portName
        },
        tsxSnippet: ''
      })
    })

    const nextComponents = [...remainingComponents, instance]
    const nextWires = [...remainingWires, ...rewiredBoundary]

    const newActiveContent = generateFileTSX(state.activeFilePath, nextComponents, nextWires)
    nextFsMap = regenerateSubcircuitIndex({
      ...nextFsMap,
      [state.activeFilePath]: newActiveContent
    })
    saveFSMapToStorage(nextFsMap)

    set({
      fsMap: nextFsMap,
      placedComponents: nextComponents,
      wires: nextWires,
      selectedComponentIds: [],
      subcircuitCreation: {
        active: false,
        componentIds: [],
        candidatePins: [],
        selectedPins: []
      }
    })
  },

  generateFlatCircuitTSX: () => {
    const state = get()
    const syncedFiles: FSMap = { ...state.fsMap }

    // Always sync the currently edited file from live canvas state first.
    syncedFiles[state.activeFilePath] = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)

    Object.keys(syncedFiles)
      .filter(path => path === 'main.tsx' || (path.startsWith('subcircuits/') && path.endsWith('.tsx')))
      .forEach((path) => {
        const parsed = parseFileToCanvas(path, syncedFiles)
        syncedFiles[path] = generateFileTSX(path, parsed.components, parsed.wires)
      })

    const files = regenerateSubcircuitIndex(syncedFiles)
    return generateFlatMainTSX(files)
  },

  generateProjectStructure: () => {
    const state = get()
    const syncedFiles: FSMap = { ...state.fsMap }

    // Always sync the currently edited file from live canvas state first.
    syncedFiles[state.activeFilePath] = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)

    Object.keys(syncedFiles)
      .filter(path => path === 'main.tsx' || (path.startsWith('subcircuits/') && path.endsWith('.tsx')))
      .forEach((path) => {
        const parsed = parseFileToCanvas(path, syncedFiles)
        syncedFiles[path] = generateFileTSX(path, parsed.components, parsed.wires)
      })

    const files = regenerateSubcircuitIndex(syncedFiles)
    const { ['main.tsx']: parent = '', ...children } = files

    return {
      parent,
      children
    }
  },

  generateParentChildrenStructure: () => {
    const structure = get().generateProjectStructure()

    return {
      parent: structure.parent,
      children: structure.children
    }
  },

  importTSXIntoActiveFile: (content) => {
    const state = get()
    const normalized = normalizeImportedTSXContent(content, state.activeFilePath)
    const nextFsMap = regenerateSubcircuitIndex({
      ...state.fsMap,
      [state.activeFilePath]: normalized
    })

    saveFSMapToStorage(nextFsMap)

    const parsed = parseFileToCanvas(state.activeFilePath, nextFsMap)
    set({
      fsMap: nextFsMap,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      wiringStart: null,
      cursorNearPin: null,
      exportPreview: null,
      codeViewTab: 'source'
    })
  },

  applyLayout: async () => {
    const state = get()
    const layoutTargets = state.placedComponents.filter(c => c.catalogId !== 'netport')
    if (layoutTargets.length === 0) return

    try {
      const { layoutCircuit } = await import('../utils/elkLayout')
      
      // Build edges from wires
      const edges = state.wires.map(w => ({
        from: { componentId: w.from.componentId },
        to: { componentId: w.to.componentId }
      }))

      // Compute layout using ELK
      const positionMap = await layoutCircuit(layoutTargets, edges)

      // Update all component positions
      const newComponents = state.placedComponents.map(comp => {
        const newPos = positionMap.get(comp.id)
        if (newPos) {
          return {
            ...comp,
            props: {
              ...comp.props,
              schX: newPos.x,
              schY: newPos.y
            }
          }
        }
        return comp
      })

      set({ placedComponents: newComponents })
      
      // Regenerate TSX with new positions
      setTimeout(() => get().regenerateTSX(), 0)
    } catch (error) {
      console.error('Layout failed:', error)
    }
  },

  regenerateTSX: () => {
    const state = get()
    if (NETPORT_DEBUG()) {
      const netports = state.placedComponents.filter(c => c.catalogId === 'netport')
      console.log('[netport:regenerate]', state.activeFilePath, netports.map(c => ({ name: c.name, schX: c.props.schX, schY: c.props.schY })))
    }
    const currentContent = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)
    const nextFsMap = regenerateSubcircuitIndex({
      ...state.fsMap,
      [state.activeFilePath]: currentContent
    })

    saveFSMapToStorage(nextFsMap)
    set({ fsMap: nextFsMap })
  },

  setCodeViewTab: (tab) => set({ codeViewTab: tab }),

  setExportPreview: (preview) => set({ exportPreview: preview })
}))

export const minimalImportExportTestUtils = {
  parseImportedTSXToCanvas: (content: string, filePath = 'main.tsx') => {
    const normalized = normalizeImportedTSXContent(content, filePath)
    const fsMap = ensureFsMapDefaults({ [filePath]: normalized })
    return parseFileToCanvas(filePath, fsMap)
  },
  exportCanvasToTSX: (
    filePath: string,
    components: PlacedComponent[],
    wires: WireConnection[]
  ) => generateFileTSX(filePath, components, wires),
  normalizeImportedTSXContent
}
