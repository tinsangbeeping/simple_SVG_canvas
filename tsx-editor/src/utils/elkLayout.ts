import ELK from 'elkjs'
import { PlacedComponent } from '../types/catalog'
import { getPinConfig } from '../types/schematic'

const elk = new ELK()
const GRID_SIZE = 20

type ElkPortSide = 'WEST' | 'EAST' | 'NORTH' | 'SOUTH'

export interface LayoutPort {
  id: string
  width: number
  height: number
  properties?: Record<string, string>
  layoutOptions?: Record<string, string>
}

export interface LayoutNode {
  id: string
  width: number
  height: number
  ports: LayoutPort[]
  layoutOptions?: Record<string, string>
}

export interface LayoutEdge {
  id: string
  sources: string[]
  targets: string[]
}

const snapToGrid = (value: number): number => Math.round((value || 0) / GRID_SIZE) * GRID_SIZE

const toElkPortSide = (side?: string): ElkPortSide => {
  if (side === 'right') return 'EAST'
  if (side === 'top') return 'NORTH'
  if (side === 'bottom') return 'SOUTH'
  return 'WEST'
}

const getNodeSize = (component: PlacedComponent): { width: number; height: number } => {
  if (component.catalogId === 'subcircuit-instance') {
    const portCount = ((component.props.ports as string[] | undefined) || []).length
    const rows = Math.max(1, Math.ceil(portCount / 2))
    return { width: 130, height: Math.max(46, 28 + rows * 18) }
  }

  if (component.catalogId === 'sheet-instance') {
    const portCount = ((component.props.ports as string[] | undefined) || []).length
    const rows = Math.max(1, Math.ceil(portCount / 2))
    return { width: 150, height: Math.max(52, 34 + rows * 18) }
  }

  if (component.catalogId === 'customchip') {
    const pinCount = Math.max(2, Number(component.props.pinCount || 8))
    const leftPins = Math.max(0, Number(component.props.leftPins ?? Math.ceil(pinCount / 2)))
    const rightPins = Math.max(0, Number(component.props.rightPins ?? Math.floor(pinCount / 2)))
    const topPins = Math.max(0, Number(component.props.topPins ?? 0))
    const bottomPins = Math.max(0, Number(component.props.bottomPins ?? 0))
    const sideRows = Math.max(leftPins, rightPins)
    const topBottomCols = Math.max(topPins, bottomPins)
    return {
      width: Math.max(100, 28 + topBottomCols * 20),
      height: Math.max(80, 24 + sideRows * 20)
    }
  }

  const schematic = getPinConfig(component.catalogId)
  return {
    width: schematic?.width || 60,
    height: schematic?.height || 40
  }
}

const getLayoutPins = (component: PlacedComponent): Array<{ name: string; side: ElkPortSide }> => {
  if (component.catalogId === 'net' || component.catalogId === 'netport') {
    return [{ name: 'port', side: component.catalogId === 'net' ? 'EAST' : 'WEST' }]
  }

  if (component.catalogId === 'subcircuit-instance' || component.catalogId === 'sheet-instance') {
    const ports = ((component.props.ports as string[] | undefined) || []).map(String)
    if (ports.length === 0) return [{ name: 'IO', side: 'WEST' }]

    return ports.map((name, index) => ({
      name,
      side: index % 2 === 0 ? 'WEST' : 'EAST'
    }))
  }

  if (component.catalogId === 'customchip') {
    const pinCount = Math.max(2, Number(component.props.pinCount || 8))
    const leftPins = Math.max(0, Number(component.props.leftPins ?? Math.ceil(pinCount / 2)))
    const rightPins = Math.max(0, Number(component.props.rightPins ?? Math.floor(pinCount / 2)))
    const topPins = Math.max(0, Number(component.props.topPins ?? 0))
    const bottomPins = Math.max(0, Number(component.props.bottomPins ?? 0))

    const pins: Array<{ name: string; side: ElkPortSide }> = []
    for (let i = 0; i < leftPins; i += 1) pins.push({ name: `L${i + 1}`, side: 'WEST' })
    for (let i = 0; i < rightPins; i += 1) pins.push({ name: `R${i + 1}`, side: 'EAST' })
    for (let i = 0; i < topPins; i += 1) pins.push({ name: `U${i + 1}`, side: 'NORTH' })
    for (let i = 0; i < bottomPins; i += 1) pins.push({ name: `D${i + 1}`, side: 'SOUTH' })
    return pins
  }

  const schematic = getPinConfig(component.catalogId)
  return (schematic?.pins || []).map(pin => ({
    name: pin.name,
    side: toElkPortSide(pin.side)
  }))
}

