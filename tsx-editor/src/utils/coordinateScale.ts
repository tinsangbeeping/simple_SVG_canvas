export const SCHEMATIC_COORD_SCALE = 20

export const pixelToSchematic = (pixelValue: number): number => pixelValue / SCHEMATIC_COORD_SCALE

export const schematicToPixel = (schematicValue: number): number => schematicValue * SCHEMATIC_COORD_SCALE
