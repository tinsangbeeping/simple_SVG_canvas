import { create } from 'zustand'
import { getCatalogItem } from '../catalog'
import { loadEditorMeta, saveEditorMeta, getNetAnchor, setNetAnchor } from './metaHelpers'
import * as parser from '@babel/parser'
import { WorkspaceData, StoredWorkspaceState } from '../types/workspace'
import { PatchDefinition } from '../types/project'
import {
  classifyFilePath,
  detectFileKind,
  getFolderForDetectedFileKind,
  isCanvasEditableFileType
} from '../utils/fileClassification'
import {
  buildDependencyGraph,
  buildImportedProjectState,
  buildSubcircuitRegistry
} from '../utils/projectManager'
import {
  createDefaultWorkspaceFsMap,
  ensureWorkspaceFsMapDefaults,
  exportWorkspaceJson,
  importWorkspaceJson
} from './workspaceFs'

// Round 0 DEBUG — set to true in browser console: window.__NETPORT_DEBUG = true
const NETPORT_DEBUG = () => typeof window !== 'undefined' && !!(window as any).__NETPORT_DEBUG
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
  undoStack: { components: PlacedComponent[]; wires: WireConnection[] }[]
  redoStack: { components: PlacedComponent[]; wires: WireConnection[] }[]
  // Actions
  setFSMap: (fsMap: FSMap) => void
  setActiveFilePath: (filePath: string) => void
  openSubcircuitEditor: (name: string) => void
  insertSubcircuitInstance: (name: string, options?: { schX?: number; schY?: number; filePath?: string }) => void
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
  importFilesBatch: (files: Array<{ fileName: string; content: string }>) => void
  applyPatch: (patch: PatchDefinition) => void
  setCodeViewTab: (tab: 'source' | 'export') => void
  setExportPreview: (preview: { fileName: string; content: string } | null) => void
  // Workspace actions
  createWorkspace: (name?: string) => void
  switchWorkspace: (id: string) => void
  deleteWorkspace: (id: string) => void
  renameWorkspace: (id: string, name: string) => void
  importWorkspaceJSON: (json: string) => void
  exportWorkspaceJSON: () => string
  importWorkspace: (payload: string, nameOverride?: string) => void
  exportActiveWorkspace: () => string
  // File tab actions
  openFileTab: (filePath: string) => void
  closeFileTab: (filePath: string) => void
  deleteFile: (filePath: string) => void
  moveFile: (oldPath: string, newPath: string) => void
  // Undo/redo
  undo: () => void
  redo: () => void
  pushUndoSnapshot: () => void
}

const SCHEMATIC_MAIN_PATH = 'schematics/main.tsx'
const LEGACY_MAIN_PATH = 'main.tsx'
const DEFAULT_SUBCIRCUITS_INDEX = ''

const isMainSchematicPath = (filePath: string): boolean => filePath === SCHEMATIC_MAIN_PATH || filePath === LEGACY_MAIN_PATH
const isSchematicFilePath = (filePath: string): boolean => {
  return isMainSchematicPath(filePath) || filePath.startsWith('schematics/')
}

const doesPathMatchDetectedKind = (filePath: string, kind: ReturnType<typeof detectFileKind>): boolean => {
  if (kind === 'schematic') return isSchematicFilePath(filePath)
  if (kind === 'subcircuit') return filePath.startsWith('subcircuits/')
  if (kind === 'symbol') return filePath.startsWith('symbols/')
  return true
}

const isCanvasEditableFilePath = (filePath: string): boolean => {
  return isCanvasEditableFileType(classifyFilePath(filePath))
}

const validateFilePlacement = (filePath: string, content: string): void => {
  const kind = detectFileKind(content)
  if (kind === 'unknown') return

  if (kind === 'schematic' && !isSchematicFilePath(filePath)) {
    throw new Error('Board schematic files must live under schematics/.')
  }

  if (kind === 'subcircuit' && !filePath.startsWith('subcircuits/')) {
    throw new Error('Subcircuit files must live under subcircuits/.')
  }

  if (kind === 'symbol' && !filePath.startsWith('symbols/')) {
    throw new Error('Symbol files must live under symbols/.')
  }
}

const getCanonicalFilePathForContent = (
  requestedPath: string,
  content: string,
  fsMap: FSMap,
  options?: { preserveRequestedPath?: boolean }
): string => {
  const normalizedRequestedPath = requestedPath === LEGACY_MAIN_PATH ? SCHEMATIC_MAIN_PATH : requestedPath
  const kind = detectFileKind(content)

  if (kind === 'unknown') {
    return normalizedRequestedPath
  }

  if (options?.preserveRequestedPath && doesPathMatchDetectedKind(normalizedRequestedPath, kind)) {
    return normalizedRequestedPath
  }

  if (kind === 'schematic' && isMainSchematicPath(normalizedRequestedPath)) {
    return SCHEMATIC_MAIN_PATH
  }

  const folder = getFolderForDetectedFileKind(kind)
  const fallbackBaseName = getFileBaseName(normalizedRequestedPath)
  const rawBaseName = extractExportedIdentifier(content)
    || (fallbackBaseName.toLowerCase() === 'main' ? 'ImportedThing' : fallbackBaseName)
    || 'ImportedThing'
  const safeBaseName = toSafeIdentifier(rawBaseName)
  const candidate = `${folder}/${safeBaseName}.tsx`

  if (candidate === normalizedRequestedPath || !fsMap[candidate]) {
    return candidate
  }

  const usedNames = Object.keys(fsMap)
    .filter(path => path.startsWith(`${folder}/`) && path.endsWith('.tsx'))
    .map(path => path.replace(`${folder}/`, '').replace('.tsx', ''))

  return `${folder}/${toUniqueName(safeBaseName, usedNames)}.tsx`
}

const reconcileFsMapStructure = (rawMap: FSMap): FSMap => {
  let nextMap: FSMap = { ...rawMap }

  Object.entries(rawMap).forEach(([filePath, content]) => {
    if (!(filePath.endsWith('.tsx') || filePath === LEGACY_MAIN_PATH)) return

    const kind = detectFileKind(content)
    if (kind === 'unknown') {
      if (filePath === LEGACY_MAIN_PATH && !nextMap[SCHEMATIC_MAIN_PATH]) {
        nextMap[SCHEMATIC_MAIN_PATH] = content
        delete nextMap[LEGACY_MAIN_PATH]
      }
      return
    }

    const desiredPath = getCanonicalFilePathForContent(filePath, content, nextMap, {
      preserveRequestedPath: true
    })

    if (desiredPath !== filePath) {
      delete nextMap[filePath]
      nextMap[desiredPath] = content
    }
  })

  return nextMap
}

const getDefaultImportPosition = (index: number): { schX: number; schY: number } => ({
  schX: 80 + (index % 4) * 140,
  schY: 80 + Math.floor(index / 4) * 100
})

const indentBlock = (content: string, spaces: number): string => {
  const prefix = ' '.repeat(spaces)
  return content.split('\n').map(line => `${prefix}${line}`).join('\n')
}

const getFileBaseName = (filePath: string): string => {
  const fileName = filePath.split('/').pop() || 'ImportedThing.tsx'
  return fileName.replace(/\.tsx$/, '')
}

