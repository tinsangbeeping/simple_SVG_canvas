import { minimalImportExportTestUtils } from '../src/store/editorStore'

const cases = [
  {
    id: 'check-1: net-to-net merge',
    source: `<net name="GND" />\n<net name="VCC" />\n<trace from="net.GND" to="net.VCC" />`
  },
  {
    id: 'check-2: merged net reused by pins',
    source: [
      '<chip name="U1" pinCount={8} footprint="soic8" />',
      '<chip name="U2" pinCount={8} footprint="soic8" />',
      '<net name="GND" />',
      '<net name="VCC" />',
      '<trace from=".U1 > .pin1" to="net.GND" />',
      '<trace from=".U2 > .pin2" to="net.VCC" />',
      '<trace from="net.GND" to="net.VCC" />'
    ].join('\n')
  },
  {
    id: 'check-3: round-trip stability',
    source: [
      '<chip name="U1" pinCount={8} footprint="soic8" />',
      '<chip name="U2" pinCount={8} footprint="soic8" />',
      '<net name="GND" />',
      '<net name="VCC" />',
      '<trace from=".U1 > .pin1" to="net.GND" />',
      '<trace from=".U2 > .pin2" to="net.VCC" />',
      '<trace from="net.GND" to="net.VCC" />'
    ].join('\n')
  }
]

for (const c of cases) {
  console.log(`\n=== ${c.id} ===`)
  const p1 = minimalImportExportTestUtils.parseImportedTSXToCanvas(c.source, 'main.tsx')
  const exp1 = minimalImportExportTestUtils.exportCanvasToTSX('main.tsx', p1.components, p1.wires)
  const inner = exp1.replace(/^[\s\S]*?<board[^>]*>\s*/m, '').replace(/\s*<\/board>[\s\S]*$/m, '').trim()
  console.log('Export1 (inner):\n' + inner)

  if (c.id.startsWith('check-3')) {
    const p2 = minimalImportExportTestUtils.parseImportedTSXToCanvas(exp1, 'main.tsx')
    const exp2 = minimalImportExportTestUtils.exportCanvasToTSX('main.tsx', p2.components, p2.wires)
    const inner2 = exp2.replace(/^[\s\S]*?<board[^>]*>\s*/m, '').replace(/\s*<\/board>[\s\S]*$/m, '').trim()
    console.log('\nExport2 after re-import (inner):\n' + inner2)
    console.log('\nIdentical?', inner === inner2)
  }
}
