import type { SymbolDef, Primitive } from "../symbol-dsl/types"
import type { SchematicDoc } from "../schematic/types"

export type ValidationError = {
  path: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

// Validate SymbolDef
export function validateSymbolDef(symbol: SymbolDef): ValidationResult {
  const errors: ValidationError[] = []

  // Check bbox dimensions (now optional)
  if (symbol.bbox) {
    if (symbol.bbox.w <= 0) {
      errors.push({ path: "bbox.w", message: "Width must be > 0" })
    }
    if (symbol.bbox.h <= 0) {
      errors.push({ path: "bbox.h", message: "Height must be > 0" })
    }
  }

  // Check pin names are unique
  const pinNames = new Set<string>()
  symbol.pins.forEach((pin, idx) => {
    if (pinNames.has(pin.name)) {
      errors.push({ path: `pins[${idx}].name`, message: `Duplicate pin name: ${pin.name}` })
    }
    pinNames.add(pin.name)

    // Validate pin direction
    if (!["left", "right", "up", "down"].includes(pin.dir)) {
      errors.push({ path: `pins[${idx}].dir`, message: `Invalid direction: ${pin.dir}` })
    }
  })

  // Validate primitives
  symbol.primitives.forEach((prim, idx) => {
    const primErrors = validatePrimitive(prim)
    primErrors.forEach((err) => {
      errors.push({ path: `primitives[${idx}]`, message: err })
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validatePrimitive(p: Primitive): string[] {
  const errors: string[] = []
  
  switch (p.kind) {
    case "line":
      if (typeof p.a.x !== "number" || typeof p.a.y !== "number") errors.push("a point invalid")
      if (typeof p.b.x !== "number" || typeof p.b.y !== "number") errors.push("b point invalid")
      break
    case "rect":
      if (typeof p.x !== "number" || typeof p.y !== "number") errors.push("position invalid")
      if (p.w <= 0) errors.push("width must be > 0")
      if (p.h <= 0) errors.push("height must be > 0")
      break
    case "circle":
      if (typeof p.cx !== "number" || typeof p.cy !== "number") errors.push("center invalid")
      if (p.r <= 0) errors.push("radius must be > 0")
      break
    case "arc":
      if (typeof p.cx !== "number" || typeof p.cy !== "number") errors.push("center invalid")
      if (p.r <= 0) errors.push("radius must be > 0")
      if (typeof p.startAngle !== "number" || typeof p.endAngle !== "number") errors.push("angles invalid")
      break
    case "polyline":
      if (!Array.isArray(p.points) || p.points.length < 2) errors.push("need at least 2 points")
      p.points.forEach((pt, idx) => {
        if (typeof pt.x !== "number" || typeof pt.y !== "number") {
          errors.push(`point[${idx}] invalid`)
        }
      })
      break
    case "text":
      if (typeof p.x !== "number" || typeof p.y !== "number") errors.push("position invalid")
      if (typeof p.text !== "string") errors.push("text must be string")
      break
  }
  
  return errors
}

// Validate SchematicDoc
export function validateSchematicDoc(doc: SchematicDoc): ValidationResult {
  const errors: ValidationError[] = []

  // Check instance IDs are unique
  const instanceIds = new Set<string>()
  doc.instances.forEach((inst, idx) => {
    if (instanceIds.has(inst.id)) {
      errors.push({ path: `instances[${idx}].id`, message: `Duplicate instance ID: ${inst.id}` })
    }
    instanceIds.add(inst.id)

    // Validate rotation
    if (![0, 90, 180, 270].includes(inst.rotDeg)) {
      errors.push({ path: `instances[${idx}].rotDeg`, message: `Invalid rotation: ${inst.rotDeg}` })
    }
  })

  // Validate wires
  doc.wires.forEach((wire, idx) => {
    // Check endpoints exist
    const aInst = doc.instances.find((i) => i.id === wire.a.instId)
    if (!aInst) {
      errors.push({ path: `wires[${idx}].a.instId`, message: `Instance not found: ${wire.a.instId}` })
    }

    const bInst = doc.instances.find((i) => i.id === wire.b.instId)
    if (!bInst) {
      errors.push({ path: `wires[${idx}].b.instId`, message: `Instance not found: ${wire.b.instId}` })
    }

    // Check pins exist (basic check - would need symbol registry for full validation)
    if (wire.a.instId === wire.b.instId && wire.a.pinName === wire.b.pinName) {
      errors.push({ path: `wires[${idx}]`, message: "Wire connects to same pin" })
    }
  })

  // Check wire IDs are unique
  const wireIds = new Set<string>()
  doc.wires.forEach((wire, idx) => {
    if (wireIds.has(wire.id)) {
      errors.push({ path: `wires[${idx}].id`, message: `Duplicate wire ID: ${wire.id}` })
    }
    wireIds.add(wire.id)
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Helper to format validation errors
export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) return "✓ Valid"
  return result.errors.map((e) => `❌ ${e.path}: ${e.message}`).join("\n")
}
