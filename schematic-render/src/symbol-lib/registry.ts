import type { SymbolDef } from "../symbol-dsl/types"
import { computeSymbolBBox } from "../symbol-dsl/geometry"
import { resistor, gnd } from "./basic"
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
  // First, add built-in symbols
  ensureBBox(resistor)
  ensureBBox(gnd)
  symbolRegistry[resistor.id] = resistor
  symbolRegistry[gnd.id] = gnd
  
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
      // Load stored symbols (don't override built-ins unless explicitly allowed)
      if (!symbolRegistry[symbol.id]) {
        ensureBBox(symbol)
        symbolRegistry[symbol.id] = symbol
      }
    }
    if (symbols.length > 0) {
      console.log(
        `Loaded ${symbols.length} symbols from storage (+ ${Object.keys(symbolRegistry).length - symbols.length} built-ins)`
      )
    }
  } catch (err) {
    console.error("Failed to load symbols from storage:", err)
  }
  
  // Note: "useOnlyImported" mode is no longer supported to avoid breaking schematics
  // that reference built-in symbols. All custom symbols coexist with built-ins.
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
  if (symbolRegistry[symbol.id] && !allowOverwrite) {
    throw new Error(`Symbol ${symbol.id} already exists`)
  }
  
  // Auto-compute bbox if missing
  ensureBBox(symbol)
  
  symbolRegistry[symbol.id] = symbol
  saveToStorage()
}

export function unregisterSymbol(symbolId: string): boolean {
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
  const builtInIds = new Set([resistor.id, gnd.id])
  const allIds = Object.keys(symbolRegistry)
  
  for (const id of allIds) {
    if (!builtInIds.has(id)) {
      delete symbolRegistry[id]
    }
  }
  
  saveToStorage()
}

export function clearAllSymbols(): void {
  // Clear entire registry
  for (const key of Object.keys(symbolRegistry)) {
    delete symbolRegistry[key]
  }
  saveToStorage()
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