export async function layoutCircuit(
  components: PlacedComponent[],
  edges: Array<{ from: { componentId: string; pinName: string }; to: { componentId: string; pinName: string } }>
): Promise<Map<string, { x: number; y: number }>> {
  try {
    const edgePinsByComponent = new Map<string, Set<string>>()
    edges.forEach(edge => {
      if (!edgePinsByComponent.has(edge.from.componentId)) edgePinsByComponent.set(edge.from.componentId, new Set())
      if (!edgePinsByComponent.has(edge.to.componentId)) edgePinsByComponent.set(edge.to.componentId, new Set())
      edgePinsByComponent.get(edge.from.componentId)?.add(edge.from.pinName)
      edgePinsByComponent.get(edge.to.componentId)?.add(edge.to.pinName)
    })

    const nodes: LayoutNode[] = components.map((component) => {
      const size = getNodeSize(component)
      const intrinsicPins = getLayoutPins(component)
      const mergedPins = [...intrinsicPins]
      const seenPins = new Set(intrinsicPins.map(pin => pin.name))
      const edgePins = [...(edgePinsByComponent.get(component.id) || new Set<string>())]

      edgePins.forEach((pinName, index) => {
        if (seenPins.has(pinName)) return
        seenPins.add(pinName)
        mergedPins.push({
          name: pinName,
          side: index % 2 === 0 ? 'WEST' : 'EAST'
        })
      })

      return {
        id: component.id,
        width: size.width,
        height: size.height,
        ports: mergedPins.map((pin, index) => ({
          id: `${component.id}.${pin.name}`,
          width: 8,
          height: 8,
          properties: {
            'port.side': pin.side,
            'port.index': String(index)
          },
          layoutOptions: {
            'elk.port.side': pin.side,
            'elk.port.index': String(index)
          }
        })),
        layoutOptions: {
          'elk.portConstraints': 'FIXED_ORDER',
          'org.eclipse.elk.portConstraints': 'FIXED_ORDER'
        }
      }
    })

    const nodePortMap = new Map<string, Set<string>>()
    nodes.forEach(node => {
      nodePortMap.set(node.id, new Set(node.ports.map(port => port.id)))
    })

    const edgesList: LayoutEdge[] = edges
      .map((edge, idx) => {
        const sourcePort = `${edge.from.componentId}.${edge.from.pinName}`
        const targetPort = `${edge.to.componentId}.${edge.to.pinName}`
        const sourceExists = nodePortMap.get(edge.from.componentId)?.has(sourcePort)
        const targetExists = nodePortMap.get(edge.to.componentId)?.has(targetPort)
        if (!sourceExists || !targetExists) return null

        return {
          id: `edge-${idx}`,
          sources: [sourcePort],
          targets: [targetPort]
        }
      })
      .filter((edge): edge is LayoutEdge => !!edge)

    const graph = {
      id: 'circuit',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.portConstraints': 'FIXED_ORDER',
        'elk.spacing.nodeNode': '50',
        'elk.layered.spacing.nodeNodeBetweenLayers': '90',
        'elk.layered.spacing.edgeNodeBetweenLayers': '30',
        'elk.layered.considerModelOrder.strategy': 'PREFER_NODES',
        'elk.edgeRouting': 'ORTHOGONAL'
      },
      children: nodes,
      edges: edgesList
    }

    const result = await elk.layout(graph as any)
    const positionMap = new Map<string, { x: number; y: number }>()

    if (result.children) {
      result.children.forEach((child: any) => {
        positionMap.set(child.id, {
          x: snapToGrid(child.x || 0),
          y: snapToGrid(child.y || 0)
        })
      })
    }

    return positionMap
  } catch (error) {
    console.error('ELK layout error:', error)
    return createGridLayout(components)
  }
}

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

export function shouldApplyLayout(wireCount: number, componentCount: number): boolean {
  return wireCount > 3 || componentCount > 4
}
