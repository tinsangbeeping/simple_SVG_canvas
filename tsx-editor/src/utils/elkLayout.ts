import ELK from 'elkjs'
import { PlacedComponent } from '../types/catalog'
import { getPinConfig } from '../types/schematic'

/**
 * ELK (Eclipse Layout Kernel) wrapper for automatic circuit layout
 * Arranges components to minimize wire crossings and optimize space
 */

const elk = new ELK()

export interface LayoutNode {
  id: string
  width: number
  height: number
}

export interface LayoutEdge {
  id: string
  sources: string[]
  targets: string[]
}

/**
 * Calculate optimal layout for circuit components using ELK
 */
export async function layoutCircuit(
  components: PlacedComponent[],
  edges: Array<{ from: { componentId: string }; to: { componentId: string } }>
): Promise<Map<string, { x: number; y: number }>> {
  try {
    // Build ELK graph structure
    const nodes: LayoutNode[] = components.map((comp) => {
      const schematic = getPinConfig(comp.catalogId)
      return {
        id: comp.id,
        width: schematic?.width || 60,
        height: schematic?.height || 40
      }
    })

    const edgesList: LayoutEdge[] = edges.map((edge, idx) => ({
      id: `edge-${idx}`,
      sources: [edge.from.componentId],
      targets: [edge.to.componentId]
    }))

    // ELK configuration for hierarchical layout
    const graph = {
      id: 'circuit',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.componentComponent': '60',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.layered.spacing.edgeNodeBetweenLayers': '20',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.port.side': 'BOTH'
      },
      children: nodes,
      edges: edgesList
    }

    // Run ELK layout algorithm
    const result = await elk.layout(graph as any)

    // Extract positions
    const positionMap = new Map<string, { x: number; y: number }>()

    if (result.children) {
      result.children.forEach((child: any) => {
        positionMap.set(child.id, {
          x: Math.round((child.x || 0) / 20) * 20, // Snap to grid
          y: Math.round((child.y || 0) / 20) * 20
        })
      })
    }

    return positionMap
  } catch (error) {
    console.error('ELK layout error:', error)
    // Fallback to grid layout on error
    return createGridLayout(components)
  }
}

/**
 * Fallback grid layout if ELK fails
 */
export function createGridLayout(components: PlacedComponent[]): Map<string, { x: number; y: number }> {
  const positionMap = new Map<string, { x: number; y: number }>()
  const cols = Math.ceil(Math.sqrt(components.length))
  
  components.forEach((comp, idx) => {
    const row = Math.floor(idx / cols)
    const col = idx % cols
    positionMap.set(comp.id, {
      x: col * 120,
      y: row * 120
    })
  })

  return positionMap
}

/**
 * Helper to check if layout would improve wire routing
 */
export function shouldApplyLayout(wireCount: number, componentCount: number): boolean {
  // Apply layout if there are many wires or components
  return wireCount > 3 || componentCount > 4
}
