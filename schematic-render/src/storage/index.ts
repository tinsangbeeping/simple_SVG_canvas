import type { SchematicDoc } from "../schematic/types"
import type { Patch } from "../patch-lib/types"
import type { SymbolDef } from "../symbol-dsl/types"
import { STORAGE_KEYS } from "./keys"
import { readJSON, writeJSON, removeKey } from "./kv"

export function loadSchematic(fallback: SchematicDoc): SchematicDoc {
  return readJSON<SchematicDoc>(STORAGE_KEYS.schematic, fallback)
}

export function saveSchematic(doc: SchematicDoc): void {
  writeJSON(STORAGE_KEYS.schematic, doc)
}

export function loadPatches(): Patch[] {
  return readJSON<Patch[]>(STORAGE_KEYS.patchLibrary, [])
}

export function savePatches(patches: Patch[]): void {
  writeJSON(STORAGE_KEYS.patchLibrary, patches)
}

export function loadSymbols(): SymbolDef[] {
  return readJSON<SymbolDef[]>(STORAGE_KEYS.symbolLibrary, [])
}

export function saveSymbols(symbols: SymbolDef[]): void {
  writeJSON(STORAGE_KEYS.symbolLibrary, symbols)
}

export function loadRecentSymbols(): string[] {
  return readJSON<string[]>(STORAGE_KEYS.recentSymbols, [])
}

export function saveRecentSymbols(symbolIds: string[]): void {
  writeJSON(STORAGE_KEYS.recentSymbols, symbolIds)
}

export function cleanupDeprecatedKeys(): void {
  removeKey(STORAGE_KEYS.useOnlyImportedSymbols)
}
