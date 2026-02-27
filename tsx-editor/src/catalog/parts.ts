import { CatalogItem } from '../types/catalog'

// Resistor catalog item
export const ResistorItem: CatalogItem = {
  metadata: {
    id: 'resistor',
    label: 'Resistor',
    kind: 'part',
    category: 'Passive',
    description: 'Standard resistor',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'R1'
      },
      resistance: {
        type: 'string',
        label: 'Resistance',
        default: '10k',
        unit: 'Ω'
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: '0805',
        options: ['0402', '0603', '0805', '1206']
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
      name: 'R1',
      resistance: '10k',
      footprint: '0805',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, resistance, footprint, schX, schY } = props
    return `<resistor name="${name}" resistance="${resistance}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Capacitor catalog item
export const CapacitorItem: CatalogItem = {
  metadata: {
    id: 'capacitor',
    label: 'Capacitor',
    kind: 'part',
    category: 'Passive',
    description: 'Standard capacitor',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'C1'
      },
      capacitance: {
        type: 'string',
        label: 'Capacitance',
        default: '100nF',
        unit: 'F'
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: '0805',
        options: ['0402', '0603', '0805', '1206']
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
      name: 'C1',
      capacitance: '100nF',
      footprint: '0805',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, capacitance, footprint, schX, schY } = props
    return `<capacitor name="${name}" capacitance="${capacitance}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Switch with 4 variants
export const SwitchItem: CatalogItem = {
  metadata: {
    id: 'switch',
    label: 'Switch',
    kind: 'part',
    category: 'Electromechanical',
    description: 'Switch with multiple variants',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'SW1'
      },
      variant: {
        type: 'select',
        label: 'Variant',
        default: 'spst',
        options: ['spst', 'spdt', 'dpst', 'dpdt']
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: 'SMD-SWITCH',
        options: ['SMD-SWITCH', 'THROUGH-HOLE']
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
      name: 'SW1',
      variant: 'spst',
      footprint: 'SMD-SWITCH',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, variant, footprint, schX, schY } = props
    return `<switch name="${name}" variant="${variant}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// LED catalog item
export const LEDItem: CatalogItem = {
  metadata: {
    id: 'led',
    label: 'LED',
    kind: 'part',
    category: 'Semiconductor',
    description: 'Light Emitting Diode',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'LED1'
      },
      color: {
        type: 'select',
        label: 'Color',
        default: 'red',
        options: ['red', 'green', 'blue', 'yellow', 'white']
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: '0805',
        options: ['0603', '0805', '1206', 'LED-3MM', 'LED-5MM']
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
      name: 'LED1',
      color: 'red',
      footprint: '0805',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, color, footprint, schX, schY } = props
    return `<led name="${name}" color="${color}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Chip/IC catalog item
export const ChipItem: CatalogItem = {
  metadata: {
    id: 'chip',
    label: 'IC/Chip',
    kind: 'part',
    category: 'IC',
    description: 'Integrated Circuit',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'U1'
      },
      manufacturerPartNumber: {
        type: 'string',
        label: 'Part Number',
        default: 'ATMEGA328P'
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
      name: 'U1',
      manufacturerPartNumber: 'ATMEGA328P',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, manufacturerPartNumber, schX, schY } = props
    return `<chip name="${name}" manufacturerPartNumber="${manufacturerPartNumber}" schX={${schX}} schY={${schY}} />`
  }
}

// Custom Chip catalog item (configurable pins and names)
export const CustomChipItem: CatalogItem = {
  metadata: {
    id: 'customchip',
    label: 'Custom Chip',
    kind: 'part',
    category: 'IC',
    description: 'Chip with configurable pin count and pin names',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'U1'
      },
      pinCount: {
        type: 'number',
        label: 'Pin Count',
        default: 8
      },
      pinNames: {
        type: 'string',
        label: 'Pin Names (comma-separated)',
        default: ''
      },
      symbolPreset: {
        type: 'select',
        label: 'Symbol Preset',
        default: 'default',
        options: ['default', 'npn-bce-template']
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
      name: 'U1',
      pinCount: 8,
      pinNames: '',
      symbolPreset: 'default',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, pinCount, pinNames, symbolPreset, schX, schY } = props
    return `<chip name="${name}" pinCount={${pinCount}} pinNames="${pinNames || ''}" symbolPreset="${symbolPreset || 'default'}" schX={${schX}} schY={${schY}} />`
  }
}

