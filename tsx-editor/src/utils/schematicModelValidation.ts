import type {
  ElectricalConnectivityGraph,
  FrozenSchematicDataModel,
  NetId,
  NodeId,
  ReusableInterfaceLayer,
  SchematicGeometryLayer,
} from '../types/schematicModel'

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message)
  }
}

const assertNoMixedVisualFields = (entity: Record<string, unknown>, entityName: string, forbiddenFields: string[]) => {
  forbiddenFields.forEach((field) => {
    assert(!hasOwn(entity, field), `${entityName} must not define ${field}`)
  })
}

export const validateElectricalConnectivityGraph = (graph: ElectricalConnectivityGraph): void => {
  const nodeIds = new Set<NodeId>()
  const netIds = new Set<NetId>()

  graph.nets.forEach((net) => {
    assert(!netIds.has(net.id), `duplicate net id ${net.id}`)
    netIds.add(net.id)
  })

  graph.nodes.forEach((node) => {
    assert(!nodeIds.has(node.id), `duplicate node id ${node.id}`)
    nodeIds.add(node.id)
    assert(node.kind === 'pin' || node.kind === 'port' || node.kind === 'junction', `invalid node kind ${(node as { kind?: string }).kind || 'unknown'}`)
  })

  graph.edges.forEach((edge) => {
    if (edge.kind === 'wire-segment') {
      assert(nodeIds.has(edge.fromNodeId), `wire-segment ${edge.id} references missing fromNodeId ${edge.fromNodeId}`)
      assert(nodeIds.has(edge.toNodeId), `wire-segment ${edge.id} references missing toNodeId ${edge.toNodeId}`)
      return
    }

    assert(nodeIds.has(edge.nodeId), `net-membership ${edge.id} references missing nodeId ${edge.nodeId}`)
    assert(netIds.has(edge.netId), `net-membership ${edge.id} references missing netId ${edge.netId}`)
  })
}

export const validateSchematicGeometryLayer = (
  geometry: SchematicGeometryLayer,
  connectivity?: ElectricalConnectivityGraph
): void => {
  const nodeIds = new Set<NodeId>((connectivity?.nodes || []).map((node) => node.id))
  const netIds = new Set<NetId>((connectivity?.nets || []).map((net) => net.id))

  geometry.wires.forEach((wire) => {
    assertNoMixedVisualFields(wire as Record<string, unknown>, `wire ${wire.id}`, ['netId', 'netName', 'alias', 'portId', 'label'])
    assert(wire.points.length >= 2, `wire ${wire.id} must contain at least two points`)
    if (connectivity) {
      assert(nodeIds.has(wire.fromNodeId), `wire ${wire.id} references missing fromNodeId ${wire.fromNodeId}`)
      assert(nodeIds.has(wire.toNodeId), `wire ${wire.id} references missing toNodeId ${wire.toNodeId}`)
    }
  })

  geometry.netLabels.forEach((label) => {
    assertNoMixedVisualFields(label as Record<string, unknown>, `net label ${label.id}`, ['points', 'fromNodeId', 'toNodeId', 'portId'])
    if (connectivity) {
      assert(netIds.has(label.netId), `net label ${label.id} references missing netId ${label.netId}`)
      if (label.anchorNodeId) {
        assert(nodeIds.has(label.anchorNodeId), `net label ${label.id} references missing anchorNodeId ${label.anchorNodeId}`)
      }
    }
  })

  geometry.powerSymbols.forEach((symbol) => {
    assertNoMixedVisualFields(symbol as Record<string, unknown>, `power symbol ${symbol.id}`, ['points', 'fromNodeId', 'toNodeId', 'portId'])
    if (connectivity) {
      const net = connectivity.nets.find((candidate) => candidate.id === symbol.netId)
      assert(!!net, `power symbol ${symbol.id} references missing netId ${symbol.netId}`)
      assert(!!net?.isGlobal, `power symbol ${symbol.id} must attach to a predefined global net`)
      if (symbol.anchorNodeId) {
        assert(nodeIds.has(symbol.anchorNodeId), `power symbol ${symbol.id} references missing anchorNodeId ${symbol.anchorNodeId}`)
      }
    }
  })
}

export const validateReusableInterfaceLayer = (
  reusableInterface: ReusableInterfaceLayer,
  connectivity?: ElectricalConnectivityGraph
): void => {
  const netIds = new Set<NetId>((connectivity?.nets || []).map((net) => net.id))
  const portIds = new Set(reusableInterface.ports.map((port) => port.id))

  reusableInterface.ports.forEach((port) => {
    assertNoMixedVisualFields(port as Record<string, unknown>, `reusable port ${port.id}`, ['x', 'y', 'netId', 'points', 'alias'])
  })

  reusableInterface.netPorts.forEach((netPort) => {
    assert(portIds.has(netPort.portId), `netport ${netPort.id} references missing portId ${netPort.portId}`)
    if (connectivity) {
      assert(netIds.has(netPort.netId), `netport ${netPort.id} references missing netId ${netPort.netId}`)
    }
  })
}

export const assertValidFrozenSchematicModel = (model: FrozenSchematicDataModel): FrozenSchematicDataModel => {
  validateElectricalConnectivityGraph(model.connectivity)
  validateSchematicGeometryLayer(model.geometry, model.connectivity)
  validateReusableInterfaceLayer(model.reusableInterface, model.connectivity)
  return model
}
