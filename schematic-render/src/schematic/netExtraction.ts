import type { SchematicDoc } from "./types"

/**
 * Circuit netlist format (tscircuit-inspired)
 */
export type CircuitComponent = {
  ref: string
  symbolId: string
  value?: string
  footprint?: string
}

export type NetNode = {
  ref: string
  pin: string
}

export type Net = {
  name: string
  nodes: NetNode[]
}

export type CircuitDoc = {
  type: "circuit.v1"
  components: CircuitComponent[]
  nets: Net[]
}

/**
 * Graph node representing a pin connection point
 */
type GraphNode = {
  instId: string
  pinName: string
}

/**
 * Union-Find (Disjoint Set) data structure for efficient connected component detection
 */
class UnionFind {
  private parent: Map<string, string> = new Map()
  private rank: Map<string, number> = new Map()

  private getKey(node: GraphNode): string {
    return `${node.instId}:${node.pinName}`
  }

  find(node: GraphNode): string {
    const key = this.getKey(node)
    if (!this.parent.has(key)) {
      this.parent.set(key, key)
      this.rank.set(key, 0)
    }
    
    // Path compression
    if (this.parent.get(key) !== key) {
      this.parent.set(key, this.find(this.parseKey(this.parent.get(key)!)))
    }
    
    return this.parent.get(key)!
  }

  union(node1: GraphNode, node2: GraphNode): void {
    const root1 = this.find(node1)
    const root2 = this.find(node2)
    
    if (root1 === root2) return
    
    const rank1 = this.rank.get(root1) || 0
    const rank2 = this.rank.get(root2) || 0
    
    // Union by rank
    if (rank1 > rank2) {
      this.parent.set(root2, root1)
    } else if (rank1 < rank2) {
      this.parent.set(root1, root2)
    } else {
      this.parent.set(root2, root1)
      this.rank.set(root1, rank1 + 1)
    }
  }

  private parseKey(key: string): GraphNode {
    const [instId, pinName] = key.split(':')
    return { instId, pinName }
  }

  getAllComponents(): Map<string, GraphNode[]> {
    const components = new Map<string, GraphNode[]>()
    
    for (const key of this.parent.keys()) {
      const node = this.parseKey(key)
      const root = this.find(node)
      
      if (!components.has(root)) {
        components.set(root, [])
      }
      components.get(root)!.push(node)
    }
    
    return components
  }
}

/**
 * Auto-generate reference designators for instances without refs
 */
function generateRef(symbolId: string, index: number): string {
  // Standard reference prefixes
  const prefixMap: Record<string, string> = {
    'R': 'R',
    'C': 'C',
    'L': 'L',
    'D': 'D',
    'Q': 'Q',
    'U': 'U',
    'J': 'J',
    'P': 'P',
    'GND': 'GND',
    'VCC': 'VCC',
    'VDD': 'VDD',
  }
  
  const prefix = prefixMap[symbolId] || 'U'
  
  // Special case: power symbols don't get numbered
  if (['GND', 'VCC', 'VDD'].includes(symbolId)) {
    return symbolId
  }
  
  return `${prefix}${index}`
}

/**
 * Extract nets from schematic document
 * Uses Union-Find algorithm to detect connected components
 */
export function extractNets(doc: SchematicDoc): CircuitDoc {
  const uf = new UnionFind()
  
  // Build graph: connect all wire endpoints
  for (const wire of doc.wires) {
    uf.union(
      { instId: wire.a.instId, pinName: wire.a.pinName },
      { instId: wire.b.instId, pinName: wire.b.pinName }
    )
  }
  
  // Get connected components (nets)
  const components = uf.getAllComponents()
  
  // Generate component list with auto-generated refs
  const refCounts = new Map<string, number>()
  const instIdToRef = new Map<string, string>()
  
  const circuitComponents: CircuitComponent[] = doc.instances.map((inst) => {
    const symbolId = inst.symbolId
    const count = refCounts.get(symbolId) || 0
    refCounts.set(symbolId, count + 1)
    
    const ref = generateRef(symbolId, count + 1)
    instIdToRef.set(inst.id, ref)
    
    return {
      ref,
      symbolId,
      // Optional fields can be added later via UI
      // value: undefined,
      // footprint: undefined,
    }
  })
  
  // Convert connected components to nets
  const nets: Net[] = []
  let netIndex = 1
  
  for (const [_root, nodes] of components) {
    // Skip single-node nets (unconnected pins)
    if (nodes.length < 2) continue
    
    const netNodes: NetNode[] = nodes.map((node) => ({
      ref: instIdToRef.get(node.instId) || node.instId,
      pin: node.pinName,
    }))
    
    // Check if this net contains a power symbol (GND, VCC, VDD)
    const powerNode = netNodes.find(n => ['GND', 'VCC', 'VDD'].includes(n.ref))
    const netName = powerNode ? powerNode.ref : `NET${netIndex++}`
    
    nets.push({
      name: netName,
      nodes: netNodes,
    })
  }
  
  return {
    type: "circuit.v1",
    components: circuitComponents,
    nets,
  }
}

/**
 * Export circuit netlist to JSON string
 */
export function exportCircuitJSON(doc: SchematicDoc): string {
  const circuit = extractNets(doc)
  return JSON.stringify(circuit, null, 2)
}