// Inductor catalog item
export const InductorItem: CatalogItem = {
  metadata: {
    id: 'inductor',
    label: 'Inductor',
    kind: 'part',
    category: 'Passive',
    description: 'Inductor coil',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'L1'
      },
      inductance: {
        type: 'string',
        label: 'Inductance',
        default: '10uH',
        unit: 'H'
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: '0805',
        options: ['0402', '0603', '0805', '1206']
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
      name: 'L1',
      inductance: '10uH',
      footprint: '0805',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, inductance, footprint, schX, schY } = props
    return `<inductor name="${name}" inductance="${inductance}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Diode catalog item
export const DiodeItem: CatalogItem = {
  metadata: {
    id: 'diode',
    label: 'Diode',
    kind: 'part',
    category: 'Semiconductor',
    description: 'Standard diode',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'D1'
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: 'SOD-123',
        options: ['SOD-123', 'SOD-323', 'DO-35']
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
      name: 'D1',
      footprint: 'SOD-123',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, footprint, schX, schY } = props
    return `<diode name="${name}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Transistor catalog item
export const TransistorItem: CatalogItem = {
  metadata: {
    id: 'transistor',
    label: 'Transistor',
    kind: 'part',
    category: 'Semiconductor',
    description: 'Transistor (NPN/PNP)',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'Q1'
      },
      transistorType: {
        type: 'select',
        label: 'Type',
        default: 'npn',
        options: ['npn', 'pnp']
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: 'SOT-23',
        options: ['SOT-23', 'SOT-223', 'TO-92']
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
      name: 'Q1',
      transistorType: 'npn',
      footprint: 'SOT-23',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, transistorType, footprint, schX, schY } = props
    return `<transistor name="${name}" transistorType="${transistorType}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Push Button catalog item
export const PushButtonItem: CatalogItem = {
  metadata: {
    id: 'pushbutton',
    label: 'Push Button',
    kind: 'part',
    category: 'Electromechanical',
    description: 'Momentary push button',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'BTN1'
      },
      footprint: {
        type: 'select',
        label: 'Footprint',
        default: 'SMD-TACTILE',
        options: ['SMD-TACTILE', 'THROUGH-HOLE-4.5MM', 'THROUGH-HOLE-6MM']
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
      name: 'BTN1',
      footprint: 'SMD-TACTILE',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, footprint, schX, schY } = props
    return `<pushbutton name="${name}" footprint="${footprint}" schX={${schX}} schY={${schY}} />`
  }
}

// Pin Header catalog item
export const PinHeaderItem: CatalogItem = {
  metadata: {
    id: 'pinheader',
    label: 'Pin Header',
    kind: 'part',
    category: 'Connector',
    description: 'Pin header connector',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'J1'
      },
      pinCount: {
        type: 'number',
        label: 'Pin Count',
        default: 8
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
      name: 'J1',
      pinCount: 8,
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, pinCount, schX, schY } = props
    return `<pinheader name="${name}" pinCount={${pinCount}} schX={${schX}} schY={${schY}} />`
  }
}

// Test Point catalog item
export const TestPointItem: CatalogItem = {
  metadata: {
    id: 'testpoint',
    label: 'Test Point',
    kind: 'part',
    category: 'Test',
    description: 'Test point for probing',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'TP1'
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
      name: 'TP1',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, schX, schY } = props
    return `<testpoint name="${name}" schX={${schX}} schY={${schY}} />`
  }
}

// Voltage Probe catalog item
export const VoltageProbeItem: CatalogItem = {
  metadata: {
    id: 'voltageprobe',
    label: 'Voltage Probe',
    kind: 'part',
    category: 'Measurement',
    description: 'Voltage probe for measuring potential difference',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'VP1'
      },
      probeType: {
        type: 'select',
        label: 'Probe Type',
        default: 'oscilloscope',
        options: ['oscilloscope', 'multimeter', 'logic-analyzer']
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
      name: 'VP1',
      probeType: 'oscilloscope',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, probeType, schX, schY } = props
    return `<voltageprobe name="${name}" probeType="${probeType}" schX={${schX}} schY={${schY}} />`
  }
}

// Voltage Source catalog item
export const VoltageSourceItem: CatalogItem = {
  metadata: {
    id: 'voltagesource',
    label: 'Voltage Source',
    kind: 'part',
    category: 'Power',
    description: 'Voltage source for powering circuits',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'V1'
      },
      voltage: {
        type: 'string',
        label: 'Voltage',
        default: '5V',
        unit: 'V'
      },
      sourceType: {
        type: 'select',
        label: 'Source Type',
        default: 'battery',
        options: ['battery', 'regulated-supply', 'ac-source']
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
      name: 'V1',
      voltage: '5V',
      sourceType: 'battery',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, voltage, sourceType, schX, schY } = props
    return `<voltagesource name="${name}" voltage="${voltage}" sourceType="${sourceType}" schX={${schX}} schY={${schY}} />`
  }
}
