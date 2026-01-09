import type { SymbolInstance, Wire, Point } from "../schematic/types"

/**
 * A reusable patch (like a hierarchical block in KiCad)
 */
export type Patch = {
  id: string
  name: string
  description?: string
  
  // Internal structure
  instances: SymbolInstance[]
  wires: Wire[]
  
  // Ports for external connections
  ports: PatchPort[]
  
  // Metadata
  bbox?: { x: number; y: number; w: number; h: number }
  thumbnail?: string
  createdAt: number
}

/**
 * A port on a patch (connection point)
 */
export type PatchPort = {
  name: string
  // Which internal instance and pin this port connects to
  instId: string
  pinName: string
  // Position relative to patch origin
  pos: Point
}
