import { CatalogItem } from '../types/catalog'
import { 
  ResistorItem, 
  CapacitorItem, 
  SwitchItem, 
  LEDItem, 
  ChipItem,
  InductorItem,
  DiodeItem,
  TransistorItem,
  PushButtonItem,
  PinHeaderItem,
  TestPointItem
} from './parts'
import { 
  I2CPullupsItem, 
  LEDWithResistorItem, 
  VoltageDividerItem,
  DecouplingCapItem 
} from './patches'
import {
  TraceItem,
  NetLabelItem,
  NetItem,
  JumperItem,
  SolderJumperItem
} from './connectivity'
import {
  SchematicLineItem,
  SchematicRectItem,
  SchematicCircleItem,
  SchematicArcItem,
  SchematicPathItem,
  SchematicTextItem
} from './primitives'

// Central catalog registry
export const CATALOG: Record<string, CatalogItem> = {
  // Parts
  resistor: ResistorItem,
  capacitor: CapacitorItem,
  inductor: InductorItem,
  diode: DiodeItem,
  led: LEDItem,
  transistor: TransistorItem,
  chip: ChipItem,
  switch: SwitchItem,
  pushbutton: PushButtonItem,
  pinheader: PinHeaderItem,
  testpoint: TestPointItem,
  
  // Connectivity
  trace: TraceItem,
  netlabel: NetLabelItem,
  net: NetItem,
  jumper: JumperItem,
  solderjumper: SolderJumperItem,
  
  // Schematic Primitives
  schematicline: SchematicLineItem,
  schematicrect: SchematicRectItem,
  schematiccircle: SchematicCircleItem,
  schematicarc: SchematicArcItem,
  schematicpath: SchematicPathItem,
  schematictext: SchematicTextItem,
  
  // Patches
  i2c_pullups: I2CPullupsItem,
  led_with_resistor: LEDWithResistorItem,
  voltage_divider: VoltageDividerItem,
  decoupling_cap: DecouplingCapItem,
}

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG[id]
}

export function getAllCatalogItems(): CatalogItem[] {
  return Object.values(CATALOG)
}

export function getCatalogItemsByKind(kind: 'part' | 'patch'): CatalogItem[] {
  return Object.values(CATALOG).filter(item => item.metadata.kind === kind)
}

export function getCatalogItemsByCategory(category: string): CatalogItem[] {
  return Object.values(CATALOG).filter(item => item.metadata.category === category)
}