const extractContainerBody = (content: string, tagName: 'board' | 'subcircuit' | 'symbol'): string | null => {
  const match = content.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`))
  return match?.[1]?.trim() || null
}

const extractExportedIdentifier = (content: string): string | null => {
  const functionMatch = content.match(/export\s+(?:default\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/)
  if (functionMatch?.[1]) {
    return functionMatch[1]
  }

  const constMatches = [...content.matchAll(/export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g)]
  const preferredConst = constMatches.find(match => match[1] !== 'ports')
  return preferredConst?.[1] || null
}

const extractPortsDeclaration = (content: string): string => {
  const match = content.match(/export\s+const\s+ports\s*=\s*\[[\s\S]*?\]\s*as\s+const/)
  return match?.[0] || 'export const ports = [] as const'
}

const buildBoardModule = (body: string): string => {
  const content = body.trim() ? indentBlock(body.trim(), 4) : '    {/* Add components here */}'
  return `export default () => (\n  <board width="50mm" height="50mm">\n${content}\n  </board>\n)\n`
}

const buildSubcircuitModule = (name: string, body: string, portsDeclaration?: string): string => {
  const content = body.trim() ? indentBlock(body.trim(), 6) : '      {/* Add components here */}'
  return `${portsDeclaration || 'export const ports = [] as const'}\n\nexport function ${name}(props: { name: string; schX?: number; schY?: number }) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n${content}\n    </subcircuit>\n  )\n}\n`
}

const buildSymbolModule = (name: string, body: string): string => {
  const content = body.trim() ? indentBlock(body.trim(), 4) : '    <line x1="-8" y1="0" x2="8" y2="0" stroke="black" />'
  return `export function ${name}(props: { name: string; schX?: number; schY?: number }) {\n  return (\n    <symbol>\n${content}\n    </symbol>\n  )\n}\n`
}

const detectStandaloneImport = (content: string): { kind: 'schematic' | 'subcircuit' | 'symbol'; suggestedName: string } | null => {
  const trimmed = content.trim()
  const kind = detectFileKind(trimmed)
  if (kind === 'unknown') return null

  const exportedName = toSafeIdentifier(extractExportedIdentifier(trimmed) || 'ImportedThing')
  return { kind, suggestedName: exportedName }
}

const normalizeImportedTSXContent = (content: string, activeFilePath: string): string => {
  const trimmed = content.trim()
  const targetName = toSafeIdentifier(getFileBaseName(activeFilePath))
  const detectedKind = detectFileKind(trimmed)

  if (!trimmed) {
    if (isSchematicFilePath(activeFilePath)) {
      return createDefaultWorkspaceFsMap()[SCHEMATIC_MAIN_PATH]
    }

    if (activeFilePath.startsWith('symbols/')) {
      return buildSymbolModule(targetName, '')
    }

    return buildSubcircuitModule(targetName, '')
  }

  if (detectedKind === 'schematic' || isSchematicFilePath(activeFilePath)) {
    if (/<board[\s>]/.test(trimmed)) {
      return trimmed
    }

    const boardBody = extractContainerBody(trimmed, 'board')
    if (boardBody) {
      return buildBoardModule(boardBody)
    }

    const subcircuitBody = extractContainerBody(trimmed, 'subcircuit')
    if (subcircuitBody) {
      return buildBoardModule(subcircuitBody)
    }

    const symbolBody = extractContainerBody(trimmed, 'symbol')
    if (symbolBody) {
      return buildBoardModule(symbolBody)
    }

    return buildBoardModule(trimmed)
  }

  if (detectedKind === 'symbol' || activeFilePath.startsWith('symbols/')) {
    const symbolBody = extractContainerBody(trimmed, 'symbol')
    return buildSymbolModule(targetName, symbolBody || trimmed)
  }

  const subcircuitBody = extractContainerBody(trimmed, 'subcircuit')
  if (subcircuitBody) {
    return buildSubcircuitModule(targetName, subcircuitBody, extractPortsDeclaration(trimmed))
  }

  return buildSubcircuitModule(targetName, trimmed, extractPortsDeclaration(trimmed))
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

const makeWorkspaceId = (name: string): string => {
  const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'workspace'
  return `${base}-${Date.now()}`
}

const ensureFsMapDefaults = (rawMap: FSMap): FSMap => {
  const fsMap = regenerateSubcircuitIndex(reconcileFsMapStructure(ensureWorkspaceFsMapDefaults(rawMap)))
  if (!fsMap['subcircuits/index.ts']) {
    fsMap['subcircuits/index.ts'] = DEFAULT_SUBCIRCUITS_INDEX
  }
  return fsMap
}

const getWorkspaceDefaultFilePath = (fsMap: FSMap): string => {
  if (fsMap[SCHEMATIC_MAIN_PATH]) return SCHEMATIC_MAIN_PATH
  if (fsMap[LEGACY_MAIN_PATH]) return LEGACY_MAIN_PATH

  const firstSchematicPath = Object.keys(fsMap).sort().find(path => isSchematicFilePath(path))
  if (firstSchematicPath) return firstSchematicPath

  const firstPath = Object.keys(fsMap).sort()[0]
  return firstPath || SCHEMATIC_MAIN_PATH
}

const normalizeWorkspaceFileSelection = (
  fsMap: FSMap,
  activeFilePath?: string,
  openFilePaths?: string[]
): { activeFilePath: string; openFilePaths: string[] } => {
  const resolvedMap = ensureFsMapDefaults(fsMap)
  const fallbackPath = getWorkspaceDefaultFilePath(resolvedMap)
  const normalizePath = (path: string): string => {
    if (path === LEGACY_MAIN_PATH && resolvedMap[SCHEMATIC_MAIN_PATH]) {
      return SCHEMATIC_MAIN_PATH
    }

    if (!resolvedMap[path]) {
      const fileName = path.split('/').pop()
      const relocatedPath = Object.keys(resolvedMap).find(candidate => candidate.endsWith(`/${fileName}`))
      if (relocatedPath) return relocatedPath
    }

    return path
  }

  const dedupedOpen = Array.from(new Set((openFilePaths || []).map(normalizePath)))
    .filter(path => !!resolvedMap[path])

  let resolvedActive = normalizePath(activeFilePath || fallbackPath)
  if (!resolvedMap[resolvedActive]) {
    resolvedActive = fallbackPath
  }

  const resolvedOpen = dedupedOpen.length > 0 ? dedupedOpen : [resolvedActive]
  if (!resolvedOpen.includes(resolvedActive)) {
    resolvedOpen.push(resolvedActive)
  }

  return {
    activeFilePath: resolvedActive,
    openFilePaths: resolvedOpen
  }
}

const normalizeWorkspaceData = (workspace: WorkspaceData): WorkspaceData => {
  const fsMap = ensureFsMapDefaults(workspace.fsMap || {})
  const files = normalizeWorkspaceFileSelection(fsMap, workspace.activeFilePath, workspace.openFilePaths)
  return {
    ...workspace,
    fsMap,
    activeFilePath: files.activeFilePath,
    openFilePaths: files.openFilePaths
  }
}

const WORKSPACE_STORAGE_KEY = 'editor_workspaces'

const createDefaultWorkspace = (fsMap?: FSMap): WorkspaceData => {
  const map = fsMap || ensureFsMapDefaults(createDefaultWorkspaceFsMap('My Project'))
  return normalizeWorkspaceData({
    id: 'project-current',
    name: 'My Project',
    fsMap: map,
    openFilePaths: [SCHEMATIC_MAIN_PATH],
    activeFilePath: SCHEMATIC_MAIN_PATH
  })
}

const saveWorkspacesToStorage = (workspaces: Record<string, WorkspaceData>, activeWorkspaceId: string) => {
  if (typeof localStorage === 'undefined') return
  try {
    const stored: StoredWorkspaceState = { workspaces, activeWorkspaceId }
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(stored))
  } catch (e) {
    console.warn('Failed to save workspaces to localStorage:', e)
  }
}

// Keep the old key name for backwards compat in regenerateTSX callers that still call this
const saveFSMapToStorage = (fsMap: FSMap) => {
  // no-op: actual persistence goes through saveWorkspacesToStorage
  // kept to avoid breaking internal callers before they are migrated
}

const loadWorkspacesFromStorage = (): StoredWorkspaceState => {
  if (typeof localStorage === 'undefined') {
    const ws = createDefaultWorkspace()
    return { workspaces: { [ws.id]: ws }, activeWorkspaceId: ws.id }
  }

  try {
    const newStored = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (newStored) {
      const parsed: StoredWorkspaceState = JSON.parse(newStored)
      // Ensure each workspace has required defaults and valid file selections.
      for (const id of Object.keys(parsed.workspaces)) {
        parsed.workspaces[id] = normalizeWorkspaceData(parsed.workspaces[id])
      }
      return parsed
    }
  } catch (e) {
    console.warn('Failed to load workspaces from localStorage:', e)
  }

  // Try migrating from legacy 'editor_fsMap' key
  try {
    const legacyStored = localStorage.getItem('editor_fsMap')
    if (legacyStored) {
      const legacyFsMap = ensureFsMapDefaults(JSON.parse(legacyStored))
      const ws = createDefaultWorkspace(legacyFsMap)
      return { workspaces: { [ws.id]: ws }, activeWorkspaceId: ws.id }
    }
  } catch (e) {
    console.warn('Failed to migrate legacy fsMap:', e)
  }

  const ws = createDefaultWorkspace()
  return { workspaces: { [ws.id]: ws }, activeWorkspaceId: ws.id }
}

const loadFSMapFromStorage = (): FSMap => {
  const { workspaces, activeWorkspaceId } = loadWorkspacesFromStorage()
  return workspaces[activeWorkspaceId]?.fsMap || ensureFsMapDefaults(createDefaultWorkspaceFsMap('My Project'))
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
  const registry = buildSubcircuitRegistry(fsMap)
  const filePath = registry[name]?.filePath || `subcircuits/${name}.tsx`
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
  const registry = buildSubcircuitRegistry(fsMap)
  const indexContent = Object.entries(registry)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, info]) => {
      const stem = info.filePath.replace(/^subcircuits\//, '').replace(/\.tsx$/, '')
      return `export { ${name} } from "./${stem}"`
    })
    .join('\n')

  return {
    ...fsMap,
    'subcircuits/index.ts': indexContent ? `${indexContent}\n` : ''
  }
}

const getWorkspaceSymbolNames = (fsMap: FSMap): Set<string> => {
  return new Set(
    Object.keys(fsMap)
      .filter(path => path.startsWith('symbols/') && path.endsWith('.tsx'))
      .map(path => path.replace('symbols/', '').replace('.tsx', ''))
  )
}

const getRelativeImportPath = (fromFilePath: string, toFilePath: string): string => {
  const fromParts = fromFilePath.split('/').slice(0, -1)
  const toParts = toFilePath.replace(/\.(tsx|ts)$/, '').split('/')

  while (fromParts.length > 0 && toParts.length > 0 && fromParts[0] === toParts[0]) {
    fromParts.shift()
    toParts.shift()
  }

  const up = fromParts.map(() => '..')
  const relative = [...up, ...toParts].join('/')
  return relative.startsWith('.') ? relative : `./${relative}`
}

const parseComponentRef = (ref: string): { componentName: string; pinName: string } | null => {
  const m = ref.match(/^\.([A-Za-z_][A-Za-z0-9_]*)\s*>\s*\.([A-Za-z_][A-Za-z0-9_]*)$/)
  if (!m) return null
  return { componentName: m[1], pinName: m[2] }
}

const normalizePatchComponentSpec = (
  component: PatchDefinition['components'][number],
  index: number
): { subcircuit: string; instanceName?: string; props?: Record<string, any>; schX?: number; schY?: number } => {
  if (typeof component === 'string') {
    return {
      subcircuit: component,
      instanceName: `${component}${index + 1}`
    }
  }

  return {
    subcircuit: component.type || component.subcircuit || '',
    instanceName: component.instanceName,
    props: component.props,
    schX: component.schX,
    schY: component.schY
  }
}

const parsePatchWireSpec = (
  spec: PatchDefinition['wiring'][number]
): { from: string; to: string } | null => {
  if (typeof spec !== 'string') {
    return spec
  }

  const fromMatch = spec.match(/from="([^"]+)"/)
  const toMatch = spec.match(/to="([^"]+)"/)
  if (fromMatch && toMatch) {
    return { from: fromMatch[1], to: toMatch[1] }
  }

  const arrowMatch = spec.split(/\s*->\s*/)
  if (arrowMatch.length === 2) {
    const normalizeEndpoint = (value: string) => {
      const trimmed = value.trim()
      const dotForm = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/)
      return dotForm ? `.${dotForm[1]} > .${dotForm[2]}` : trimmed
    }

    return {
      from: normalizeEndpoint(arrowMatch[0]),
      to: normalizeEndpoint(arrowMatch[1])
    }
  }

  return null
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
  const isSchematicFile = isSchematicFilePath(filePath)
  const isSubcircuitFile = filePath.startsWith('subcircuits/')
  const symbolNames = getWorkspaceSymbolNames(fsMap)
  const subcircuitRegistry = buildSubcircuitRegistry(fsMap)
  const bodyMatch = isSchematicFile
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

    const isSymbolReference = symbolNames.has(tagName)
    const subcircuitDefinition = subcircuitRegistry[tagName]

    if (!isKnownPart && !isSymbolReference) {
      const ports = subcircuitDefinition?.ports || getSubcircuitPorts(fsMap, tagName)
      props.subcircuitName = tagName
      props.subcircuitPath = subcircuitDefinition?.filePath || `subcircuits/${tagName}.tsx`
      props.ports = ports
    }

    const component: PlacedComponent = {
      id,
      catalogId: isKnownPart
        ? effectiveCatalogId
        : isSymbolReference
        ? 'symbol-instance'
        : 'subcircuit-instance',
      name,
      props: {
        ...props,
        ...(isSymbolReference ? { symbolName: tagName } : {}),
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

const getCanvasStateForFile = (filePath: string, fsMap: FSMap): { components: PlacedComponent[]; wires: WireConnection[] } => {
  if (!isCanvasEditableFilePath(filePath)) {
    return { components: [], wires: [] }
  }

  return parseFileToCanvas(filePath, fsMap)
}

const syncActiveCanvasFile = (state: Pick<EditorState, 'activeFilePath' | 'fsMap' | 'placedComponents' | 'wires'>): FSMap => {
  if (!isCanvasEditableFilePath(state.activeFilePath)) {
    return regenerateSubcircuitIndex({ ...state.fsMap })
  }

  const currentContent = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)
  return regenerateSubcircuitIndex({
    ...state.fsMap,
    [state.activeFilePath]: currentContent
  })
}

const buildPersistedCanvasState = (
  state: Pick<EditorState, 'activeFilePath' | 'fsMap' | 'placedComponents' | 'wires' | 'workspaces' | 'activeWorkspaceId' | 'openFilePaths'>,
  overrides: Partial<Pick<EditorState, 'activeFilePath' | 'fsMap' | 'placedComponents' | 'wires' | 'openFilePaths'>>
) => {
  const activeFilePath = overrides.activeFilePath ?? state.activeFilePath
  const placedComponents = overrides.placedComponents ?? state.placedComponents
  const wires = overrides.wires ?? state.wires
  const openFilePaths = overrides.openFilePaths ?? state.openFilePaths
  const fsMapBase = overrides.fsMap ?? state.fsMap

  const fsMap = isCanvasEditableFilePath(activeFilePath)
    ? syncActiveCanvasFile({ activeFilePath, fsMap: fsMapBase, placedComponents, wires })
    : regenerateSubcircuitIndex({ ...fsMapBase })

  const workspaces = {
    ...state.workspaces,
    [state.activeWorkspaceId]: {
      ...state.workspaces[state.activeWorkspaceId],
      fsMap,
      activeFilePath,
      openFilePaths
    }
  }

  return {
    activeFilePath,
    placedComponents,
    wires,
    openFilePaths,
    fsMap,
    workspaces
  }
}

const getComponentTagName = (component: PlacedComponent): string => {
  if (component.catalogId === 'subcircuit-instance') {
    return component.props.subcircuitName || component.name
  }
  if (component.catalogId === 'symbol-instance') {
    return component.props.symbolName || component.name
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
      'subcircuitPath',
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
  const isSchematicFile = isSchematicFilePath(filePath)
  const inSubcircuit = !isSchematicFile
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

  if (isSchematicFile) {
    const subImportMap = new Map<string, string>()
    components
      .filter(c => c.catalogId === 'subcircuit-instance')
      .forEach((component) => {
        const name = String(component.props.subcircuitName || '').trim()
        const importPath = String(component.props.subcircuitPath || `subcircuits/${name}.tsx`).trim()
        if (name && importPath) {
          subImportMap.set(name, importPath)
        }
      })

    const symbolImportSet = new Set(
      components
        .filter(c => c.catalogId === 'symbol-instance')
        .map(c => c.props.symbolName as string)
        .filter(Boolean)
    )

    const subImports = [...subImportMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, importFilePath]) => `import { ${name} } from "${getRelativeImportPath(filePath, importFilePath)}"`)
    const symbolImports = [...symbolImportSet]
      .sort()
      .map(name => {
        const importPrefix = filePath.startsWith('schematics/') ? '../symbols' : './'
        return importPrefix === './'
          ? `import { ${name} } from "./${name}"`
          : `import { ${name} } from "${importPrefix}/${name}"`
      })

    const imports = [...subImports, ...symbolImports].join('\n')

    return `${imports ? `${imports}\n\n` : ''}export default () => (\n  <board width="50mm" height="50mm">\n${body}\n  </board>\n)\n`
  }

  const subcircuitName = filePath.replace('subcircuits/', '').replace('.tsx', '')
  return `export function ${subcircuitName}(props: { name: string; schX?: number; schY?: number }) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n${body}\n    </subcircuit>\n  )\n}\n`
}

const generateFlatMainTSX = (fsMap: FSMap, rootPath = SCHEMATIC_MAIN_PATH): string => {
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

  const fallbackRootPath = Object.keys(fsMap).sort().find(path => isSchematicFilePath(path)) || SCHEMATIC_MAIN_PATH
  const effectiveRootPath = fsMap[rootPath] ? rootPath : fallbackRootPath

  expandFile(effectiveRootPath, 0, 0, '')

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

const initialWorkspaceState = loadWorkspacesFromStorage()
const initialActiveWsId = initialWorkspaceState.activeWorkspaceId
const initialWorkspace = initialWorkspaceState.workspaces[initialActiveWsId] || createDefaultWorkspace()
const initialFsMap = initialWorkspace.fsMap
const initialCanvas = getCanvasStateForFile(initialWorkspace.activeFilePath || SCHEMATIC_MAIN_PATH, initialFsMap)

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state - load from localStorage
  fsMap: initialFsMap,
  activeFilePath: initialWorkspace.activeFilePath || SCHEMATIC_MAIN_PATH,
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
  // Workspace model
  workspaces: initialWorkspaceState.workspaces,
  activeWorkspaceId: initialActiveWsId,
  openFilePaths: initialWorkspace.openFilePaths || [SCHEMATIC_MAIN_PATH],
  // Undo/redo stacks
  undoStack: [],
  redoStack: [],

  // Actions
  setFSMap: (fsMap) => {
    const next = regenerateSubcircuitIndex(ensureFsMapDefaults(fsMap))
    const state = get()
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: { ...state.workspaces[state.activeWorkspaceId], fsMap: next }
    }
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({ fsMap: next, workspaces: nextWorkspaces })
  },

  setActiveFilePath: (filePath) => {
    const state = get()
    if (filePath === state.activeFilePath) return

    get().regenerateTSX()

    let fsMap = { ...state.fsMap }
    if (!fsMap[filePath]) {
      if (filePath.startsWith('subcircuits/')) {
        const name = filePath.replace('subcircuits/', '').replace('.tsx', '')
        fsMap[filePath] = buildSubcircuitModule(name, '')
      } else if (filePath.startsWith('symbols/')) {
        const name = filePath.replace('symbols/', '').replace('.tsx', '')
        fsMap[filePath] = buildSymbolModule(name, '')
      } else if (isSchematicFilePath(filePath)) {
        fsMap[filePath] = buildBoardModule('')
      }

      fsMap = regenerateSubcircuitIndex(fsMap)
      saveFSMapToStorage(fsMap)
    }

    if (!fsMap[filePath]) {
      return
    }

    const nextOpenFilePaths = state.openFilePaths.includes(filePath)
      ? state.openFilePaths
      : [...state.openFilePaths, filePath]
    const normalizedFiles = normalizeWorkspaceFileSelection(fsMap, filePath, nextOpenFilePaths)
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }

    const parsed = getCanvasStateForFile(normalizedFiles.activeFilePath, fsMap)
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({
      fsMap,
      activeFilePath: normalizedFiles.activeFilePath,
      openFilePaths: normalizedFiles.openFilePaths,
      workspaces: nextWorkspaces,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      wiringStart: null,
      cursorNearPin: null
    })
  },

  openSubcircuitEditor: (name) => {
    const state = get()
    const safe = toSafeIdentifier(name)
    const registry = buildSubcircuitRegistry(state.fsMap)
    const filePath = registry[name]?.filePath || `subcircuits/${safe}.tsx`

    if (state.activeFilePath === filePath) return

    get().regenerateTSX()

    let fsMap = { ...state.fsMap }
    if (!fsMap[filePath]) {
      fsMap[filePath] = buildSubcircuitModule(safe, '', 'export const ports = [] as const')
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

  insertSubcircuitInstance: (name, options) => {
    const state = get()
    const registry = buildSubcircuitRegistry(state.fsMap)
    const subcircuit = registry[name]

    if (!subcircuit) {
      const message = `Subcircuit "${name}" is not a valid reusable block yet.`
      if (typeof window !== 'undefined') {
        window.alert(message)
      } else {
        console.warn(message)
      }
      return
    }

    if (!isSchematicFilePath(state.activeFilePath)) {
      get().setActiveFilePath(subcircuit.filePath)
      return
    }

    const existingNames = new Set(state.placedComponents.map(component => component.name))
    let suffix = 1
    let uniqueName = `${name}${suffix}`
    while (existingNames.has(uniqueName)) {
      suffix += 1
      uniqueName = `${name}${suffix}`
    }

    const fallbackPosition = getDefaultImportPosition(state.placedComponents.length)
    const schX = options?.schX ?? fallbackPosition.schX
    const schY = options?.schY ?? fallbackPosition.schY

    get().addPlacedComponent({
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      catalogId: 'subcircuit-instance',
      name: uniqueName,
      props: {
        subcircuitName: name,
        subcircuitPath: options?.filePath || subcircuit.filePath,
        ports: subcircuit.ports,
        schX,
        schY
      },
      tsxSnippet: `<${name} name="${uniqueName}" schX={${schX}} schY={${schY}} />`
    })

    set({ selectedComponentIds: [] })
  },

  applyPatch: (patch) => {
    const state = get()
    if (!isSchematicFilePath(state.activeFilePath)) {
      throw new Error('Patches can only be applied to a schematic board file.')
    }

    const registry = buildSubcircuitRegistry(state.fsMap)
    const existingNames = new Set(state.placedComponents.map(component => component.name))
    const aliasToInstance = new Map<string, string>()
    const addedComponents: PlacedComponent[] = []
    const offsetX = Number(patch.layout?.offsetX || 0)
    const offsetY = Number(patch.layout?.offsetY || 0)

    patch.components.forEach((component, index) => {
      const spec = normalizePatchComponentSpec(component, index)
      if (!spec.subcircuit) {
        throw new Error(`Invalid patch component at index ${index}`)
      }

      const subcircuit = registry[spec.subcircuit]
      if (!subcircuit) {
        throw new Error(`Missing subcircuit: ${spec.subcircuit}`)
      }

      let instanceName = spec.instanceName?.trim() || `${spec.subcircuit}${index + 1}`
      while (existingNames.has(instanceName)) {
        instanceName = `${instanceName}_${existingNames.size}`
      }
      existingNames.add(instanceName)
      aliasToInstance.set(spec.subcircuit, instanceName)
      aliasToInstance.set(instanceName, instanceName)

      const fallbackPosition = getDefaultImportPosition(state.placedComponents.length + index)
      const schX = (spec.schX ?? fallbackPosition.schX) + offsetX
      const schY = (spec.schY ?? fallbackPosition.schY) + offsetY

      addedComponents.push({
        id: `patch-${patch.id}-${Date.now()}-${index}`,
        catalogId: 'subcircuit-instance',
        name: instanceName,
        props: {
          ...(spec.props || {}),
          name: instanceName,
          subcircuitName: spec.subcircuit,
          subcircuitPath: subcircuit.filePath,
          ports: subcircuit.ports,
          schX,
          schY
        },
        tsxSnippet: `<${spec.subcircuit} name="${instanceName}" schX={${schX}} schY={${schY}} />`
      })
    })

    const allComponents = [...state.placedComponents, ...addedComponents]
    const nameToId = new Map(allComponents.map(component => [component.name, component.id]))
    const componentPorts = new Map(allComponents.map(component => [component.name, new Set(((component.props.ports as string[] | undefined) || []).map(String))]))

    const addedWires: WireConnection[] = patch.wiring.flatMap((wireSpec, index) => {
      const parsedSpec = parsePatchWireSpec(wireSpec)
      if (!parsedSpec) {
        throw new Error(`Invalid patch wire at index ${index}`)
      }

      const fromRef = parseComponentRef(parsedSpec.from)
      const toRef = parseComponentRef(parsedSpec.to)
      if (!fromRef || !toRef) {
        throw new Error(`Patch wire endpoints must use component.pin format: ${parsedSpec.from} -> ${parsedSpec.to}`)
      }

      const fromComponentName = aliasToInstance.get(fromRef.componentName) || fromRef.componentName
      const toComponentName = aliasToInstance.get(toRef.componentName) || toRef.componentName
      const fromId = nameToId.get(fromComponentName)
      const toId = nameToId.get(toComponentName)
      if (!fromId || !toId) {
        throw new Error(`Patch wiring references missing instance: ${parsedSpec.from} -> ${parsedSpec.to}`)
      }

      const fromPorts = componentPorts.get(fromComponentName)
      const toPorts = componentPorts.get(toComponentName)
      if (fromPorts && fromPorts.size > 0 && !fromPorts.has(fromRef.pinName)) {
        throw new Error(`Invalid patch wiring pin: ${fromComponentName}.${fromRef.pinName}`)
      }
      if (toPorts && toPorts.size > 0 && !toPorts.has(toRef.pinName)) {
        throw new Error(`Invalid patch wiring pin: ${toComponentName}.${toRef.pinName}`)
      }

      return [{
        id: `patch-wire-${patch.id}-${Date.now()}-${index}`,
        from: { componentId: fromId, pinName: fromRef.pinName },
        to: { componentId: toId, pinName: toRef.pinName },
        tsxSnippet: ''
      }]
    })

    const wires = [...state.wires, ...addedWires]
    const persisted = buildPersistedCanvasState(state, {
      placedComponents: allComponents,
      wires
    })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)

    set({
      placedComponents: allComponents,
      wires,
      selectedComponentIds: addedComponents.map(component => component.id),
      wiringStart: null,
      cursorNearPin: null,
      exportPreview: null,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    })
  },

  goBackFile: () => {
    const state = get()
    if (state.breadcrumbStack.length === 0) return

    get().regenerateTSX()

    const previous = state.breadcrumbStack[state.breadcrumbStack.length - 1]
    const nextStack = state.breadcrumbStack.slice(0, -1)
    const parsed = getCanvasStateForFile(previous, state.fsMap)

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
    const nextFsMapBase = { ...state.fsMap }
    const targetFilePath = getCanonicalFilePathForContent(filePath, content, nextFsMapBase, {
      preserveRequestedPath: true
    })

    delete nextFsMapBase[filePath]
    nextFsMapBase[targetFilePath] = content

    const newFsMap = regenerateSubcircuitIndex(ensureFsMapDefaults(nextFsMapBase))
    const normalizedFiles = normalizeWorkspaceFileSelection(
      newFsMap,
      state.activeFilePath === filePath ? targetFilePath : state.activeFilePath,
      state.openFilePaths.map(path => path === filePath ? targetFilePath : path)
    )
    const parsed = getCanvasStateForFile(normalizedFiles.activeFilePath, newFsMap)

    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: newFsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }

    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    return {
      fsMap: newFsMap,
      workspaces: nextWorkspaces,
      activeFilePath: normalizedFiles.activeFilePath,
      openFilePaths: normalizedFiles.openFilePaths,
      placedComponents: parsed.components,
      wires: parsed.wires
    }
  }),

  addPlacedComponent: (component) => set((state) => {
    const placedComponents = [...state.placedComponents, component]
    const persisted = buildPersistedCanvasState(state, { placedComponents })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
    return {
      placedComponents,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    }
  }),

  updatePlacedComponent: (id, updates) => set((state) => {
    const placedComponents = state.placedComponents.map((component) => {
      if (component.id !== id) return component

      const mergedProps = updates.props
        ? { ...component.props, ...updates.props }
        : component.props

      return {
        ...component,
        ...updates,
        props: mergedProps
      }
    })

    const updatedComp = placedComponents.find(c => c.id === id)
    let fsMap = state.fsMap
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
        fsMap = saveEditorMeta(state.fsMap, nextMeta)
      }
    }

    const persisted = buildPersistedCanvasState(state, { placedComponents, fsMap })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
    return {
      placedComponents,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    }
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

    const persisted = buildPersistedCanvasState(state, { placedComponents: nextComponents })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
    set({
      placedComponents: nextComponents,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    })
  },

  removePlacedComponent: (id) => set((state) => {
    const placedComponents = state.placedComponents.filter((comp) => comp.id !== id)
    const wires = state.wires.filter((wire) => wire.from.componentId !== id && wire.to.componentId !== id)
    const selectedComponentIds = state.selectedComponentIds.filter(selectedId => selectedId !== id)
    const persisted = buildPersistedCanvasState(state, { placedComponents, wires })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
    return {
      placedComponents,
      wires,
      selectedComponentIds,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
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

    const persisted = buildPersistedCanvasState(state, {
      placedComponents: newComponents,
      wires: newWires
    })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)

    set({ 
      placedComponents: newComponents,
      wires: newWires,
      selectedComponentIds: [],
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    })
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

    const placedComponents = [...state.placedComponents, ...pastedComponents]
    const wires = [...state.wires, ...pastedWires]
    const persisted = buildPersistedCanvasState(state, { placedComponents, wires })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)

    set({
      placedComponents,
      wires,
      selectedComponentIds: pastedComponents.map(component => component.id),
      pasteCount: nextPasteCount,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    })
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

    set((state) => {
      const wires = [...state.wires, newWire]
      const persisted = buildPersistedCanvasState(state, { wires })
      saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
      return {
        wires,
        wiringStart: null,
        fsMap: persisted.fsMap,
        workspaces: persisted.workspaces
      }
    })
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

    const wires = state.wires.filter(w => w.id !== wireId)
    const persisted = buildPersistedCanvasState(state, { wires })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
    return {
      wires,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    }
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

    const wires = state.wires.filter(w => !removedWireIds.has(w.id))
    const persisted = buildPersistedCanvasState(state, { wires })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)
    return {
      wires,
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    }
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

    const persisted = buildPersistedCanvasState(state, {
      placedComponents: nextComponents,
      wires: nextWires
    })
    saveWorkspacesToStorage(persisted.workspaces, state.activeWorkspaceId)

    set({
      placedComponents: nextComponents,
      wires: nextWires,
      selectedComponentIds: [componentId],
      fsMap: persisted.fsMap,
      workspaces: persisted.workspaces
    })
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

    const normalizedFiles = normalizeWorkspaceFileSelection(
      nextFsMap,
      state.activeFilePath,
      state.openFilePaths.includes(subPath)
        ? state.openFilePaths
        : [...state.openFilePaths, subPath]
    )
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: nextFsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)

    set({
      fsMap: nextFsMap,
      workspaces: nextWorkspaces,
      openFilePaths: normalizedFiles.openFilePaths,
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
    const rootPath = isSchematicFilePath(state.activeFilePath) ? state.activeFilePath : SCHEMATIC_MAIN_PATH

    if (isCanvasEditableFilePath(state.activeFilePath)) {
      syncedFiles[state.activeFilePath] = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)
    }

    Object.keys(syncedFiles)
      .filter(path => isSchematicFilePath(path) || (path.startsWith('subcircuits/') && path.endsWith('.tsx')))
      .forEach((path) => {
        const parsed = parseFileToCanvas(path, syncedFiles)
        syncedFiles[path] = generateFileTSX(path, parsed.components, parsed.wires)
      })

    const files = regenerateSubcircuitIndex(syncedFiles)
    return generateFlatMainTSX(files, rootPath)
  },

  generateProjectStructure: () => {
    const state = get()
    const syncedFiles: FSMap = { ...state.fsMap }

    if (isCanvasEditableFilePath(state.activeFilePath)) {
      syncedFiles[state.activeFilePath] = generateFileTSX(state.activeFilePath, state.placedComponents, state.wires)
    }

    Object.keys(syncedFiles)
      .filter(path => isSchematicFilePath(path) || (path.startsWith('subcircuits/') && path.endsWith('.tsx')))
      .forEach((path) => {
        const parsed = parseFileToCanvas(path, syncedFiles)
        syncedFiles[path] = generateFileTSX(path, parsed.components, parsed.wires)
      })

    const files = regenerateSubcircuitIndex(syncedFiles)
    const parentPath = (isSchematicFilePath(state.activeFilePath) && files[state.activeFilePath])
      ? state.activeFilePath
      : (files[SCHEMATIC_MAIN_PATH] ? SCHEMATIC_MAIN_PATH : LEGACY_MAIN_PATH)

    const parent = files[parentPath] || ''
    const children = Object.fromEntries(
      Object.entries(files).filter(([path]) => path !== parentPath)
    )

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
    const standaloneImport = detectStandaloneImport(content)

    const preserveRequestedPath =
      !standaloneImport ||
      (standaloneImport.kind === 'schematic' && isSchematicFilePath(state.activeFilePath)) ||
      (standaloneImport.kind === 'subcircuit' && state.activeFilePath.startsWith('subcircuits/')) ||
      (standaloneImport.kind === 'symbol' && state.activeFilePath.startsWith('symbols/'))

    const targetFilePath = getCanonicalFilePathForContent(
      state.activeFilePath,
      content,
      state.fsMap,
      { preserveRequestedPath }
    )

    const normalized = isCanvasEditableFilePath(targetFilePath)
      ? normalizeImportedTSXContent(content, targetFilePath)
      : content

    const nextFsMapSeed = { ...state.fsMap }
    const isSameNamedRelocation =
      targetFilePath !== state.activeFilePath &&
      getFileBaseName(targetFilePath) === getFileBaseName(state.activeFilePath)

    if (isSameNamedRelocation && nextFsMapSeed[state.activeFilePath]) {
      delete nextFsMapSeed[state.activeFilePath]
    }

    const nextFsMap = regenerateSubcircuitIndex({
      ...nextFsMapSeed,
      [targetFilePath]: normalized
    })

    const nextOpenFilePaths = state.openFilePaths.includes(targetFilePath)
      ? state.openFilePaths.map(path => (isSameNamedRelocation && path === state.activeFilePath ? targetFilePath : path))
      : [
          ...state.openFilePaths.filter(path => !(isSameNamedRelocation && path === state.activeFilePath)),
          targetFilePath
        ]

    const normalizedFiles = normalizeWorkspaceFileSelection(nextFsMap, targetFilePath, nextOpenFilePaths)
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: nextFsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }

    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)

    const parsed = getCanvasStateForFile(normalizedFiles.activeFilePath, nextFsMap)
    set({
      fsMap: nextFsMap,
      activeFilePath: normalizedFiles.activeFilePath,
      openFilePaths: normalizedFiles.openFilePaths,
      workspaces: nextWorkspaces,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      wiringStart: null,
      cursorNearPin: null,
      exportPreview: null,
      codeViewTab: 'source'
    })
  },

  importFilesBatch: (files) => {
    const state = get()
    if (!Array.isArray(files) || files.length === 0) return

    let nextFsMapSeed = { ...state.fsMap }
    const nextOpenFilePaths = [...state.openFilePaths]
    const importedSchematicPaths: string[] = []

    files.forEach(({ fileName, content }) => {
      const requestedPath = fileName.includes('/') ? fileName : fileName.replace(/^\.\/+/, '')
      const targetFilePath = getCanonicalFilePathForContent(requestedPath, content, nextFsMapSeed)
      const normalized = isCanvasEditableFilePath(targetFilePath)
        ? normalizeImportedTSXContent(content, targetFilePath)
        : content

      nextFsMapSeed[targetFilePath] = normalized
      if (!nextOpenFilePaths.includes(targetFilePath)) {
        nextOpenFilePaths.push(targetFilePath)
      }
      if (detectFileKind(normalized) === 'schematic') {
        importedSchematicPaths.push(targetFilePath)
      }
    })

    const nextFsMap = regenerateSubcircuitIndex(ensureFsMapDefaults(nextFsMapSeed))
    const importedProject = buildImportedProjectState(nextFsMap)
    const preferredActivePath =
      [...importedSchematicPaths].reverse().find(path => importedProject.entryFiles.includes(path))
      || importedProject.entryFiles.find(path => path !== SCHEMATIC_MAIN_PATH)
      || importedProject.entryFiles[0]
      || state.activeFilePath
    const normalizedFiles = normalizeWorkspaceFileSelection(nextFsMap, preferredActivePath, nextOpenFilePaths)
    const parsed = getCanvasStateForFile(normalizedFiles.activeFilePath, nextFsMap)
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: nextFsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }

    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({
      fsMap: nextFsMap,
      workspaces: nextWorkspaces,
      activeFilePath: normalizedFiles.activeFilePath,
      openFilePaths: normalizedFiles.openFilePaths,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
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
    const nextFsMap = syncActiveCanvasFile(state)

    // Sync to active workspace and persist
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: nextFsMap,
        activeFilePath: state.activeFilePath,
        openFilePaths: state.openFilePaths
      }
    }
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({ fsMap: nextFsMap, workspaces: nextWorkspaces })
  },

  setCodeViewTab: (tab) => set({ codeViewTab: tab }),

  setExportPreview: (preview) => set({ exportPreview: preview }),
  
  // ── Undo / Redo ──────────────────────────────────────────────────────────
  pushUndoSnapshot: () => {
    const state = get()
    const snapshot = {
      components: state.placedComponents.map(c => ({ ...c, props: { ...c.props } })),
      wires: state.wires.map(w => ({ ...w, from: { ...w.from }, to: { ...w.to } }))
    }
    const undoStack = [...state.undoStack, snapshot].slice(-50)
    set({ undoStack, redoStack: [] })
  },
  
  undo: () => {
    const state = get()
    if (state.undoStack.length === 0) return
    const snapshot = state.undoStack[state.undoStack.length - 1]
    const redoSnapshot = {
      components: state.placedComponents.map(c => ({ ...c, props: { ...c.props } })),
      wires: state.wires.map(w => ({ ...w, from: { ...w.from }, to: { ...w.to } }))
    }
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, redoSnapshot],
      placedComponents: snapshot.components,
      wires: snapshot.wires,
      selectedComponentIds: []
    })
    setTimeout(() => get().regenerateTSX(), 0)
  },
  
  redo: () => {
    const state = get()
    if (state.redoStack.length === 0) return
    const snapshot = state.redoStack[state.redoStack.length - 1]
    const undoSnapshot = {
      components: state.placedComponents.map(c => ({ ...c, props: { ...c.props } })),
      wires: state.wires.map(w => ({ ...w, from: { ...w.from }, to: { ...w.to } }))
    }
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, undoSnapshot],
      placedComponents: snapshot.components,
      wires: snapshot.wires,
      selectedComponentIds: []
    })
    setTimeout(() => get().regenerateTSX(), 0)
  },
  
  // ── File Tabs ─────────────────────────────────────────────────────────────
  openFileTab: (filePath) => {
    const state = get()
    if (state.openFilePaths.includes(filePath)) return
    const openFilePaths = [...state.openFilePaths, filePath]
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        openFilePaths
      }
    }
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({ openFilePaths, workspaces: nextWorkspaces })
  },
  
  closeFileTab: (filePath) => {
    const state = get()
    const next = state.openFilePaths.filter(p => p !== filePath)
    if (next.length === 0) return // keep at least one tab
    const newActive = state.activeFilePath === filePath
      ? next[Math.max(0, state.openFilePaths.indexOf(filePath) - 1)]
      : state.activeFilePath
    if (newActive !== state.activeFilePath) {
      get().setActiveFilePath(newActive)
    }
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        activeFilePath: newActive,
        openFilePaths: next
      }
    }
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({ openFilePaths: next, workspaces: nextWorkspaces })
  },

  deleteFile: (filePath) => {
    const state = get()
    if (!state.fsMap[filePath]) return

    const dependencyGraph = buildDependencyGraph(state.fsMap)
    const usedBy = dependencyGraph[filePath]?.usedBy || []
    if (usedBy.length > 0) {
      const message = `Cannot delete ${filePath} because it is still used by: ${usedBy.join(', ')}`
      if (typeof window !== 'undefined') {
        window.alert(message)
      } else {
        console.warn(message)
      }
      return
    }

    const nextFsMap = { ...state.fsMap }
    delete nextFsMap[filePath]

    const ensuredFsMap = regenerateSubcircuitIndex(ensureFsMapDefaults(nextFsMap))
    const normalizedFiles = normalizeWorkspaceFileSelection(
      ensuredFsMap,
      state.activeFilePath === filePath ? undefined : state.activeFilePath,
      state.openFilePaths.filter(path => path !== filePath)
    )

    const parsed = getCanvasStateForFile(normalizedFiles.activeFilePath, ensuredFsMap)
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: ensuredFsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }

    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({
      fsMap: ensuredFsMap,
      workspaces: nextWorkspaces,
      activeFilePath: normalizedFiles.activeFilePath,
      openFilePaths: normalizedFiles.openFilePaths,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      exportPreview: null
    })
  },

  moveFile: (oldPath, newPath) => {
    const state = get()
    const content = state.fsMap[oldPath]
    if (!content || oldPath === newPath) return

    try {
      const dependencyGraph = buildDependencyGraph(state.fsMap)
      const usedBy = dependencyGraph[oldPath]?.usedBy || []
      if (usedBy.length > 0) {
        throw new Error(`Cannot move ${oldPath} because it is still imported by: ${usedBy.join(', ')}`)
      }
      const targetPath = getCanonicalFilePathForContent(newPath, content, state.fsMap, {
        preserveRequestedPath: true
      })
      validateFilePlacement(targetPath, content)

      const nextFsMapBase = { ...state.fsMap }
      delete nextFsMapBase[oldPath]
      nextFsMapBase[targetPath] = content

      const nextFsMap = regenerateSubcircuitIndex(ensureFsMapDefaults(nextFsMapBase))
      const normalizedFiles = normalizeWorkspaceFileSelection(
        nextFsMap,
        state.activeFilePath === oldPath ? targetPath : state.activeFilePath,
        state.openFilePaths.map(path => path === oldPath ? targetPath : path)
      )

      const parsed = getCanvasStateForFile(normalizedFiles.activeFilePath, nextFsMap)
      const nextWorkspaces = {
        ...state.workspaces,
        [state.activeWorkspaceId]: {
          ...state.workspaces[state.activeWorkspaceId],
          fsMap: nextFsMap,
          activeFilePath: normalizedFiles.activeFilePath,
          openFilePaths: normalizedFiles.openFilePaths
        }
      }

      saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
      set({
        fsMap: nextFsMap,
        workspaces: nextWorkspaces,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths,
        placedComponents: parsed.components,
        wires: parsed.wires,
        selectedComponentIds: []
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move file.'
      window.alert(message)
    }
  },
  
  // ── Workspaces ────────────────────────────────────────────────────────────
  createWorkspace: (name = 'New Workspace') => {
    const state = get()
    // Save current workspace state first
    get().regenerateTSX()
    const id = makeWorkspaceId(name)
    const newWs: WorkspaceData = {
      id,
      name,
      fsMap: ensureFsMapDefaults(createDefaultWorkspaceFsMap(name)),
      openFilePaths: [SCHEMATIC_MAIN_PATH],
      activeFilePath: SCHEMATIC_MAIN_PATH
    }
    const nextWorkspaces = { ...state.workspaces, [id]: newWs }
    // Switch to the new workspace
    const parsed = getCanvasStateForFile(SCHEMATIC_MAIN_PATH, newWs.fsMap)
    saveWorkspacesToStorage(nextWorkspaces, id)
    set({
      workspaces: nextWorkspaces,
      activeWorkspaceId: id,
      fsMap: newWs.fsMap,
      activeFilePath: SCHEMATIC_MAIN_PATH,
      openFilePaths: [SCHEMATIC_MAIN_PATH],
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      breadcrumbStack: [],
      undoStack: [],
      redoStack: []
    })
  },
  
  switchWorkspace: (id) => {
    const state = get()
    if (id === state.activeWorkspaceId) return
    const target = state.workspaces[id]
    if (!target) return
  
    // Persist current workspace state before switching
    const currentFsMap = syncActiveCanvasFile(state)
    const updatedWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: currentFsMap,
        activeFilePath: state.activeFilePath,
        openFilePaths: state.openFilePaths
      },
    }
  
    const normalizedCurrent = normalizeWorkspaceData({
      ...updatedWorkspaces[state.activeWorkspaceId],
      fsMap: currentFsMap,
      activeFilePath: state.activeFilePath,
      openFilePaths: state.openFilePaths
    })
    const normalizedTarget = normalizeWorkspaceData(target)

    const parsed = getCanvasStateForFile(normalizedTarget.activeFilePath, normalizedTarget.fsMap)
    const nextWorkspaces = {
      ...updatedWorkspaces,
      [state.activeWorkspaceId]: normalizedCurrent,
      [id]: normalizedTarget
    }
    saveWorkspacesToStorage(nextWorkspaces, id)
    set({
      workspaces: nextWorkspaces,
      activeWorkspaceId: id,
      fsMap: normalizedTarget.fsMap,
      activeFilePath: normalizedTarget.activeFilePath,
      openFilePaths: normalizedTarget.openFilePaths,
      placedComponents: parsed.components,
      wires: parsed.wires,
      selectedComponentIds: [],
      breadcrumbStack: [],
      undoStack: [],
      redoStack: []
    })
  },
  
  deleteWorkspace: (id) => {
    const state = get()
    if (Object.keys(state.workspaces).length <= 1) return // keep at least one
    const next = { ...state.workspaces }
    delete next[id]
    const newActiveId = id === state.activeWorkspaceId
      ? Object.keys(next)[0]
      : state.activeWorkspaceId
  
    if (id === state.activeWorkspaceId) {
      get().switchWorkspace(newActiveId)
    } else {
      saveWorkspacesToStorage(next, state.activeWorkspaceId)
      set({ workspaces: next })
    }
  },
  
  renameWorkspace: (id, name) => {
    const state = get()
    if (!state.workspaces[id]) return
    const next = {
      ...state.workspaces,
      [id]: { ...state.workspaces[id], name }
    }
    saveWorkspacesToStorage(next, state.activeWorkspaceId)
    set({ workspaces: next })
  },
  
  importWorkspaceJSON: (json) => {
    try {
      const imported = importWorkspaceJson(json)
      const id = makeWorkspaceId(imported.name)
      const name = imported.name || `Imported ${new Date().toLocaleDateString()}`
      const fsMap = ensureFsMapDefaults(imported.files || {})
      const newWs: WorkspaceData = normalizeWorkspaceData({
        id,
        name,
        fsMap,
        openFilePaths: [SCHEMATIC_MAIN_PATH],
        activeFilePath: SCHEMATIC_MAIN_PATH
      })
      const state = get()
      const nextWorkspaces = { ...state.workspaces, [id]: newWs }
      const parsed = getCanvasStateForFile(newWs.activeFilePath, newWs.fsMap)
      saveWorkspacesToStorage(nextWorkspaces, id)
      set({
        workspaces: nextWorkspaces,
        activeWorkspaceId: id,
        fsMap: newWs.fsMap,
        activeFilePath: newWs.activeFilePath,
        openFilePaths: newWs.openFilePaths,
        placedComponents: parsed.components,
        wires: parsed.wires,
        selectedComponentIds: [],
        breadcrumbStack: [],
        undoStack: [],
        redoStack: []
      })
    } catch (e) {
      console.error('Failed to import workspace JSON:', e)
    }
  },
  
  exportWorkspaceJSON: () => {
    const state = get()
    // First sync fsMap
    const currentFsMap = syncActiveCanvasFile(state)
    const normalizedFiles = normalizeWorkspaceFileSelection(currentFsMap, state.activeFilePath, state.openFilePaths)
    const nextWorkspaces = {
      ...state.workspaces,
      [state.activeWorkspaceId]: {
        ...state.workspaces[state.activeWorkspaceId],
        fsMap: currentFsMap,
        activeFilePath: normalizedFiles.activeFilePath,
        openFilePaths: normalizedFiles.openFilePaths
      }
    }
    saveWorkspacesToStorage(nextWorkspaces, state.activeWorkspaceId)
    set({
      fsMap: currentFsMap,
      workspaces: nextWorkspaces,
      activeFilePath: normalizedFiles.activeFilePath,
      openFilePaths: normalizedFiles.openFilePaths
    })
    const wsName = state.workspaces[state.activeWorkspaceId]?.name || 'Workspace'
    return JSON.stringify(exportWorkspaceJson(wsName, currentFsMap), null, 2)
  },

  importWorkspace: (payload, nameOverride) => {
    try {
      const imported = importWorkspaceJson(payload)
      const finalName = nameOverride || imported.name
      const id = makeWorkspaceId(finalName)
      const state = get()
      const newWs: WorkspaceData = normalizeWorkspaceData({
        id,
        name: finalName,
        fsMap: ensureFsMapDefaults(imported.files),
        activeFilePath: SCHEMATIC_MAIN_PATH,
        openFilePaths: [SCHEMATIC_MAIN_PATH]
      })
      const nextWorkspaces = { ...state.workspaces, [id]: newWs }
      const parsed = parseFileToCanvas(newWs.activeFilePath, newWs.fsMap)
      saveWorkspacesToStorage(nextWorkspaces, id)
      set({
        workspaces: nextWorkspaces,
        activeWorkspaceId: id,
        fsMap: newWs.fsMap,
        activeFilePath: newWs.activeFilePath,
        openFilePaths: newWs.openFilePaths,
        placedComponents: parsed.components,
        wires: parsed.wires,
        selectedComponentIds: [],
        breadcrumbStack: [],
        undoStack: [],
        redoStack: []
      })
    } catch (e) {
      console.error('Failed to import workspace payload:', e)
    }
  },

  exportActiveWorkspace: () => {
    return get().exportWorkspaceJSON()
  }
}))

export const minimalImportExportTestUtils = {
  parseImportedTSXToCanvas: (content: string, filePath = SCHEMATIC_MAIN_PATH) => {
    const normalized = normalizeImportedTSXContent(content, filePath)
    const fsMap = ensureFsMapDefaults({ [filePath]: normalized })
    const resolvedPath = getCanonicalFilePathForContent(filePath, normalized, fsMap, {
      preserveRequestedPath: true
    })
    return parseFileToCanvas(resolvedPath, fsMap)
  },
  exportCanvasToTSX: (
    filePath: string,
    components: PlacedComponent[],
    wires: WireConnection[]
  ) => generateFileTSX(filePath, components, wires),
  normalizeImportedTSXContent,
  detectFileKind
}

export const getActiveWorkspace = (state: EditorState) => {
  return state.workspaces[state.activeWorkspaceId] || null
}

export const getActiveFsMap = (state: EditorState): FSMap => {
  return getActiveWorkspace(state)?.fsMap ?? {}
}
