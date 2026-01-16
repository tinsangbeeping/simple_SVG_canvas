#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { parseKiCadSymFileToIR } from './kicadSymIR'
import { kicadIRToSymbolDef } from './kicadSymToSymbolDef'

function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('Usage: npm run kicad:import -- <path-to-.kicad_sym>')
    process.exit(1)
  }
  
  const filePath = args[0]
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  
  const content = fs.readFileSync(filePath, 'utf-8')
  const filename = path.basename(filePath)
  
  try {
    console.error(`[kicad:import] Parsing ${filename}...`)
    const ir = parseKiCadSymFileToIR(content, filename)
    
    console.error(`[kicad:import] Converting ${ir.symbols.length} symbol(s) to SymbolDef...`)
    const symbols = ir.symbols.map(sym => kicadIRToSymbolDef(sym))
    
    // Output standard symbol library format to stdout (JSON only)
    const library = {
      schemaVersion: 1,
      symbols,
    }
    
    console.log(JSON.stringify(library, null, 2))
    console.error(`[kicad:import] ✓ Done`)
  } catch (err) {
    console.error('[kicad:import] Failed to import KiCad symbols:', err)
    process.exit(1)
  }
}

main()
