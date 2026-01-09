import type { SymbolDef } from "../symbol-dsl/types"
import type { SchematicDoc } from "../schematic/types"

export type SymbolLibraryDoc = {
  schemaVersion: 1
  symbols: SymbolDef[]
}

export type JSONDetectionResult =
  | { type: "schematic"; doc: SchematicDoc }
  | { type: "symbol"; symbol: SymbolDef }
  | { type: "symbolArray"; symbols: SymbolDef[] }
  | { type: "symbolLibrary"; library: SymbolLibraryDoc }
  | { type: "unknown"; data: any }

export function detectJSONType(parsed: any): JSONDetectionResult {
  // Check if it's a SchematicDoc
  if (parsed && typeof parsed === "object" && "instances" in parsed && "wires" in parsed) {
    return { type: "schematic", doc: parsed as SchematicDoc }
  }

  // Check if it's a standard symbol library: { schemaVersion: 1, symbols: [...] }
  if (
    parsed &&
    typeof parsed === "object" &&
    "schemaVersion" in parsed &&
    "symbols" in parsed &&
    Array.isArray(parsed.symbols)
  ) {
    const symbols = parsed.symbols
    if (symbols.every((s: any) => s && "id" in s && "primitives" in s && "pins" in s)) {
      return { type: "symbolLibrary", library: parsed as SymbolLibraryDoc }
    }
  }

  // Check if it's an array of SymbolDef (for backwards compatibility)
  if (Array.isArray(parsed) && parsed.length > 0) {
    if (parsed.every((s: any) => s && "id" in s && "primitives" in s && "pins" in s)) {
      return { type: "symbolArray", symbols: parsed as SymbolDef[] }
    }
  }

  // Check if it's a single SymbolDef
  if (parsed && typeof parsed === "object" && "id" in parsed && "primitives" in parsed && "pins" in parsed) {
    return { type: "symbol", symbol: parsed as SymbolDef }
  }

  return { type: "unknown", data: parsed }
}

export function validateSymbolDef(symbol: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!symbol || typeof symbol !== "object") {
    errors.push("Symbol must be an object")
    return { valid: false, errors }
  }

  if (!symbol.id || typeof symbol.id !== "string") {
    errors.push("Symbol must have a string 'id' field")
  }

  if (!Array.isArray(symbol.primitives)) {
    errors.push("Symbol must have a 'primitives' array")
  }

  if (!Array.isArray(symbol.pins)) {
    errors.push("Symbol must have a 'pins' array")
  } else if (symbol.pins.length === 0) {
    errors.push("Symbol must have at least one pin")
  }

  // Validate each pin
  if (Array.isArray(symbol.pins)) {
    symbol.pins.forEach((pin: any, idx: number) => {
      if (!pin.name) {
        errors.push(`Pin ${idx} missing 'name'`)
      }
      if (!pin.pos || typeof pin.pos.x !== "number" || typeof pin.pos.y !== "number") {
        errors.push(`Pin ${idx} missing valid 'pos' { x, y }`)
      }
      if (!pin.dir || !["left", "right", "up", "down"].includes(pin.dir)) {
        errors.push(`Pin ${idx} missing valid 'dir' (left/right/up/down)`)
      }
    })
  }

  return { valid: errors.length === 0, errors }
}
