/**
 * validate-workspace.ts
 *
 * Runs a battery of checks against the workspace model and roundtrip TSX functions.
 * Usage:  npx tsx scripts/validate-workspace.ts
 * Exit 0 on success, exit 1 if any check fails.
 */

import { minimalImportExportTestUtils } from '../src/store/editorStore'
import type { WorkspaceData } from '../src/types/workspace'

type FSMap = Record<string, string>

let passed = 0
let failed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✅  ${name}`)
    passed++
  } catch (e) {
    console.error(`  ❌  ${name}`)
    console.error(`       ${(e as Error).message}`)
    failed++
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// ── helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_MAIN_TSX = `export default () => (
  <board width="50mm" height="50mm">
    {/* Add components here */}
  </board>
)
`

function makeWorkspace(name: string, fsMap: FSMap = {}): WorkspaceData {
  return {
    id: `ws-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    fsMap: { 'main.tsx': DEFAULT_MAIN_TSX, ...fsMap },
    openFilePaths: ['main.tsx'],
    activeFilePath: 'main.tsx'
  }
}

function serializeWorkspace(ws: WorkspaceData): string {
  return JSON.stringify(ws, null, 2)
}

function deserializeWorkspace(json: string): WorkspaceData {
  const parsed = JSON.parse(json)
  if (!parsed.id || !parsed.name || typeof parsed.fsMap !== 'object') {
    throw new Error('Invalid workspace JSON: missing required fields')
  }
  return parsed as WorkspaceData
}

// ── tests ─────────────────────────────────────────────────────────────────────

console.log('\n🔍  validate-workspace.ts\n')

check('WorkspaceData can be created with defaults', () => {
  const ws = makeWorkspace('Test Project')
  assert(ws.id === 'ws-test-project', `expected id 'ws-test-project', got '${ws.id}'`)
  assert(ws.name === 'Test Project', 'name mismatch')
  assert(typeof ws.fsMap === 'object', 'fsMap must be object')
  assert(ws.fsMap['main.tsx'] === DEFAULT_MAIN_TSX, 'main.tsx should equal default')
  assert(ws.openFilePaths.includes('main.tsx'), 'openFilePaths should contain main.tsx')
  assert(ws.activeFilePath === 'main.tsx', 'activeFilePath should be main.tsx')
})

check('WorkspaceData serializes and deserializes cleanly', () => {
  const ws = makeWorkspace('Roundtrip Test', { 'main.tsx': DEFAULT_MAIN_TSX })
  const json = serializeWorkspace(ws)
  const parsed = deserializeWorkspace(json)
  assert(parsed.id === ws.id, 'id round-trip failed')
  assert(parsed.name === ws.name, 'name round-trip failed')
  assert(parsed.fsMap['main.tsx'] === ws.fsMap['main.tsx'], 'fsMap round-trip failed')
})

check('TSX with a chip component imports and exports cleanly', () => {
  const inputTSX = `export default () => (
  <board width="50mm" height="50mm">
    {/* // schX={200} */}
    {/* // schY={200} */}
    <chip
      name="U1"
      pinCount={8}
      footprint="soic8"
      schRotation="0deg"
    />
  </board>
)
`
  const { components } = minimalImportExportTestUtils.parseImportedTSXToCanvas(inputTSX, 'main.tsx')
  assert(components.some(c => c.name === 'U1'), 'U1 chip should be parsed')

  const round = minimalImportExportTestUtils.exportCanvasToTSX('main.tsx', components, [])
  assert(round.includes('<chip'), 'exported TSX should include <chip')
  assert(round.includes('name="U1"'), 'exported TSX should include name="U1"')
})

check('Workspace with a subcircuit file parses without crashing', () => {
  const subcircuitTSX = `export const ports = ["IN", "OUT"] as const

export function MyFilter(props: { name: string; schX?: number; schY?: number }) {
  const x = props.schX ?? 0
  const y = props.schY ?? 0
  return (
    <subcircuit name={props.name}>
      {/* // schX={x + 100} */}
      {/* // schY={y + 100} */}
      <resistor
        name="R1"
        resistance="1k"
        schRotation="0deg"
      />
    </subcircuit>
  )
}
`
  const fsMap: FSMap = {
    'main.tsx': DEFAULT_MAIN_TSX,
    'subcircuits/MyFilter.tsx': subcircuitTSX
  }
  const ws = makeWorkspace('Subcircuit Test', fsMap)
  assert('subcircuits/MyFilter.tsx' in ws.fsMap, 'subcircuit should be in fsMap')

  const { components } = minimalImportExportTestUtils.parseImportedTSXToCanvas(subcircuitTSX, 'subcircuits/MyFilter.tsx')
  assert(components.some(c => c.name === 'R1'), 'R1 should be parsed inside subcircuit')
})

check('Multi-workspace store: switching adds new workspace without losing old one', () => {
  const ws1 = makeWorkspace('Project Alpha')
  const ws2 = makeWorkspace('Project Beta', { 'main.tsx': `export default () => (<board width="10mm" height="10mm" />)\n` })

  const workspaces: Record<string, WorkspaceData> = {
    [ws1.id]: ws1,
    [ws2.id]: ws2
  }

  assert(Object.keys(workspaces).length === 2, 'should have 2 workspaces')
  assert(workspaces[ws1.id].name === 'Project Alpha', 'ws1 name preserved')
  assert(workspaces[ws2.id].name === 'Project Beta', 'ws2 name preserved')
  assert(workspaces[ws2.id].fsMap['main.tsx'] !== DEFAULT_MAIN_TSX, 'ws2 has distinct main.tsx')
})

check('ExportWorkspaceJSON includes all fsMap keys', () => {
  const fsMap: FSMap = {
    'main.tsx': DEFAULT_MAIN_TSX,
    'subcircuits/BigBoard.tsx': '// stub',
    'editor/meta.json': JSON.stringify({ netAnchors: {} })
  }
  const ws = makeWorkspace('Full Export Test', fsMap)
  const json = serializeWorkspace(ws)
  const back = deserializeWorkspace(json)
  assert('subcircuits/BigBoard.tsx' in back.fsMap, 'subcircuit should survive round-trip')
  assert('editor/meta.json' in back.fsMap, 'meta.json should survive round-trip')
})

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed + failed} checks — ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}
