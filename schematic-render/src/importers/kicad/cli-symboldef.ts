#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { parseKiCadSymFileToIR } from './kicadSymIR'
import { kicadIRToSymbolDef } from './kicadSymToSymbolDef'

function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('Usage: npm run kicad:symboldef -- <path-to-.kicad_sym>')
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
    const ir = parseKiCadSymFileToIR(content, filename)
    const symbolDefs = ir.symbols.map(kicadIRToSymbolDef)
    console.log(JSON.stringify(symbolDefs, null, 2))
  } catch (err) {
    console.error('Failed to convert KiCad symbols to SymbolDef:', err)
    process.exit(1)
  }
}

main()
