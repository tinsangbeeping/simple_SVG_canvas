import { FSMap } from '../types/catalog'
import {
  ComponentUsageMap,
  DependencyGraph,
  FileTreeNode,
  ImportedProjectFile,
  ImportedProjectState,
  ProjectFile,
  SubcircuitDefinition,
  SubcircuitRegistry,
  SymbolDefinition
} from '../types/project'
import { detectFileKind, getFolderForDetectedFileKind } from './fileClassification'

export const DEFAULT_SYMBOLS_FOLDER = `
export const ResistorSymbol = () => (
  <symbol>
    <rect x="-4" y="-2" width="8" height="4" fill="none" stroke="black" strokeWidth="1" />
  </symbol>
)

export const CapacitorSymbol = () => (
  <symbol>
    <line x1="-4" y1="0" x2="0" y2="0" stroke="black" strokeWidth="1" />
    <line x1="2" y1="-3" x2="2" y2="3" stroke="black" strokeWidth="1" />
    <line x1="4" y1="0" x2="8" y2="0" stroke="black" strokeWidth="1" />
  </symbol>
)
`

export const buildProjectFileTree = (fsMap: FSMap): FileTreeNode => {
  const root: FileTreeNode = {
    id: 'root',
    name: 'Project',
    type: 'folder',
    path: '/',
    children: []
  }

  const folders = new Map<string, FileTreeNode>()
  folders.set('', root)

  const ensureFolderNode = (folderPath: string): FileTreeNode => {
    const normalized = folderPath.replace(/^\/+|\/+$/g, '')
    if (!normalized) return root

    const existing = folders.get(normalized)
    if (existing) return existing

    const parts = normalized.split('/').filter(Boolean)
    const parentPath = parts.slice(0, -1).join('/')
    const parent = ensureFolderNode(parentPath)

    const node: FileTreeNode = {
      id: `folder:${normalized}`,
      name: parts[parts.length - 1],
      type: 'folder',
      path: normalized,
      children: []
    }

    parent.children = parent.children || []
    parent.children.push(node)
    folders.set(normalized, node)
    return node
  }

  // Keep the expected workspace roots visible even when empty.
  ;['schematics', 'subcircuits', 'symbols', 'editor'].forEach(ensureFolderNode)

  Object.entries(fsMap).forEach(([path, content]) => {
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    if (!normalizedPath) return

    const detectedKind = detectFileKind(content)
    const parts = normalizedPath.split('/')
    const fileName = parts[parts.length - 1]
    const actualParentFolderPath = parts.slice(0, -1).join('/')
    const parentFolderPath =
      detectedKind === 'unknown'
        ? actualParentFolderPath
        : getFolderForDetectedFileKind(detectedKind)
    const parent = ensureFolderNode(parentFolderPath)

    parent.children = parent.children || []
    parent.children.push({
      id: `file:${normalizedPath}`,
      name: fileName,
      type: 'file',
      path: normalizedPath,
      content
    })
  })

  const sortTree = (node: FileTreeNode) => {
    if (!node.children?.length) return
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortTree)
  }

  sortTree(root)

  return root
}

