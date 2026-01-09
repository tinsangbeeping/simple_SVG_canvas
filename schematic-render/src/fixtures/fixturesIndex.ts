import type { SymbolDef } from "../symbol-dsl/types"
import type { SchematicDoc } from "../schematic/types"

// Primitive tests
import line from "./symbols/primitives/00_line.json"
import rect from "./symbols/primitives/01_rect.json"
import circle from "./symbols/primitives/02_circle.json"
import arc from "./symbols/primitives/03_arc.json"
import text from "./symbols/primitives/04_text.json"
import polyline from "./symbols/primitives/05_polyline.json"
import allPrimitives from "./symbols/primitives/10_all_primitives.json"
import badBboxTooSmall from "./symbols/primitives/20_bad_bbox_too_small.json"
import noBbox from "./symbols/primitives/21_no_bbox.json"

// Baseline symbols (real components)
import mcu from "./symbols/mcu_example.json"
import led from "./symbols/led.json"
import capacitor from "./symbols/capacitor.json"
import transistorNpn from "./symbols/transistor_npn.json"

// Schematic examples
import exampleResistorsWithGnd from "./schematics/00_example_resistors_with_gnd.json"
import exampleWithRotation from "./schematics/01_example_with_rotation.json"

export type FixtureSymbol = {
  id: string
  name: string
  category: "primitives" | "baseline"
  symbolDef: SymbolDef
}

export type FixtureSchematic = {
  id: string
  name: string
  description: string
  schematicDoc: SchematicDoc
}

export const symbolFixtures: FixtureSymbol[] = [
  // Baseline symbols (real components)
  { id: "mcu", name: "MCU (STM32F4)", category: "baseline", symbolDef: mcu as SymbolDef },
  { id: "led", name: "LED", category: "baseline", symbolDef: led as SymbolDef },
  { id: "capacitor", name: "Capacitor", category: "baseline", symbolDef: capacitor as SymbolDef },
  { id: "transistor_npn", name: "Transistor NPN", category: "baseline", symbolDef: transistorNpn as SymbolDef },
  
  // Primitives (for testing)
  { id: "line", name: "Line Test", category: "primitives", symbolDef: line as SymbolDef },
  { id: "rect", name: "Rectangle Test", category: "primitives", symbolDef: rect as SymbolDef },
  { id: "circle", name: "Circle Test", category: "primitives", symbolDef: circle as SymbolDef },
  { id: "arc", name: "Arc Test", category: "primitives", symbolDef: arc as SymbolDef },
  { id: "text", name: "Text Test", category: "primitives", symbolDef: text as SymbolDef },
  { id: "polyline", name: "Polyline Test", category: "primitives", symbolDef: polyline as SymbolDef },
  { id: "all", name: "All Primitives", category: "primitives", symbolDef: allPrimitives as SymbolDef },
  { id: "bad_bbox", name: "Bad BBox (too small)", category: "primitives", symbolDef: badBboxTooSmall as SymbolDef },
  { id: "no_bbox", name: "No BBox", category: "primitives", symbolDef: noBbox as SymbolDef },
]

export const schematicFixtures: FixtureSchematic[] = [
  {
    id: "resistors_gnd",
    name: "Resistors with GND",
    description: "Two resistors connected to ground",
    schematicDoc: exampleResistorsWithGnd as SchematicDoc,
  },
  {
    id: "with_rotation",
    name: "Circuit with Rotation",
    description: "Three resistors with 90° rotation example",
    schematicDoc: exampleWithRotation as SchematicDoc,
  },
]
