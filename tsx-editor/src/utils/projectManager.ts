import { FSMap } from '../types/catalog'
import { ProjectFile, FileTreeNode, SymbolDefinition, SubcircuitDefinition } from '../types/project'

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

  const folders: Record<string, FileTreeNode> = {
    '/': root,
    '/symbols': { id: 'symbols', name: 'symbols', type: 'folder', path: '/symbols', children: [] },
    '/subcircuits': { id: 'subcircuits', name: 'subcircuits', type: 'folder', path: '/subcircuits', children: [] },
    '/schematics': { id: 'schematics', name: 'schematics', type: 'folder', path: '/schematics', children: [] }
  }

  // Parse fsMap into tree
  Object.entries(fsMap).forEach(([path, content]) => {
    if (path === 'editor/meta.json' || path === 'subcircuits/index.ts') return

    const parts = path.split('/')
    const fileName = parts[parts.length - 1]
    const folderPath = parts.slice(0, -1).join('/')
    const folder = parts[0] === 'symbols' ? 'symbols' : parts[0] === 'subcircuits' ? 'subcircuits' : 'schematics'

    if (!folders[`/${folder}`]) {
      folders[`/${folder}`] = {
        id: folder,
        name: folder,
        type: 'folder',
        path: `/${folder}`,
        children: []
      }
      root.children?.push(folders[`/${folder}`])
    }

    const fileNode: FileTreeNode = {
      id: path,
      name: fileName,
      type: 'file',
      path,
      content
    }

    folders[`/${folder}`].children?.push(fileNode)
  })

  return root
}

export const extractAllSymbols = (fsMap: FSMap): SymbolDefinition[] => {
  const symbols: SymbolDefinition[] = []

  Object.entries(fsMap).forEach(([path, content]) => {
    if (!path.startsWith('symbols/') || !path.endsWith('.tsx')) return

    const name = path.replace('symbols/', '').replace('.tsx', '')
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
    if (!path.startsWith('subcircuits/') || !path.endsWith('.tsx')) return
    if (path === 'subcircuits/index.ts') return

    const name = path.replace('subcircuits/', '').replace('.tsx', '')

    // Extract ports from export const ports = [...]
    const portsMatch = content.match(/export const ports\s*=\s*\[(.*?)\]\s*as const/)
    let ports: string[] = []
    if (portsMatch) {
      const portString = portsMatch[1]
      ports = portString
        .split(',')
        .map(p => p.trim().replace(/"/g, '').replace(/'/g, ''))
        .filter(Boolean)
    }

    subcircuits.push({
      id: name,
      name,
      filePath: path,
      ports,
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
    if (path.startsWith(`${folder}/`) && path.endsWith('.tsx')) {
      files.push({
        path,
        content,
        type: folder as any
      })
    }
  })

  return files
}
