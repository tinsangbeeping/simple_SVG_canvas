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
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, variant, schX, schY } = props
    return `<switch name="${name}" variant="${variant}" schX={${schX}} schY={${schY}} />`
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
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, color, schX, schY } = props
    return `<led name="${name}" color="${color}" schX={${schX}} schY={${schY}} />`
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
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, schX, schY } = props
    return `<diode name="${name}" schX={${schX}} schY={${schY}} />`
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
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, transistorType, schX, schY } = props
    return `<transistor name="${name}" transistorType="${transistorType}" schX={${schX}} schY={${schY}} />`
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
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    const { name, schX, schY } = props
    return `<pushbutton name="${name}" schX={${schX}} schY={${schY}} />`
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
