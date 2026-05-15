export type Point = {
  x: number
  y: number
}

export type NetId = string
export type NodeId = string
export type PortId = string
export type InterfaceId = string

export type PinDirection = 'input' | 'output' | 'bidirectional' | 'passive' | 'power' | 'open-collector'
export type PortDirection = 'input' | 'output' | 'bidirectional'
export type SignalKind = 'analog' | 'digital' | 'power' | 'ground' | 'reference' | 'clock'
export type NetRole = 'power' | 'ground' | 'signal' | 'clock' | 'analog' | 'reference'

export type ElectricalNet = {
  id: NetId
  name?: string
  role?: NetRole
  aliases?: string[]
  isGlobal?: boolean
}

export type PinNode = {
  kind: 'pin'
  id: NodeId
  componentId: string
  pinName: string
  direction?: PinDirection
  signalKind?: SignalKind
}

export type PortNode = {
  kind: 'port'
  id: NodeId
  portId: PortId
  interfaceId: InterfaceId
  name: string
  direction: PortDirection
  signalKind?: SignalKind
}

export type JunctionNode = {
  kind: 'junction'
  id: NodeId
}

export type ElectricalNode = PinNode | PortNode | JunctionNode

export type WireSegmentEdge = {
  kind: 'wire-segment'
  id: string
  wireId: string
  fromNodeId: NodeId
  toNodeId: NodeId
}

export type NetMembershipEdge = {
  kind: 'net-membership'
  id: string
  nodeId: NodeId
  netId: NetId
}

export type ElectricalEdge = WireSegmentEdge | NetMembershipEdge

export type ElectricalConnectivityGraph = {
  nets: ElectricalNet[]
  nodes: ElectricalNode[]
  edges: ElectricalEdge[]
  mergeHistory: Array<{
    canonicalNetId: NetId
    mergedNetIds: string[]
    aliases: string[]
  }>
}

export type RoutingIntent = 'manual' | 'semantic-auto' | 'orthogonal-auto' | 'bus'

export type WireGeometry = {
  id: string
  wireId: string
  fromNodeId: NodeId
  toNodeId: NodeId
  points: Point[]
  routingIntent?: RoutingIntent
}

export type NetLabelGeometry = {
  id: string
  netId: NetId
  alias: string
  x: number
  y: number
  rotation?: 0 | 90 | 180 | 270
  anchorNodeId?: NodeId
}

export type PowerSymbolGeometry = {
  id: string
  netId: NetId
  globalName: string
  role: Extract<NetRole, 'power' | 'ground'>
  x: number
  y: number
  rotation?: 0 | 90 | 180 | 270
  anchorNodeId?: NodeId
}

export type SchematicGeometryLayer = {
  wires: WireGeometry[]
  netLabels: NetLabelGeometry[]
  powerSymbols: PowerSymbolGeometry[]
}

export type ReusablePort = {
  id: PortId
  interfaceId: InterfaceId
  name: string
  direction: PortDirection
  signalKind?: SignalKind
}

export type NetPort = {
  id: string
  interfaceId: InterfaceId
  portId: PortId
  netId: NetId
  name: string
  direction: PortDirection
}

export type ReusableInterfaceLayer = {
  interfaceId: InterfaceId
  ports: ReusablePort[]
  netPorts: NetPort[]
}

export type FrozenSchematicDataModel = {
  connectivity: ElectricalConnectivityGraph
  geometry: SchematicGeometryLayer
  reusableInterface: ReusableInterfaceLayer
}
