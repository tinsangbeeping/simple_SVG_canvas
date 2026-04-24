/**
 * Project structure types for multi-file schematic design
 */

export interface ProjectFile {
  path: string // e.g., "main.tsx", "symbols/Resistor.tsx", "subcircuits/PowerModule.tsx"
  content: string // TSX content
  type: 'board' | 'symbol-component' | 'subcircuit' | 'raw' | 'meta'
}

export interface ImportedProjectFile {
  path: string
  code: string
  kind: 'board' | 'symbol-component' | 'subcircuit' | 'raw'
  exports: string[]
  imports: string[]
  sheets: string[]
}

export interface DependencyGraphNode {
  path: string
  imports: string[]
  usedBy: string[]
}

export type DependencyGraph = Record<string, DependencyGraphNode>
export type ComponentUsageMap = Record<string, string[]>

export interface ImportedProjectState {
  files: Record<string, ImportedProjectFile>
  registry: Record<string, string>
  entryFiles: string[]
  rootFile: string | null
  hierarchy: Record<string, string[]>
  dependencyGraph: DependencyGraph
  componentUsage: ComponentUsageMap
}

export interface ProjectStructure {
  name: string
  version: string
  files: ProjectFile[]
  metadata?: {
    created: string
    modified: string
    author?: string
  }
}

export interface SymbolDefinition {
  id: string // e.g., "Resistor"
  name: string // display name
  filePath: string // e.g., "symbols/Resistor.tsx"
  ports: Array<{ name: string; x: number; y: number }> // pin definitions
  drawing: {
    type: 'svg' | 'bitmap' | 'jsx'
    content: string
  }
}

export interface SubcircuitDefinition {
  id: string
  name: string
  filePath: string
  ports: string[] // ["VIN", "VOUT", "GND"]
  internalComponents: string[]
}

export type SubcircuitRegistry = {
  [name: string]: {
    filePath: string
    ports: string[]
  }
}

export type PatchComponentSpec =
  | string
  | {
      type?: string
      subcircuit?: string
      instanceName?: string
      props?: Record<string, any>
      schX?: number
      schY?: number
    }

export type PatchWireSpec =
  | string
  | {
      from: string
      to: string
    }

export interface PatchDefinition {
  id: string
  name: string
  description?: string
  components: PatchComponentSpec[]
  wiring: PatchWireSpec[]
  layout?: {
    offsetX?: number
    offsetY?: number
  }
}

export interface FileTreeNode {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
  children?: FileTreeNode[]
  content?: string
}
