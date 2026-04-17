export type ActiveFileType =
  | 'schematic-tsx'
  | 'subcircuit-tsx'
  | 'symbol-tsx'
  | 'source-ts'
  | 'json'

export type DetectedFileKind = 'schematic' | 'subcircuit' | 'symbol' | 'unknown'

export const detectFileKind = (code: string): DetectedFileKind => {
  const trimmed = code.trim()
  if (!trimmed) return 'unknown'
  if (/<board\b[\s>]/.test(trimmed)) return 'schematic'
  if (/<subcircuit\b[\s>]/.test(trimmed)) return 'subcircuit'
  if (/<symbol\b[\s>]/.test(trimmed)) return 'symbol'
  return 'unknown'
}

export const getFolderForDetectedFileKind = (kind: DetectedFileKind): 'schematics' | 'subcircuits' | 'symbols' => {
  if (kind === 'subcircuit') return 'subcircuits'
  if (kind === 'symbol') return 'symbols'
  return 'schematics'
}

export const classifyFilePath = (filePath: string): ActiveFileType => {
  if (filePath.endsWith('.json')) return 'json'

  if (filePath.endsWith('.tsx')) {
    if (filePath === 'main.tsx' || filePath.startsWith('schematics/')) return 'schematic-tsx'
    if (filePath.startsWith('subcircuits/')) return 'subcircuit-tsx'
    if (filePath.startsWith('symbols/')) return 'symbol-tsx'
  }

  if (filePath.endsWith('.ts')) return 'source-ts'

  return 'source-ts'
}

export const isCanvasEditableFileType = (fileType: ActiveFileType): boolean => {
  return fileType === 'schematic-tsx' || fileType === 'subcircuit-tsx'
}
