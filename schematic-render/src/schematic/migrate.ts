import type { SchematicDoc } from "./types"

export const CURRENT_SCHEMA_VERSION = 1

export type MigrationResult =
  | { success: true; doc: SchematicDoc }
  | { success: false; errors: string[] }

export function migrateToV1(input: any): MigrationResult {
  const errors: string[] = []

  // Check if it's completely invalid
  if (typeof input !== "object" || input === null) {
    return { success: false, errors: ["Input is not an object"] }
  }

  // Get or assume schema version
  const inputVersion = input.schemaVersion ?? 0

  if (inputVersion === 1) {
    // Already v1, just validate structure
    if (!input.instances || !Array.isArray(input.instances)) {
      errors.push("Missing or invalid 'instances' array")
    }
    if (!input.wires || !Array.isArray(input.wires)) {
      errors.push("Missing or invalid 'wires' array")
    }
    
    if (errors.length > 0) {
      return { success: false, errors }
    }
    
    return { success: true, doc: input as SchematicDoc }
  }

  // Legacy format (v0) - try to migrate
  const migrated: any = {
    schemaVersion: 1,
    instances: [],
    wires: [],
  }

  // Map common alternative keys for instances
  const instancesArray = input.instances || input.components || input.parts || []
  if (!Array.isArray(instancesArray)) {
    errors.push("Cannot find instances array (tried 'instances', 'components', 'parts')")
  } else {
    migrated.instances = instancesArray.map((inst: any, idx: number) => {
      const id = inst.id || inst.name || `inst_${idx}`
      const symbolId = inst.symbolId || inst.symbol || inst.type || "unknown"
      const pos = inst.pos || inst.position || { x: 0, y: 0 }
      const rotDeg = inst.rotDeg || inst.rotation || inst.rot || 0

      // Normalize rotation to 0/90/180/270
      let normalizedRot: 0 | 90 | 180 | 270 = 0
      if ([0, 90, 180, 270].includes(rotDeg)) {
        normalizedRot = rotDeg as 0 | 90 | 180 | 270
      } else {
        errors.push(`Instance ${idx}: invalid rotation ${rotDeg}, using 0`)
      }

      return {
        id,
        symbolId,
        pos: { x: pos.x ?? 0, y: pos.y ?? 0 },
        rotDeg: normalizedRot,
      }
    })
  }

  // Map common alternative keys for wires
  const wiresArray = input.wires || input.nets || input.connections || []
  if (!Array.isArray(wiresArray)) {
    // Wires can be empty, not fatal
    migrated.wires = []
  } else {
    migrated.wires = wiresArray.map((wire: any, idx: number) => {
      const id = wire.id || `wire_${idx}`
      
      // Try to extract endpoints
      let a = wire.a || wire.from || wire.start
      let b = wire.b || wire.to || wire.end
      
      if (!a || !b) {
        errors.push(`Wire ${idx}: missing endpoints`)
        a = { instId: "unknown", pinName: "unknown" }
        b = { instId: "unknown", pinName: "unknown" }
      }

      return {
        id,
        a: {
          instId: a.instId || a.componentId || a.id || "unknown",
          pinName: a.pinName || a.pin || a.name || "unknown",
        },
        b: {
          instId: b.instId || b.componentId || b.id || "unknown",
          pinName: b.pinName || b.pin || b.name || "unknown",
        },
      }
    })
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return { success: true, doc: migrated as SchematicDoc }
}

export function formatMigrationErrors(errors: string[]): string {
  return errors.map((e, idx) => `${idx + 1}. ${e}`).join("\n")
}
