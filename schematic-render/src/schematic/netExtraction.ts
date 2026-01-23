import type { SchematicDoc } from "./types"

/**
 * Circuit netlist format (tscircuit-inspired)
 */
export type CircuitComponent = {
  ref: string
  symbolId: string
  value?: string
  footprint?: string
  // For netlabel/tag components
  net?: string  // The net name this label declares
  schematic_net_label?: string  // Alternative tscircuit-style property
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
  version?: string  // Schema version
  components: CircuitComponent[]
  nets: Net[]
  // Additional metadata for tscircuit compatibility
  metadata?: {
    exporter: string
    exportDate: string
    schematicVersion: number
  }
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
    'Tag': 'TAG',
  }
  
  const prefix = prefixMap[symbolId] || 'U'
  
  // Special case: power symbols and tags don't get numbered
  if (['GND', 'VCC', 'VDD'].includes(symbolId)) {
    return symbolId
  }
  
  // Tags get numbered: TAG1, TAG2, etc.
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
  
  // Connect all Tag instances with the same tag name
  // Group tags by tag name
  const tagGroups = new Map<string, typeof doc.instances[0][]>()
  for (const inst of doc.instances) {
    if (inst.symbolId === "Tag" && inst.tag) {
      if (!tagGroups.has(inst.tag)) {
        tagGroups.set(inst.tag, [])
      }
      tagGroups.get(inst.tag)!.push(inst)
    }
  }
  
  // For each tag group, union all instances together
  for (const [tagName, instances] of tagGroups) {
    if (instances.length < 2) continue
    
    // Connect all instances to the first one
    const firstNode = { instId: instances[0].id, pinName: "TAG" }
    for (let i = 1; i < instances.length; i++) {
      uf.union(firstNode, { instId: instances[i].id, pinName: "TAG" })
    }
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
    
    // Build component object
    const component: CircuitComponent = {
      ref,
      symbolId,
      // Optional fields can be added later via UI
      // value: undefined,
      // footprint: undefined,
    }
    
    // Add netlabel/tag information for tscircuit compatibility
    if (inst.symbolId === "Tag" && inst.tag) {
      component.net = inst.tag
      component.schematic_net_label = inst.tag
    }
    
    return component
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
    
    // Priority for net naming:
    // 1. Tag name (if any Tag component is in this net)
    // 2. Power symbol name (GND, VCC, VDD)
    // 3. Auto-generated NET1, NET2, etc.
    
    // Find tag name from any Tag instance in this net
    let netName: string | undefined
    for (const node of nodes) {
      const inst = doc.instances.find(i => i.id === node.instId)
      if (inst?.symbolId === "Tag" && inst.tag) {
        netName = inst.tag
        break
      }
    }
    
    // If no tag, check for power symbols
    if (!netName) {
      const powerNode = netNodes.find(n => ['GND', 'VCC', 'VDD'].includes(n.ref))
      netName = powerNode ? powerNode.ref : `NET${netIndex++}`
    }
    
    nets.push({
      name: netName,
      nodes: netNodes,
    })
  }
  
  return {
    type: "circuit.v1",
    version: "1.0",
    components: circuitComponents,
    nets,
    metadata: {
      exporter: "schematic-render-canvas",
      exportDate: new Date().toISOString(),
      schematicVersion: doc.schemaVersion,
    },
  }
}

/**
 * Export circuit netlist to JSON string
 */
export function exportCircuitJSON(doc: SchematicDoc): string {
  const circuit = extractNets(doc)
  return JSON.stringify(circuit, null, 2)
}
