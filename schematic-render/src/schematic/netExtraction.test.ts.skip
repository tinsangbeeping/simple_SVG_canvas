import { describe, it, expect } from 'vitest'
import { extractNets } from '../schematic/netExtraction'
import type { SchematicDoc } from '../schematic/types'

describe('netExtraction', () => {
  it('should extract nets from a simple circuit', () => {
    const doc: SchematicDoc = {
      schemaVersion: 1,
      instances: [
        { id: 'r1', symbolId: 'R', pos: { x: 100, y: 100 }, rotDeg: 0 },
        { id: 'r2', symbolId: 'R', pos: { x: 200, y: 100 }, rotDeg: 0 },
        { id: 'gnd', symbolId: 'GND', pos: { x: 150, y: 200 }, rotDeg: 0 },
      ],
      wires: [
        { id: 'w1', a: { instId: 'r1', pinName: '2' }, b: { instId: 'r2', pinName: '1' } },
        { id: 'w2', a: { instId: 'r2', pinName: '2' }, b: { instId: 'gnd', pinName: '1' } },
      ],
    }

    const circuit = extractNets(doc)

    expect(circuit.type).toBe('circuit.v1')
    expect(circuit.components).toHaveLength(3)
    
    // Check components have refs
    expect(circuit.components[0].ref).toBe('R1')
    expect(circuit.components[0].symbolId).toBe('R')
    expect(circuit.components[1].ref).toBe('R2')
    expect(circuit.components[2].ref).toBe('GND')

    // Check nets
    expect(circuit.nets.length).toBeGreaterThan(0)
    
    // Find GND net
    const gndNet = circuit.nets.find(n => n.name === 'GND')
    expect(gndNet).toBeDefined()
    expect(gndNet?.nodes).toContainEqual({ ref: 'GND', pin: '1' })
    expect(gndNet?.nodes).toContainEqual({ ref: 'R2', pin: '2' })

    // Find NET between R1 and R2
    const net1 = circuit.nets.find(n => n.name.startsWith('NET'))
    expect(net1).toBeDefined()
    expect(net1?.nodes).toContainEqual({ ref: 'R1', pin: '2' })
    expect(net1?.nodes).toContainEqual({ ref: 'R2', pin: '1' })
  })

  it('should handle unconnected pins', () => {
    const doc: SchematicDoc = {
      schemaVersion: 1,
      instances: [
        { id: 'r1', symbolId: 'R', pos: { x: 100, y: 100 }, rotDeg: 0 },
        { id: 'r2', symbolId: 'R', pos: { x: 200, y: 100 }, rotDeg: 0 },
      ],
      wires: [],
    }

    const circuit = extractNets(doc)

    expect(circuit.type).toBe('circuit.v1')
    expect(circuit.components).toHaveLength(2)
    // No nets since nothing is connected
    expect(circuit.nets).toHaveLength(0)
  })

  it('should auto-generate refs for multiple components of same type', () => {
    const doc: SchematicDoc = {
      schemaVersion: 1,
      instances: [
        { id: 'r1', symbolId: 'R', pos: { x: 100, y: 100 }, rotDeg: 0 },
        { id: 'r2', symbolId: 'R', pos: { x: 200, y: 100 }, rotDeg: 0 },
        { id: 'r3', symbolId: 'R', pos: { x: 300, y: 100 }, rotDeg: 0 },
        { id: 'c1', symbolId: 'C', pos: { x: 150, y: 200 }, rotDeg: 0 },
        { id: 'c2', symbolId: 'C', pos: { x: 250, y: 200 }, rotDeg: 0 },
      ],
      wires: [],
    }

    const circuit = extractNets(doc)

    const refs = circuit.components.map(c => c.ref)
    expect(refs).toContain('R1')
    expect(refs).toContain('R2')
    expect(refs).toContain('R3')
    expect(refs).toContain('C1')
    expect(refs).toContain('C2')
  })

  it('should name nets after power symbols', () => {
    const doc: SchematicDoc = {
      schemaVersion: 1,
      instances: [
        { id: 'r1', symbolId: 'R', pos: { x: 100, y: 100 }, rotDeg: 0 },
        { id: 'vcc', symbolId: 'VCC', pos: { x: 100, y: 50 }, rotDeg: 0 },
        { id: 'gnd', symbolId: 'GND', pos: { x: 100, y: 150 }, rotDeg: 0 },
      ],
      wires: [
        { id: 'w1', a: { instId: 'r1', pinName: '1' }, b: { instId: 'vcc', pinName: '1' } },
        { id: 'w2', a: { instId: 'r1', pinName: '2' }, b: { instId: 'gnd', pinName: '1' } },
      ],
    }

    const circuit = extractNets(doc)

    const netNames = circuit.nets.map(n => n.name)
    expect(netNames).toContain('VCC')
    expect(netNames).toContain('GND')
  })
})
