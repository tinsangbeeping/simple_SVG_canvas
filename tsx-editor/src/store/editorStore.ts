import { create } from 'zustand'
import { FSMap, PlacedComponent, EditorState, WireConnection } from '../types/catalog'

interface EditorStore extends EditorState {
  // Actions
  setFSMap: (fsMap: FSMap) => void
  updateFile: (filePath: string, content: string) => void
  addPlacedComponent: (component: PlacedComponent) => void
  updatePlacedComponent: (id: string, updates: Partial<PlacedComponent>) => void
  removePlacedComponent: (id: string) => void
  setSelectedComponents: (ids: string[]) => void
  toggleComponentSelection: (id: string) => void
  setViewport: (viewport: Partial<EditorState['viewport']>) => void
  startWiring: (componentId: string, pinName: string) => void
  completeWiring: (componentId: string, pinName: string) => void
  cancelWiring: () => void
  removeWire: (wireId: string) => void
  setCursorNearPin: (info: { componentId: string; pinName: string } | null) => void
  createSubcircuit: (name: string, componentIds: string[]) => void
  applyLayout: () => Promise<void>
  regenerateTSX: () => void
}

const DEFAULT_TSX = `import { Board } from '@tscircuit/core'

export default function Circuit() {
  return (
    <board width="50mm" height="50mm">
      {/* Add components here */}
    </board>
  )
}
`

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  fsMap: {
    'main.tsx': DEFAULT_TSX
  },
  selectedComponentIds: [],
  placedComponents: [],
  wires: [],
  wiringStart: null,
  cursorNearPin: null,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  },

  // Actions
  setFSMap: (fsMap) => set({ fsMap }),

  updateFile: (filePath, content) => set((state) => ({
    fsMap: {
      ...state.fsMap,
      [filePath]: content
    }
  })),

  addPlacedComponent: (component) => set((state) => {
    const newComponents = [...state.placedComponents, component]
    // Trigger TSX regeneration
    setTimeout(() => get().regenerateTSX(), 0)
    return { placedComponents: newComponents }
  }),

  updatePlacedComponent: (id, updates) => set((state) => {
    const newComponents = state.placedComponents.map((comp) =>
      comp.id === id ? { ...comp, ...updates } : comp
    )
    // Trigger TSX regeneration
    setTimeout(() => get().regenerateTSX(), 0)
    return { placedComponents: newComponents }
  }),

  removePlacedComponent: (id) => set((state) => {
    const newComponents = state.placedComponents.filter((comp) => comp.id !== id)
    const newSelectedIds = state.selectedComponentIds.filter(selectedId => selectedId !== id)
    setTimeout(() => get().regenerateTSX(), 0)
    return { 
      placedComponents: newComponents,
      selectedComponentIds: newSelectedIds
    }
  }),

  setSelectedComponents: (ids) => set({ selectedComponentIds: ids }),

  toggleComponentSelection: (id) => set((state) => {
    const isSelected = state.selectedComponentIds.includes(id)
    if (isSelected) {
      return { selectedComponentIds: state.selectedComponentIds.filter(selectedId => selectedId !== id) }
    } else {
      return { selectedComponentIds: [...state.selectedComponentIds, id] }
    }
  }),

  setViewport: (viewport) => set((state) => ({
    viewport: { ...state.viewport, ...viewport }
  })),

  setCursorNearPin: (info) => set({ cursorNearPin: info }),

  startWiring: (componentId, pinName) => set({
    wiringStart: { componentId, pinName }
  }),

  completeWiring: (componentId, pinName) => {
    const state = get()
    if (!state.wiringStart) return

    const fromComp = state.placedComponents.find(c => c.id === state.wiringStart!.componentId)
    const toComp = state.placedComponents.find(c => c.id === componentId)

    if (!fromComp || !toComp) return

    const wire: WireConnection = {
      id: `wire-${Date.now()}`,
      from: {
        componentId: state.wiringStart.componentId,
        pinName: state.wiringStart.pinName
      },
      to: {
        componentId,
        pinName
      },
      tsxSnippet: `<trace from=".${fromComp.name} > .${state.wiringStart.pinName}" to=".${toComp.name} > .${pinName}" />`
    }

    set((state) => ({
      wires: [...state.wires, wire],
      wiringStart: null
    }))

    setTimeout(() => get().regenerateTSX(), 0)
  },

  cancelWiring: () => set({ wiringStart: null }),

  removeWire: (wireId) => set((state) => {
    const newWires = state.wires.filter(w => w.id !== wireId)
    setTimeout(() => get().regenerateTSX(), 0)
    return { wires: newWires }
  }),

  createSubcircuit: (name, componentIds) => {
    const state = get()
    const selectedComponents = state.placedComponents.filter(c => componentIds.includes(c.id))
    const relatedWires = state.wires.filter(w => 
      componentIds.includes(w.from.componentId) && componentIds.includes(w.to.componentId)
    )

    // Generate subcircuit TSX
    const componentsTSX = selectedComponents.map(c => `    ${c.tsxSnippet}`).join('\n')
    const wiresTSX = relatedWires.map(w => `    ${w.tsxSnippet}`).join('\n')

    const subcircuitTSX = `export function ${name}(props: { schX?: number; schY?: number }) {
  return (
    <subcircuit name="${name.toLowerCase()}" schX={props.schX} schY={props.schY}>
${componentsTSX}
${wiresTSX}
    </subcircuit>
  )
}
`

    // Save to lib/patches
    const filePath = `lib/patches/${name}.tsx`
    set((state) => ({
      fsMap: {
        ...state.fsMap,
        [filePath]: subcircuitTSX
      }
    }))

    return subcircuitTSX
  },

  applyLayout: async () => {
    const state = get()
    if (state.placedComponents.length === 0) return

    try {
      const { layoutCircuit } = await import('../utils/elkLayout')
      
      // Build edges from wires
      const edges = state.wires.map(w => ({
        from: { componentId: w.from.componentId },
        to: { componentId: w.to.componentId }
      }))

      // Compute layout using ELK
      const positionMap = await layoutCircuit(state.placedComponents, edges)

      // Update all component positions
      const newComponents = state.placedComponents.map(comp => {
        const newPos = positionMap.get(comp.id)
        if (newPos) {
          return {
            ...comp,
            props: {
              ...comp.props,
              schX: newPos.x,
              schY: newPos.y
            }
          }
        }
        return comp
      })

      set({ placedComponents: newComponents })
      
      // Regenerate TSX with new positions
      setTimeout(() => get().regenerateTSX(), 0)
    } catch (error) {
      console.error('Layout failed:', error)
    }
  },

  regenerateTSX: () => {
    const state = get()
    const components = state.placedComponents
    const wires = state.wires
    
    // Generate TSX from placed components
    const componentsTSX = components
      .map((comp) => `      ${comp.tsxSnippet}`)
      .join('\n')

    // Generate TSX from wires
    const wiresTSX = wires
      .map((wire) => `      ${wire.tsxSnippet}`)
      .join('\n')

    const allContent = [componentsTSX, wiresTSX].filter(Boolean).join('\n')

    const newTSX = `import { Board } from '@tscircuit/core'

export default function Circuit() {
  return (
    <board width="50mm" height="50mm">
${allContent || '      {/* Add components here */}'}
    </board>
  )
}
`

    set((state) => ({
      fsMap: {
        ...state.fsMap,
        'main.tsx': newTSX
      }
    }))
  }
}))
