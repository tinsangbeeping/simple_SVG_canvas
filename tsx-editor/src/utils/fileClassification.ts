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

  const hasBoard = /<board\b[\s>]/.test(trimmed)
  const hasSubcircuit = /<subcircuit\b[\s>]/.test(trimmed)
  const hasSymbol = /<symbol\b[\s>]/.test(trimmed)

  if (hasBoard || /export\s+default[\s\S]*<board\b/i.test(trimmed)) return 'schematic'
  if (hasSubcircuit) return 'subcircuit'
  if (hasSymbol) return 'symbol'
  return 'unknown'
}

export const inferDetectedFileKind = (filePath: string, code: string): DetectedFileKind => {
  const structuralKind = detectFileKind(code)
  if (structuralKind !== 'unknown') return structuralKind

  const normalizedPath = filePath.replace(/^\/+/, '')
  if (!normalizedPath.endsWith('.tsx')) return 'unknown'

  if (normalizedPath.startsWith('symbols/')) return 'symbol'
  if (normalizedPath.startsWith('subcircuits/')) return 'subcircuit'
  if (normalizedPath === 'main.tsx' || normalizedPath.startsWith('schematics/')) return 'schematic'
  if (/\bexport\s+default\b/.test(code)) return 'schematic'

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
