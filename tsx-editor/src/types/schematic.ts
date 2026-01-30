// Pin configuration for different component types

export interface PinConfig {
  name: string
  x: number  // relative to component
  y: number
  side: 'left' | 'right' | 'top' | 'bottom'
}

export interface ComponentSchematic {
  width: number
  height: number
  pins: PinConfig[]
  symbol: string // SVG path or type
}

// Define schematic representations for each component type
export const COMPONENT_SCHEMATICS: Record<string, ComponentSchematic> = {
  resistor: {
    width: 60,
    height: 20,
    pins: [
      { name: 'pin1', x: 0, y: 10, side: 'left' },
      { name: 'pin2', x: 60, y: 10, side: 'right' }
    ],
    symbol: 'resistor'
  },
  capacitor: {
    width: 40,
    height: 30,
    pins: [
      { name: 'pin1', x: 20, y: 0, side: 'top' },
      { name: 'pin2', x: 20, y: 30, side: 'bottom' }
    ],
    symbol: 'capacitor'
  },
  inductor: {
    width: 60,
    height: 20,
    pins: [
      { name: 'pin1', x: 0, y: 10, side: 'left' },
      { name: 'pin2', x: 60, y: 10, side: 'right' }
    ],
    symbol: 'inductor'
  },
  diode: {
    width: 40,
    height: 40,
    pins: [
      { name: 'anode', x: 0, y: 20, side: 'left' },
      { name: 'cathode', x: 40, y: 20, side: 'right' }
    ],
    symbol: 'diode'
  },
  led: {
    width: 40,
    height: 40,
    pins: [
      { name: 'anode', x: 0, y: 20, side: 'left' },
      { name: 'cathode', x: 40, y: 20, side: 'right' }
    ],
    symbol: 'led'
  },
  transistor: {
    width: 50,
    height: 60,
    pins: [
      { name: 'base', x: 0, y: 30, side: 'left' },
      { name: 'collector', x: 50, y: 10, side: 'right' },
      { name: 'emitter', x: 50, y: 50, side: 'right' }
    ],
    symbol: 'transistor'
  },
  chip: {
    width: 80,
    height: 100,
    pins: [
      { name: 'pin1', x: 0, y: 20, side: 'left' },
      { name: 'pin2', x: 0, y: 40, side: 'left' },
      { name: 'pin3', x: 0, y: 60, side: 'left' },
      { name: 'pin4', x: 0, y: 80, side: 'left' },
      { name: 'pin5', x: 80, y: 20, side: 'right' },
      { name: 'pin6', x: 80, y: 40, side: 'right' },
      { name: 'pin7', x: 80, y: 60, side: 'right' },
      { name: 'pin8', x: 80, y: 80, side: 'right' }
    ],
    symbol: 'chip'
  },
  switch: {
    width: 50,
    height: 30,
    pins: [
      { name: 'pin1', x: 0, y: 15, side: 'left' },
      { name: 'pin2', x: 50, y: 15, side: 'right' }
    ],
    symbol: 'switch'
  },
  pushbutton: {
    width: 40,
    height: 40,
    pins: [
      { name: 'pin1', x: 10, y: 0, side: 'top' },
      { name: 'pin2', x: 30, y: 0, side: 'top' },
      { name: 'pin3', x: 10, y: 40, side: 'bottom' },
      { name: 'pin4', x: 30, y: 40, side: 'bottom' }
    ],
    symbol: 'pushbutton'
  },
  pinheader: {
    width: 40,
    height: 80,
    pins: [
      { name: 'pin1', x: 0, y: 10, side: 'left' },
      { name: 'pin2', x: 0, y: 20, side: 'left' },
      { name: 'pin3', x: 0, y: 30, side: 'left' },
      { name: 'pin4', x: 0, y: 40, side: 'left' },
      { name: 'pin5', x: 0, y: 50, side: 'left' },
      { name: 'pin6', x: 0, y: 60, side: 'left' },
      { name: 'pin7', x: 0, y: 70, side: 'left' },
      { name: 'pin8', x: 0, y: 80, side: 'left' }
    ],
    symbol: 'pinheader'
  },
  testpoint: {
    width: 20,
    height: 20,
    pins: [
      { name: 'pin1', x: 10, y: 10, side: 'top' }
    ],
    symbol: 'testpoint'
  }
}

export function getPinConfig(componentType: string): ComponentSchematic | undefined {
  return COMPONENT_SCHEMATICS[componentType]
}

export function getPinPosition(
  componentType: string,
  pinName: string,
  componentX: number,
  componentY: number
): { x: number; y: number } | null {
  const schematic = COMPONENT_SCHEMATICS[componentType]
  if (!schematic) return null

  const pin = schematic.pins.find(p => p.name === pinName)
  if (!pin) return null

  return {
    x: componentX + pin.x,
    y: componentY + pin.y
  }
}
