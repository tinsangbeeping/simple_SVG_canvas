/**
 * Project structure types for multi-file schematic design
 */

export interface ProjectFile {
  path: string // e.g., "main.tsx", "symbols/Resistor.tsx", "subcircuits/PowerModule.tsx"
  content: string // TSX content
  type: 'schematic' | 'symbol' | 'subcircuit' | 'meta'
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

export interface FileTreeNode {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
  children?: FileTreeNode[]
  content?: string
}
