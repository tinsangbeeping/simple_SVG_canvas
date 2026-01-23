import type { SymbolDef } from "../symbol-dsl/types"
import { computeSymbolBBox } from "../symbol-dsl/geometry"
import { resistor as legacyR } from "./basic"
import { coreSymbols, coreSymbolIds } from "./core"
import { symbolFixtures } from "../fixtures/fixturesIndex"
import { cleanupDeprecatedKeys, loadSymbols, saveSymbols } from "../storage"

function ensureBBox(symbol: SymbolDef): void {
  const bb = symbol.bbox
  if (!bb || !(bb.w > 0) || !(bb.h > 0)) {
    symbol.bbox = computeSymbolBBox(symbol)
  }
}

export const symbolRegistry: Record<string, SymbolDef> = {}

function initializeRegistry(): void {
  // First, add all core symbols (built-in, non-deletable)
  for (const symbol of coreSymbols) {
    ensureBBox(symbol)
    symbolRegistry[symbol.id] = symbol
  }
  
  // Add legacy "R" alias for backward compatibility
  if (!symbolRegistry["R"]) {
    ensureBBox(legacyR)
    symbolRegistry["R"] = legacyR
  }
  
  // Auto-load baseline symbols from fixtures
  try {
    for (const fixture of symbolFixtures) {
      if (fixture.category === "baseline" && !symbolRegistry[fixture.symbolDef.id]) {
        ensureBBox(fixture.symbolDef)
        symbolRegistry[fixture.symbolDef.id] = fixture.symbolDef
        console.log(`Auto-loaded baseline symbol: ${fixture.symbolDef.id}`)
      }
    }
  } catch (err) {
    console.warn("Failed to auto-load baseline symbols:", err)
  }
  
  try {
    const symbols = loadSymbols()
    for (const symbol of symbols) {
      // Load stored symbols (don't override core symbols)
      if (!coreSymbolIds.has(symbol.id) && !symbolRegistry[symbol.id]) {
        ensureBBox(symbol)
        symbolRegistry[symbol.id] = symbol
      }
    }
    if (symbols.length > 0) {
      console.log(
        `Loaded ${symbols.length} symbols from storage (+ ${coreSymbols.length} core + ${Object.keys(symbolRegistry).length - symbols.length - coreSymbols.length} baseline)`
      )
    }
  } catch (err) {
    console.error("Failed to load symbols from storage:", err)
  }
  
  cleanupDeprecatedKeys()
}

function loadFromStorage(): void {
  initializeRegistry()
}

function saveToStorage(): void {
  try {
    // Save all symbols in registry
    const allSymbols = Object.values(symbolRegistry)
    saveSymbols(allSymbols)
    console.log(`Saved ${allSymbols.length} symbols to storage`)
  } catch (err) {
    console.error("Failed to save symbols to storage:", err)
  }
}

// Initialize storage
loadFromStorage()

export function getSymbolDef(symbolId: string): SymbolDef | null {
  const sym = symbolRegistry[symbolId]
  if (!sym) {
    console.warn(`Unknown symbolId: ${symbolId}`)
    return null
  }
  return sym
}

export function registerSymbol(symbol: SymbolDef, allowOverwrite = false): void {
  // Prevent overwriting core symbols unless explicitly allowed
  if (coreSymbolIds.has(symbol.id) && !allowOverwrite) {
    throw new Error(`Cannot overwrite core symbol: ${symbol.id}`)
  }
  
  if (symbolRegistry[symbol.id] && !allowOverwrite) {
    throw new Error(`Symbol ${symbol.id} already exists`)
  }
  
  // Auto-compute bbox if missing
  ensureBBox(symbol)
  
  symbolRegistry[symbol.id] = symbol
  saveToStorage()
}

export function unregisterSymbol(symbolId: string): boolean {
  // Prevent deleting core symbols
  if (coreSymbolIds.has(symbolId)) {
    console.warn(`Cannot delete core symbol: ${symbolId}`)
    return false
  }
  
  if (symbolRegistry[symbolId]) {
    delete symbolRegistry[symbolId]
    saveToStorage()
    return true
  }
  return false
}

export function listSymbols(): SymbolDef[] {
  return Object.values(symbolRegistry)
}

export function getSymbolCount(): number {
  return Object.keys(symbolRegistry).length
}

export function clearUserSymbols(): void {
  const allIds = Object.keys(symbolRegistry)
  
  for (const id of allIds) {
    if (!coreSymbolIds.has(id)) {
      delete symbolRegistry[id]
    }
  }
  
  saveToStorage()
}

export function clearAllSymbols(): void {
  // Clear entire registry except core symbols
  for (const key of Object.keys(symbolRegistry)) {
    if (!coreSymbolIds.has(key)) {
      delete symbolRegistry[key]
    }
  }
  saveToStorage()
}

export function isCoreSymbol(symbolId: string): boolean {
  return coreSymbolIds.has(symbolId)
}

export function setUseOnlyImportedSymbols(_useOnly: boolean): void {
  // This feature is deprecated to prevent breaking schematics
  // Built-in symbols (R, GND) are always available
  console.warn('setUseOnlyImportedSymbols is deprecated. Built-in symbols are always loaded.')
}

export function getUseOnlyImportedSymbols(): boolean {
  // Always return false - built-ins are always enabled
  return false
}
