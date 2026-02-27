import { create } from 'zustand'
import { getCatalogItem } from '../catalog'
import { ExposedPortSelection, FSMap, PlacedComponent, EditorState, SelectedPinRef, WireConnection } from '../types/catalog'
import { getPinConfig } from '../types/schematic'

interface EditorStore extends EditorState {
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
  beginSubcircuitPinSelection: (componentIds: string[]) => void
  toggleSubcircuitPinSelection: (componentId: string, pinName: string) => void
  cancelSubcircuitPinSelection: () => void
  exposeSubcircuitPort: (componentId: string, pinName: string, portName: string) => void
  setCursorNearPin: (info: { componentId: string; pinName: string } | null) => void
  createSubcircuit: (name: string, componentIds: string[], exposedPorts: ExposedPortSelection[]) => void
  applyLayout: () => Promise<void>
  regenerateTSX: () => void
  generateParentChildrenStructure: () => { parent: string; children: Record<string, string> }
}

const DEFAULT_MAIN_TSX = `circuit.add(
  <board width="50mm" height="50mm">
    {/* Add components here */}
  </board>
)
`

const DEFAULT_SUBCIRCUITS_INDEX = ''

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

  // Migrate old patches/* files to subcircuits/*
  Object.entries(rawMap).forEach(([path, content]) => {
    if (path.startsWith('patches/') && path.endsWith('.tsx')) {
      fsMap[path.replace('patches/', 'subcircuits/')] = content
    }
  })

  return fsMap
}

const saveFSMapToStorage = (fsMap: FSMap) => {
  try {
    localStorage.setItem('editor_fsMap', JSON.stringify(fsMap))
  } catch (e) {
    console.warn('Failed to save fsMap from localStorage:', e)
  }
}

const loadFSMapFromStorage = (): FSMap => {
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

const getSubcircuitPorts = (fsMap: FSMap, name: string): string[] => {
  const filePath = `subcircuits/${name}.tsx`
  const content = fsMap[filePath] || ''
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

const parseSchExpr = (expr: string, isSubcircuitFile: boolean): number => {
  const compact = expr.replace(/\s+/g, '')
  if (isSubcircuitFile) {
    const withOffset = compact.match(/^[xy]\+(-?\d+(?:\.\d+)?)$/)
    if (withOffset) return Number(withOffset[1])
  }

  const num = Number(compact)
  return Number.isFinite(num) ? num : 0
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

  const componentRegex = /<([A-Za-z_][A-Za-z0-9_]*)\s+([^>]*?)\/>/g
  let componentMatch

  while ((componentMatch = componentRegex.exec(body)) !== null) {
    const tagName = componentMatch[1]
    const propsStr = componentMatch[2]
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

    if (!name) continue

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
    const bucket = explicitNetComponents.get(netName) || []
    bucket.push(component.id)
    explicitNetComponents.set(netName, bucket)
  })

  const createNetPort = (portName: string, nearX: number, nearY: number): string => {
    if (netPortComponents.has(portName)) {
      return netPortComponents.get(portName)!
    }

    const id = `net-${filePath}-${portName}`
    const index = netPortComponents.size
    components.push({
      id,
      catalogId: 'netport',
      name: portName,
      props: {
        netName: portName,
        schX: nearX + 24,
        schY: nearY + index * 12
      },
      tsxSnippet: ''
    })

    netPortComponents.set(portName, id)
    return id
  }

  const resolveNetComponent = (portName: string, nearX: number, nearY: number): string => {
    const explicitIds = explicitNetComponents.get(portName) || []
    if (explicitIds.length === 0) {
      return createNetPort(portName, nearX, nearY)
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
    }
  }

  return { components, wires }
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

const toAttrString = (props: Record<string, any>): string => {
  const attrs: string[] = []

  Object.entries(props)
    .filter(([key]) => !['name', 'schX', 'schY', 'subcircuitName', 'ports', 'netName'].includes(key))
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
      attrs.push(`${key}="${String(value)}"`)
    })

  return attrs.join(' ')
}

const createComponentSnippet = (component: PlacedComponent, inSubcircuitFile: boolean): string => {
  if (component.catalogId === 'netport') return ''

  const tagName = getComponentTagName(component)
  const attrs = toAttrString(component.props)
  const name = String(component.props.name || component.name || '').trim()
  const x = Number(component.props.schX || 0)
  const y = Number(component.props.schY || 0)
  const schXExpr = inSubcircuitFile ? `{x + ${x}}` : `{${x}}`
  const schYExpr = inSubcircuitFile ? `{y + ${y}}` : `{${y}}`
  const nameSegment = name ? `name="${name}" ` : ''
  const attrSegment = attrs ? `${attrs} ` : ''

  return `<${tagName} ${nameSegment}${attrSegment}schX=${schXExpr} schY=${schYExpr} />`
}

const traceEndpointRef = (component: PlacedComponent | undefined, pinName: string): string | null => {
  if (!component) return null
  if (component.catalogId === 'netport' || component.catalogId === 'net') {
    const netName = component.props.netName || component.name
    return `net.${netName}`
  }
  return `.${component.name} > .${pinName}`
}