export const extractExportName = (code: string): string | null => {
  const match = code.match(/export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
  return match?.[1] || null
}

export const isValidSubcircuit = (code: string): boolean => {
  if (detectFileKind(code) !== 'subcircuit') return false
  if (/export\s+default/.test(code)) return false
  if (!/export\s+function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(code)) return false
  if (!/<subcircuit\b/.test(code)) return false
  if (/<board\b[\s>]/.test(code)) return false
  return true
}

const extractPortsFromSubcircuitContent = (content: string): string[] => {
  const portsMatch = content.match(/export const ports\s*=\s*\[(.*?)\]\s*as const/s)
  if (!portsMatch) return []

  return portsMatch[1]
    .split(',')
    .map(p => p.trim().replace(/"/g, '').replace(/'/g, ''))
    .filter(Boolean)
}

export const extractImportPaths = (code: string): string[] => {
  return [...code.matchAll(/import\s+(?:type\s+)?(?:[^"']+?from\s+)?["']([^"']+)["']/g)]
    .map(match => match[1])
    .filter(Boolean)
}

export const extractExportNames = (code: string): string[] => {
  const names = new Set<string>()

  ;[...code.matchAll(/export\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].forEach(match => names.add(match[1]))
  ;[...code.matchAll(/export\s+const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g)].forEach(match => {
    if (match[1] !== 'ports') {
      names.add(match[1])
    }
  })

  if (/export\s+default/.test(code)) {
    names.add('default')
  }

  return [...names]
}

const normalizePathSegments = (segments: string[]): string[] => {
  const normalized: string[] = []

  segments.forEach((segment) => {
    if (!segment || segment === '.') return
    if (segment === '..') {
      normalized.pop()
      return
    }
    normalized.push(segment)
  })

  return normalized
}

export const resolveImportPath = (fromPath: string, importPath: string, fsMap?: FSMap): string | null => {
  if (!importPath.startsWith('.')) {
    return null
  }

  const baseSegments = fromPath.split('/').slice(0, -1)
  const importSegments = importPath.split('/')
  const normalizedSegments = normalizePathSegments([...baseSegments, ...importSegments])
  const stem = normalizedSegments.join('/')
  const candidates = [stem, `${stem}.tsx`, `${stem}.ts`, `${stem}/index.ts`, `${stem}/index.tsx`]

  if (!fsMap) {
    return candidates[1] || null
  }

  return candidates.find(candidate => !!fsMap[candidate]) || null
}

export const buildSubcircuitRegistry = (fsMap: FSMap): SubcircuitRegistry => {
  return extractAllSubcircuits(fsMap).reduce<SubcircuitRegistry>((registry, subcircuit) => {
    registry[subcircuit.name] = {
      filePath: subcircuit.filePath,
      ports: subcircuit.ports
    }
    return registry
  }, {})
}

export const buildDependencyGraph = (fsMap: FSMap): DependencyGraph => {
  const graph: DependencyGraph = {}

  Object.keys(fsMap).forEach((path) => {
    graph[path] = {
      path,
      imports: [],
      usedBy: []
    }
  })

  Object.entries(fsMap).forEach(([path, content]) => {
    extractImportPaths(content).forEach((importPath) => {
      const resolved = resolveImportPath(path, importPath, fsMap)
      if (!resolved || !graph[resolved]) return

      if (!graph[path].imports.includes(resolved)) {
        graph[path].imports.push(resolved)
      }
      if (!graph[resolved].usedBy.includes(path)) {
        graph[resolved].usedBy.push(path)
      }
    })
  })

  return graph
}

export const buildComponentUsage = (fsMap: FSMap): ComponentUsageMap => {
  const usage: ComponentUsageMap = {}
  const trackedNames = [
    ...Object.keys(buildSubcircuitRegistry(fsMap)),
    ...extractAllSymbols(fsMap).map(symbol => symbol.name)
  ]

  trackedNames.forEach((name) => {
    const matcher = new RegExp(`<${name}\\b`)
    Object.entries(fsMap).forEach(([path, content]) => {
      if (matcher.test(content)) {
        if (!usage[name]) usage[name] = []
        usage[name].push(path)
      }
    })
  })

  return usage
}

export const buildImportedProjectState = (fsMap: FSMap): ImportedProjectState => {
  const files = Object.entries(fsMap).reduce<Record<string, ImportedProjectFile>>((acc, [path, code]) => {
    const kind = detectFileKind(code)
    acc[path] = {
      path,
      code,
      kind,
      exports: extractExportNames(code),
      imports: extractImportPaths(code)
    }
    return acc
  }, {})

  const registry = Object.fromEntries(
    Object.entries(buildSubcircuitRegistry(fsMap)).map(([name, info]) => [name, info.filePath])
  )
  const entryFiles = Object.values(files)
    .filter(file => file.kind === 'schematic')
    .map(file => file.path)

  return {
    files,
    registry,
    entryFiles,
    dependencyGraph: buildDependencyGraph(fsMap),
    componentUsage: buildComponentUsage(fsMap)
  }
}

export const extractAllSymbols = (fsMap: FSMap): SymbolDefinition[] => {
  const symbols: SymbolDefinition[] = []

  Object.entries(fsMap).forEach(([path, content]) => {
    if (!path.endsWith('.tsx')) return
    if (detectFileKind(content) !== 'symbol') return

    const name = path.split('/').pop()?.replace('.tsx', '') || 'Symbol'
    const portRegex = /Port\s*name="([^"]+)"/g
    const ports = []
    let match

    while ((match = portRegex.exec(content)) !== null) {
      ports.push({ name: match[1], x: 0, y: 0 })
    }

    symbols.push({
      id: name,
      name,
      filePath: path,
      ports,
      drawing: { type: 'jsx', content }
    })
  })

  return symbols
}

export const extractAllSubcircuits = (fsMap: FSMap): SubcircuitDefinition[] => {
  const subcircuits: SubcircuitDefinition[] = []

  Object.entries(fsMap).forEach(([path, content]) => {
    if (!path.endsWith('.tsx')) return
    if (path === 'subcircuits/index.ts') return
    if (!isValidSubcircuit(content)) return

    const exportName = extractExportName(content)
    if (!exportName) return

    subcircuits.push({
      id: exportName,
      name: exportName,
      filePath: path,
      ports: extractPortsFromSubcircuitContent(content),
      internalComponents: []
    })
  })

  return subcircuits
}

export const ensureProjectFolderDefaults = (fsMap: FSMap): FSMap => {
  const updated = { ...fsMap }

  // Ensure main schematic
  if (!updated['schematics/main.tsx']) {
    updated['schematics/main.tsx'] = `export default () => (
  <board width="50mm" height="50mm">
    {/* Add components here */}
  </board>
)`
  }

  // Ensure symbols folder index
  if (!updated['symbols/index.ts']) {
    updated['symbols/index.ts'] = `// Symbol definitions exported here`
  }

  // Ensure subcircuits folder
  if (!updated['subcircuits/index.ts']) {
    updated['subcircuits/index.ts'] = `// Subcircuits exported here`
  }

  return updated
}

export const getFilesByFolder = (fsMap: FSMap, folder: 'symbols' | 'subcircuits' | 'schematics'): ProjectFile[] => {
  const files: ProjectFile[] = []

  Object.entries(fsMap).forEach(([path, content]) => {
    if (!path.endsWith('.tsx')) return

    const detectedKind = detectFileKind(content)
    const matchesFolder =
      (folder === 'schematics' && detectedKind === 'schematic') ||
      (folder === 'subcircuits' && detectedKind === 'subcircuit') ||
      (folder === 'symbols' && detectedKind === 'symbol')

    if (matchesFolder) {
      files.push({
        path,
        content,
        type: folder as any
      })
    }
  })

  return files
}
