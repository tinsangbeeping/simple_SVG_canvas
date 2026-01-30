# TSX Schematic Editor

A modern, TSX-first schematic editor for circuit design. This editor treats TSX files as the single source of truth, enabling a clean, component-based approach to circuit design.

## Core Concepts

### 1. TSX as Source of Truth
- The project is stored as TSX files, not JSON
- `main.tsx` contains your circuit design
- `lib/parts/*.tsx` contains reusable component definitions
- `lib/patches/*.tsx` contains reusable subcircuit modules

### 2. Catalog System
- **Parts**: Individual components (resistors, capacitors, switches, ICs)
- **Patches**: Reusable subcircuits (I2C pullups, voltage dividers, etc.)
- Each catalog item includes:
  - Metadata (label, kind, description)
  - Editable properties schema
  - Default values
  - TSX emission function

### 3. Component Properties
All component parameters are stored as props in TSX:
```tsx
<resistor name="R1" resistance="10k" schX={20} schY={30} />
<switch name="SW1" variant="spst" schX={50} schY={40} />
```

### 4. Subcircuits (Patches)
Group related components into reusable modules:
```tsx
<subcircuit name="i2c_pullups">
  <resistor name="R1" resistance="4.7k" />
  <resistor name="R2" resistance="4.7k" />
  <trace from=".R1 > .pin1" to="net.VCC" />
  <trace from=".R2 > .pin1" to="net.VCC" />
</subcircuit>
```

## Features

### ✅ Implemented

1. **Catalog System**
   - Parts catalog with resistors, capacitors, switches, LEDs, ICs
   - Patches catalog with I2C pullups, LED circuits, voltage dividers, etc.
   - Drag and drop from catalog to canvas

2. **Canvas**
   - Grid-based layout
   - Drag to place components
   - Drag to reposition components
   - Grid snapping (20px grid)
   - Pan and zoom viewport
   - Visual selection feedback

3. **Property Editor**
   - Editable properties for selected components
   - Support for string, number, select, and boolean types
   - Real-time TSX regeneration
   - Delete component function

4. **TSX Generation**
   - Automatic TSX code generation from placed components
   - Real-time updates as components are added/edited
   - Export to file or copy to clipboard

5. **Switch Variants**
   - 4 switch types: SPST, SPDT, DPST, DPDT
   - Selectable via dropdown in properties panel

6. **TSX Manipulation Engine**
   - AST-based parsing and editing
   - Update component props programmatically
   - Insert/remove components from TSX
   - Preserve code structure

## Project Structure

```
tsx-editor/
├── src/
│   ├── catalog/           # Component catalog
│   │   ├── parts.ts       # Individual component definitions
│   │   ├── patches.ts     # Subcircuit definitions
│   │   └── index.ts       # Catalog registry
│   ├── components/        # React UI components
│   │   ├── Canvas.tsx     # Main canvas with drag/drop
│   │   ├── CatalogPanel.tsx
│   │   ├── PropertiesPanel.tsx
│   │   ├── Header.tsx
│   │   └── CodeView.tsx
│   ├── store/            # State management
│   │   └── editorStore.ts # Zustand store
│   ├── types/            # TypeScript types
│   │   └── catalog.ts    # Core type definitions
│   ├── utils/            # Utilities
│   │   └── tsxManipulator.ts  # AST manipulation
│   ├── lib/              # Example library
│   │   ├── parts/        # Custom parts
│   │   └── patches/      # Custom patches
│   ├── examples/         # Example circuits
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Getting Started

### Installation

```bash
cd tsx-editor
npm install
```

### Development

```bash
npm run dev
```

The editor will open at http://localhost:3000

### Usage

1. **Place Components**
   - Drag components from the left catalog panel
   - Drop on canvas to place
   - Components snap to 20px grid

2. **Edit Properties**
   - Click a component to select it
   - Edit properties in the right panel
   - Changes update TSX in real-time

3. **Reposition Components**
   - Drag placed components to move them
   - Coordinates update in TSX automatically

4. **View/Export Code**
   - See generated TSX in code view at bottom right
   - Click "Copy TSX" to copy to clipboard
   - Click "Export" to download as file

## Adding New Catalog Items

### Example: Adding a New Part

```typescript
// In src/catalog/parts.ts
export const MyNewPart: CatalogItem = {
  metadata: {
    id: 'my_part',
    label: 'My Part',
    kind: 'part',
    category: 'Custom',
    description: 'Description here',
    editablePropsSchema: {
      name: {
        type: 'string',
        label: 'Name',
        default: 'P1'
      },
      value: {
        type: 'string',
        label: 'Value',
        default: '100'
      }
    },
    defaultProps: {
      name: 'P1',
      value: '100',
      schX: 0,
      schY: 0
    }
  },
  emitTSX: (props) => {
    return `<my-part name="${props.name}" value="${props.value}" schX={${props.schX}} schY={${props.schY}} />`
  }
}

// Register in catalog/index.ts
import { MyNewPart } from './parts'
export const CATALOG = {
  // ...existing items
  my_part: MyNewPart
}
```

### Example: Adding a New Patch

```typescript
// In src/catalog/patches.ts
export const MyPatch: CatalogItem = {
  metadata: {
    id: 'my_patch',
    label: 'My Patch',
    kind: 'patch',
    category: 'Custom',
    editablePropsSchema: {
      name: { type: 'string', label: 'Name', default: 'my_circuit' },
      param1: { type: 'string', label: 'Parameter', default: '10k' }
    },
    defaultProps: {
      name: 'my_circuit',
      param1: '10k'
    }
  },
  emitTSX: (props) => {
    return `<subcircuit name="${props.name}">
  <resistor name="R1" resistance="${props.param1}" />
  {/* Add more components */}
</subcircuit>`
  }
}
```

## Architecture Principles

### 1. TSX is the Single Source of Truth
- No hidden JSON state
- All circuit information is in TSX
- Editor metadata (selection, viewport) is separate from circuit data

### 2. Catalog-Based Design
- Components are defined declaratively
- Each item knows how to emit TSX
- Property schemas drive UI generation

### 3. Incremental TSX Manipulation
- Start simple: string concatenation
- Upgrade to AST editing for robustness
- Preserve user formatting when possible

### 4. Separation of Concerns
- Catalog = component definitions
- Store = editor state + actions
- Components = UI presentation
- Utils = TSX manipulation logic

## Future Enhancements

Potential additions:
- Wire/trace visual editor
- Net highlighting
- Component library import system
- Preview rendering (SVG/schematic view)
- Undo/redo
- Multi-file project support
- Collaborative editing
- Component search/filter
- Keyboard shortcuts
- Auto-routing

## License

MIT