const createWireSnippet = (wire: WireConnection, components: PlacedComponent[]): string => {
  const fromComponent = components.find(c => c.id === wire.from.componentId)
  const toComponent = components.find(c => c.id === wire.to.componentId)

  const from = traceEndpointRef(fromComponent, wire.from.pinName)
  const to = traceEndpointRef(toComponent, wire.to.pinName)
  if (!from || !to) return ''

  return `<trace from="${from}" to="${to}" />`
}

const generateFileTSX = (filePath: string, components: PlacedComponent[], wires: WireConnection[]): string => {
  const isMain = filePath === 'main.tsx'
  const inSubcircuit = !isMain
  const lines: string[] = []

  const renderedComponents = components
    .map(component => createComponentSnippet(component, inSubcircuit))
    .filter(Boolean)
    .map(line => `    ${line}`)

  const renderedWires = wires
    .map(wire => createWireSnippet(wire, components))
    .filter(Boolean)
    .map(line => `    ${line}`)

  lines.push(...renderedComponents, ...renderedWires)
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
      .map(name => `import { ${name} } from "./subcircuits/${name}"`)
      .join('\n')

    return `${imports ? `${imports}\n\n` : ''}circuit.add(\n  <board width="50mm" height="50mm">\n${body}\n  </board>\n)\n`
  }

  const subcircuitName = filePath.replace('subcircuits/', '').replace('.tsx', '')
  return `export function ${subcircuitName}(props: { name: string; schX?: number; schY?: number }) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n${body}\n    </subcircuit>\n  )\n}\n`
}

const initialFsMap = loadFSMapFromStorage()
const initialCanvas = parseFileToCanvas('main.tsx', initialFsMap)

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state - load from localStorage
  fsMap: initialFsMap,
  activeFilePath: 'main.tsx',
  breadcrumbStack: [],
  selectedComponentIds: [],
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
      fsMap[filePath] = `export function ${name}(props: { name: string; schX?: number; schY?: number }) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n      {/* Add components here */}\n    </subcircuit>\n  )\n}\n`
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
      fsMap[filePath] = `export function ${safe}(props: { name: string; schX?: number; schY?: number }) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n      {/* Add components here */}\n    </subcircuit>\n  )\n}\n`
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
    setTimeout(() => get().regenerateTSX(), 0)
    return { placedComponents: newComponents }
  }),

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
    const newWires = state.wires.filter(w => w.id !== wireId)
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
    let netPortComponent = nextComponents.find(
      component => component.catalogId === 'netport' && (component.props.netName === sanitizedPort || component.name === sanitizedPort)
    )

    if (!netPortComponent) {
      netPortComponent = {
        id: `net-${Date.now()}-${sanitizedPort}`,
        catalogId: 'netport',
        name: sanitizedPort,
        props: {
          netName: sanitizedPort,
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

    const portNameToNetId = new Map<string, string>()
    chosenPorts.forEach((port, index) => {
      if (portNameToNetId.has(port.portName)) return

      const source = subComponents.find(c => c.id === port.componentId)
      portNameToNetId.set(port.portName, `net-${safeName}-${port.portName}`)
      subComponents.push({
        id: `net-${safeName}-${port.portName}`,
        catalogId: 'netport',
        name: port.portName,
        props: {
          netName: port.portName,
          schX: (source?.props.schX || 0) + 24,
          schY: (source?.props.schY || 0) + index * 12
        },
        tsxSnippet: ''
      })
    })

    chosenPorts.forEach((port, index) => {
      const netId = portNameToNetId.get(port.portName)
      if (!netId) return
      internalWires.push({
        id: `wire-port-${Date.now()}-${index}`,
        from: { componentId: port.componentId, pinName: port.pinName },
        to: { componentId: netId, pinName: 'port' },
        tsxSnippet: ''
      })
    })

    const subPath = `subcircuits/${safeName}.tsx`
    const subContent = generateFileTSX(subPath, subComponents, internalWires)

    let nextFsMap = regenerateSubcircuitIndex({
      ...state.fsMap,
      [subPath]: subContent
    })

    const boundaryWires = state.wires.filter(wire => {
      const fromInside = selectedSet.has(wire.from.componentId)
      const toInside = selectedSet.has(wire.to.componentId)
      return fromInside !== toInside
    })

    const instanceName = toUniqueName(safeName, state.placedComponents.map(c => c.name))
    const portList = [...new Set(chosenPorts.map(port => port.portName))]
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

  generateParentChildrenStructure: () => {
    const state = get()
    const syncedMain = generateFileTSX('main.tsx', state.placedComponents, state.wires)
    const files = regenerateSubcircuitIndex({
      ...state.fsMap,
      'main.tsx': syncedMain
    })

    return {
      parent: files['main.tsx'] || '',
      children: Object.fromEntries(
        Object.entries(files).filter(([path]) => path !== 'main.tsx')
      )
    }
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
    const currentContent = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)
    const nextFsMap = regenerateSubcircuitIndex({
      ...state.fsMap,
      [state.activeFilePath]: currentContent
    })

    saveFSMapToStorage(nextFsMap)
    set({ fsMap: nextFsMap })
  }
}))
