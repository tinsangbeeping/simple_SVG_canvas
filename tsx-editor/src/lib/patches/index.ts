import { PatchDefinition, SubcircuitRegistry } from '../../types/project'

export const BUILTIN_PATCHES: PatchDefinition[] = [
  {
    id: 'debounce-button-led',
    name: 'Debounce Button',
    description: 'Insert a debounce button block and a debounce LED block with default wiring.',
    components: [
      { type: 'Deb_button_test2', instanceName: 'BTN1', schX: 120, schY: 140 },
      { type: 'Debounce_led', instanceName: 'LED1', schX: 320, schY: 140 }
    ],
    wiring: [
      { from: '.BTN1 > .OUT', to: '.LED1 > .IN' }
    ],
    layout: {
      offsetX: 0,
      offsetY: 0
    }
  }
]

export const getApplicablePatches = (registry: SubcircuitRegistry): PatchDefinition[] => {
  return BUILTIN_PATCHES.filter((patch) =>
    patch.components.every((component) => {
      const name = typeof component === 'string' ? component : component.subcircuit
      return !!registry[name]
    })
  )
}
