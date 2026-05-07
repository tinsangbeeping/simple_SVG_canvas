export type Point = {
  x: number
  y: number
}

export type Port = {
  id: string
  name: string
  direction?: 'input' | 'output' | 'bidirectional' | 'passive'
  signalKind?: 'analog' | 'digital' | 'power' | 'ground' | 'reference'
  netId?: string
}

export type Net = {
  id: string
  name?: string
  kind?: 'analog' | 'digital' | 'power' | 'ground' | 'reference'
  aliases?: string[]
}

export type PinRef = {
  componentId: string
  pinName: string
}

export type Connection =
  | { type: 'pin-to-net'; pin: PinRef; netId: string }
  | { type: 'port-to-net'; portId: string; netId: string }

export type WireSegment = {
  id: string
  from: Point
  to: Point
  netId: string
}

export type Junction = {
  id: string
  point: Point
  netIds: string[]
}

export type NetMergeHistory = {
  canonicalNetId: string
  mergedNetIds: string[]
  aliases: string[]
}

export type ElectricalGraphModel = {
  ports: Port[]
  nets: Net[]
  pinRefs: PinRef[]
  connections: Connection[]
  wireSegments: WireSegment[]
  junctions: Junction[]
  mergeHistory: NetMergeHistory[]
}
