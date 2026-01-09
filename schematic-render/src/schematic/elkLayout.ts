import ELK from "elkjs/lib/elk.bundled.js"
import type { SchematicDoc } from "./types"
import { getSymbolDef } from "../symbol-lib/registry"
import { computeSymbolBBox } from "../symbol-dsl/geometry"

const elk = new ELK()

export async function autoLayoutELK(doc: SchematicDoc): Promise<SchematicDoc> {
  // Convert doc to ELK graph
  const nodes = doc.instances.map((inst) => {
    const sym = getSymbolDef(inst.symbolId)
    if (!sym) {
      // Fallback for missing symbols
      return {
        id: inst.id,
        width: 80,
        height: 60,
        ports: [],
      }
    }
    
    const symPins = sym.pins
    const bbox = sym.bbox && sym.bbox.w > 0 && sym.bbox.h > 0 ? sym.bbox : computeSymbolBBox(sym)
    
    // Map pins to ELK ports with proper side detection
    const ports = symPins.map((p, idx) => {
      // Determine port side based on pin direction
      let side: "NORTH" | "SOUTH" | "EAST" | "WEST" = "WEST"
      switch (p.dir) {
        case "left":
          side = "WEST"
          break
        case "right":
          side = "EAST"
          break
        case "up":
          side = "NORTH"
          break
        case "down":
          side = "SOUTH"
          break
      }

      return {
        id: `${inst.id}:${p.name}`,
        properties: {
          side: side,
          "port.index": idx,
          "port.side": side,
        },
      }
    })
    
    return {
      id: inst.id,
      width: bbox.w + 60,
      height: bbox.h + 40,
      ports: ports,
    }
  })

  const edges = doc.wires.map((w) => ({
    id: w.id,
    sources: [`${w.a.instId}:${w.a.pinName}`],
    targets: [`${w.b.instId}:${w.b.pinName}`],
  }))

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.spacing.portPort": "20",
      "elk.portConstraints": "FIXED_SIDE",
    },
    children: nodes,
    edges: edges,
  }

  try {
    const layout = await elk.layout(graph)

    // Apply layout positions
    const newInstances = doc.instances.map((inst) => {
      const node = layout.children?.find((n) => n.id === inst.id)
      if (!node || !node.x || !node.y) return inst
      
      // Snap to grid
      const GRID = 20
      return {
        ...inst,
        pos: {
          x: Math.round(node.x / GRID) * GRID,
          y: Math.round(node.y / GRID) * GRID,
        },
      }
    })

    return {
      ...doc,
      instances: newInstances,
    }
  } catch (error) {
    console.error("ELK layout failed:", error)
    return doc
  }
}
