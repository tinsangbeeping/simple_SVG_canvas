import type { SchematicDoc, SymbolInstance } from "../schematic/types"
import type { Patch, PatchPort } from "./types"
import { getAbsPins } from "../schematic/pins"

/**
 * Extract a patch from selected instances
 */
export function extractPatchFromSelection(
  doc: SchematicDoc,
  selectedInstIds: Set<string>,
  name: string,
  description?: string
): Patch {
  // Filter selected instances
  const selectedInstances = doc.instances.filter((inst) => selectedInstIds.has(inst.id))
  
  if (selectedInstances.length === 0) {
    throw new Error("No instances selected")
  }
  
  // Find internal wires (both ends within selection)
  const internalWires = doc.wires.filter(
    (wire) => selectedInstIds.has(wire.a.instId) && selectedInstIds.has(wire.b.instId)
  )
  
  // Find boundary connections (one end inside, one outside)
  const boundaryConnections = doc.wires.filter(
    (wire) =>
      (selectedInstIds.has(wire.a.instId) && !selectedInstIds.has(wire.b.instId)) ||
      (!selectedInstIds.has(wire.a.instId) && selectedInstIds.has(wire.b.instId))
  )
  
  // Infer ports from boundary connections
  const ports: PatchPort[] = []
  const portMap = new Map<string, PatchPort>() // key: instId:pinName
  
  for (const wire of boundaryConnections) {
    const internalEnd = selectedInstIds.has(wire.a.instId) ? wire.a : wire.b
    const key = `${internalEnd.instId}:${internalEnd.pinName}`
    
    if (!portMap.has(key)) {
      const inst = selectedInstances.find((i) => i.id === internalEnd.instId)
      if (inst) {
        const pins = getAbsPins(inst)
        const pin = pins.find((p) => p.pinName === internalEnd.pinName)
        if (pin) {
          const port: PatchPort = {
            name: `${internalEnd.instId}_${internalEnd.pinName}`,
            instId: internalEnd.instId,
            pinName: internalEnd.pinName,
            pos: { x: pin.x, y: pin.y },
          }
          ports.push(port)
          portMap.set(key, port)
        }
      }
    }
  }
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const inst of selectedInstances) {
    minX = Math.min(minX, inst.pos.x - 50)
    minY = Math.min(minY, inst.pos.y - 50)
    maxX = Math.max(maxX, inst.pos.x + 50)
    maxY = Math.max(maxY, inst.pos.y + 50)
  }
  
  const origin = { x: minX, y: minY }
  
  // Normalize positions relative to bbox origin
  const normalizedInstances: SymbolInstance[] = selectedInstances.map((inst) => ({
    ...inst,
    id: inst.id, // Keep original IDs for now, will be re-IDed on insert
    pos: {
      x: inst.pos.x - origin.x,
      y: inst.pos.y - origin.y,
    },
  }))
  
  const normalizedPorts: PatchPort[] = ports.map((port) => ({
    ...port,
    pos: {
      x: port.pos.x - origin.x,
      y: port.pos.y - origin.y,
    },
  }))
  
  return {
    id: `patch_${Date.now()}`,
    name,
    description,
    instances: normalizedInstances,
    wires: internalWires,
    ports: normalizedPorts,
    bbox: {
      x: 0,
      y: 0,
      w: maxX - minX,
      h: maxY - minY,
    },
    createdAt: Date.now(),
  }
}

/**
 * Insert a patch into the document
 */
export function insertPatch(doc: SchematicDoc, patch: Patch, at: { x: number; y: number }): SchematicDoc {
  const idMap = new Map<string, string>()
  
  // Re-ID instances
  const newInstances = patch.instances.map((inst) => {
    const newId = `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    idMap.set(inst.id, newId)
    
    return {
      ...inst,
      id: newId,
      pos: {
        x: at.x + inst.pos.x,
        y: at.y + inst.pos.y,
      },
    }
  })
  
  // Re-ID wires and update references
  const newWires = patch.wires.map((wire) => ({
    id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    a: {
      instId: idMap.get(wire.a.instId) || wire.a.instId,
      pinName: wire.a.pinName,
    },
    b: {
      instId: idMap.get(wire.b.instId) || wire.b.instId,
      pinName: wire.b.pinName,
    },
  }))
  
  return {
    ...doc,
    instances: [...doc.instances, ...newInstances],
    wires: [...doc.wires, ...newWires],
  }
}
