import { CatalogItem } from '../types/catalog'

// I2C Pullup resistors patch
export const I2CPullupsItem: CatalogItem = {
  metadata: {
    id: 'i2c_pullups',
    label: 'I2C Pullups',
    kind: 'patch',
    category: 'Communication',
    description: 'I2C pullup resistors for SCL and SDA',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'i2c_pullups'
      },
      resistance: {
        type: 'string',
        label: 'Resistance',
        default: '4.7k',
        unit: 'Ω'
      },
      schX: {
        type: 'number',
        label: 'X Position',
        default: 0
      },
      schY: {
        type: 'number',
        label: 'Y Position',
        default: 0
      }
    },
    defaultProps: {
      name: 'i2c_pullups',
      resistance: '4.7k',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, resistance, schX, schY } = props
    return `<subcircuit name="${name}" schX={${schX}} schY={${schY}}>
  <resistor name="R1" resistance="${resistance}" />
  <resistor name="R2" resistance="${resistance}" />
  <trace from=".R1 > .pin1" to="net.VCC" />
  <trace from=".R2 > .pin1" to="net.VCC" />
  <trace from=".R1 > .pin2" to="net.SCL" />
  <trace from=".R2 > .pin2" to="net.SDA" />
</subcircuit>`
  }
}

// LED with current limiting resistor
export const LEDWithResistorItem: CatalogItem = {
  metadata: {
    id: 'led_with_resistor',
    label: 'LED + Resistor',
    kind: 'patch',
    category: 'Display',
    description: 'LED with current limiting resistor',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'led_circuit'
      },
      resistance: {
        type: 'string',
        label: 'Resistance',
        default: '330',
        unit: 'Ω'
      },
      ledColor: {
        type: 'select',
        label: 'LED Color',
        default: 'red',
        options: ['red', 'green', 'blue', 'yellow', 'white']
      },
      schX: {
        type: 'number',
        label: 'X Position',
        default: 0
      },
      schY: {
        type: 'number',
        label: 'Y Position',
        default: 0
      }
    },
    defaultProps: {
      name: 'led_circuit',
      resistance: '330',
      ledColor: 'red',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, resistance, ledColor, schX, schY } = props
    return `<subcircuit name="${name}" schX={${schX}} schY={${schY}}>
  <resistor name="R1" resistance="${resistance}" />
  <led name="LED1" color="${ledColor}" />
  <trace from=".R1 > .pin2" to=".LED1 > .anode" />
</subcircuit>`
  }
}

// Voltage divider patch
export const VoltageDividerItem: CatalogItem = {
  metadata: {
    id: 'voltage_divider',
    label: 'Voltage Divider',
    kind: 'patch',
    category: 'Power',
    description: 'Two resistor voltage divider',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'voltage_divider'
      },
      r1: {
        type: 'string',
        label: 'R1',
        default: '10k',
        unit: 'Ω'
      },
      r2: {
        type: 'string',
        label: 'R2',
        default: '10k',
        unit: 'Ω'
      },
      schX: {
        type: 'number',
        label: 'X Position',
        default: 0
      },
      schY: {
        type: 'number',
        label: 'Y Position',
        default: 0
      }
    },
    defaultProps: {
      name: 'voltage_divider',
      r1: '10k',
      r2: '10k',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, r1, r2, schX, schY } = props
    return `<subcircuit name="${name}" schX={${schX}} schY={${schY}}>
  <resistor name="R1" resistance="${r1}" />
  <resistor name="R2" resistance="${r2}" />
  <trace from=".R1 > .pin2" to=".R2 > .pin1" />
  <trace from=".R1 > .pin1" to="net.VIN" />
  <trace from=".R2 > .pin2" to="net.GND" />
  <netlabel net="VOUT" at=".R1 > .pin2" />
</subcircuit>`
  }
}

// Decoupling capacitor patch
export const DecouplingCapItem: CatalogItem = {
  metadata: {
    id: 'decoupling_cap',
    label: 'Decoupling Cap',
    kind: 'patch',
    category: 'Power',
    description: 'Decoupling capacitor between VCC and GND',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'decoupling'
      },
      capacitance: {
        type: 'string',
        label: 'Capacitance',
        default: '100nF',
        unit: 'F'
      },
      schX: {
        type: 'number',
        label: 'X Position',
        default: 0
      },
      schY: {
        type: 'number',
        label: 'Y Position',
        default: 0
      }
    },
    defaultProps: {
      name: 'decoupling',
      capacitance: '100nF',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, capacitance, schX, schY } = props
    return `<subcircuit name="${name}" schX={${schX}} schY={${schY}}>
  <capacitor name="C1" capacitance="${capacitance}" />
  <trace from=".C1 > .pin1" to="net.VCC" />
  <trace from=".C1 > .pin2" to="net.GND" />
</subcircuit>`
  }
}
