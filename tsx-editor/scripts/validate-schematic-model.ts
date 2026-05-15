import type { FrozenSchematicDataModel } from '../src/types/schematicModel'
import { assertValidFrozenSchematicModel } from '../src/utils/schematicModelValidation'

const assertThrows = (fn: () => void, expectedSubstring: string) => {
  try {
    fn()
    throw new Error(`expected failure containing: ${expectedSubstring}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes(expectedSubstring)) {
      throw error
    }
  }
}

const validModel: FrozenSchematicDataModel = {
  connectivity: {
    nets: [
      { id: 'net_gnd', name: 'GND', role: 'ground', isGlobal: true },
      { id: 'net_sig', name: 'SIG', role: 'signal', isGlobal: false },
    ],
    nodes: [
      { kind: 'pin', id: 'node_pin_u1_1', componentId: 'U1', pinName: 'IN', direction: 'input', signalKind: 'digital' },
      { kind: 'junction', id: 'node_junction_1' },
      { kind: 'port', id: 'node_port_out', portId: 'port_out', interfaceId: 'iface_demo', name: 'OUT', direction: 'output', signalKind: 'digital' },
    ],
    edges: [
      { kind: 'wire-segment', id: 'wire_seg_1', wireId: 'wire_1', fromNodeId: 'node_pin_u1_1', toNodeId: 'node_junction_1' },
      { kind: 'wire-segment', id: 'wire_seg_2', wireId: 'wire_1', fromNodeId: 'node_junction_1', toNodeId: 'node_port_out' },
      { kind: 'net-membership', id: 'membership_pin', nodeId: 'node_pin_u1_1', netId: 'net_sig' },
      { kind: 'net-membership', id: 'membership_junction', nodeId: 'node_junction_1', netId: 'net_sig' },
      { kind: 'net-membership', id: 'membership_port', nodeId: 'node_port_out', netId: 'net_sig' },
    ],
    mergeHistory: [],
  },
  geometry: {
    wires: [
      {
        id: 'wire_geom_1',
        wireId: 'wire_1',
        fromNodeId: 'node_pin_u1_1',
        toNodeId: 'node_port_out',
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 20, y: 10 },
        ],
        routingIntent: 'manual',
      },
    ],
    netLabels: [
      { id: 'label_1', netId: 'net_sig', alias: 'SIG', x: 20, y: 10, anchorNodeId: 'node_junction_1' },
    ],
    powerSymbols: [
      { id: 'power_1', netId: 'net_gnd', globalName: 'GND', role: 'ground', x: 0, y: 20 },
    ],
  },
  reusableInterface: {
    interfaceId: 'iface_demo',
    ports: [
      { id: 'port_out', interfaceId: 'iface_demo', name: 'OUT', direction: 'output', signalKind: 'digital' },
    ],
    netPorts: [
      { id: 'netport_out', interfaceId: 'iface_demo', portId: 'port_out', netId: 'net_sig', name: 'OUT', direction: 'output' },
    ],
  },
}

assertValidFrozenSchematicModel(validModel)

assertThrows(() => {
  assertValidFrozenSchematicModel({
    ...validModel,
    geometry: {
      ...validModel.geometry,
      wires: [
        {
          ...validModel.geometry.wires[0],
          netId: 'net_sig',
        } as typeof validModel.geometry.wires[0] & { netId: string },
      ],
    },
  })
}, 'must not define netId')

assertThrows(() => {
  assertValidFrozenSchematicModel({
    ...validModel,
    reusableInterface: {
      ...validModel.reusableInterface,
      netPorts: [
        {
          ...validModel.reusableInterface.netPorts[0],
          portId: 'missing_port',
        },
      ],
    },
  })
}, 'references missing portId')

assertThrows(() => {
  assertValidFrozenSchematicModel({
    ...validModel,
    geometry: {
      ...validModel.geometry,
      powerSymbols: [
        {
          ...validModel.geometry.powerSymbols[0],
          netId: 'net_sig',
        },
      ],
    },
  })
}, 'must attach to a predefined global net')

console.log('Frozen schematic model validation passed.')
