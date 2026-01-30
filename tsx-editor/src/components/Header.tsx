import React, { useState } from 'react'
import { useEditorStore } from '../store/editorStore'

export const Header: React.FC = () => {
  const { fsMap, placedComponents, wires, applyLayout } = useEditorStore()
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportName, setExportName] = useState('MyComponent')
  const [isLayouting, setIsLayouting] = useState(false)

  const handleExport = () => {
    const mainTsx = fsMap['main.tsx']
    const blob = new Blob([mainTsx], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'main.tsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = () => {
    const mainTsx = fsMap['main.tsx']
    navigator.clipboard.writeText(mainTsx)
    alert('TSX copied to clipboard!')
  }

  const handleExportAsComponent = () => {
    if (!exportName) return

    // Get all components and wires
    const componentsTSX = placedComponents.map(c => `      ${c.tsxSnippet}`).join('\n')
    const wiresTSX = wires.map(w => `      ${w.tsxSnippet}`).join('\n')
    const allContent = [componentsTSX, wiresTSX].filter(Boolean).join('\n')

    const exportedTSX = `import React from 'react'

export function ${exportName}(props: { schX?: number; schY?: number }) {
  return (
    <subcircuit name="${exportName.toLowerCase()}" schX={props.schX} schY={props.schY}>
${allContent}
    </subcircuit>
  )
}

// Usage example:
// <${exportName} schX={0} schY={0} />
`

    const blob = new Blob([exportedTSX], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportName}.tsx`
    a.click()
    URL.revokeObjectURL(url)
    
    setShowExportDialog(false)
    alert(`Component exported as ${exportName}.tsx`)
  }

  const handleAutoLayout = async () => {
    setIsLayouting(true)
    try {
      await applyLayout()
      alert('Layout applied successfully!')
    } catch (error) {
      alert('Layout failed: ' + (error as Error).message)
    } finally {
      setIsLayouting(false)
    }
  }

  return (
    <div className="editor-header">
      <h1>TSX Schematic Editor</h1>
      <div className="editor-header-actions">
        <button 
          className="btn btn-secondary" 
          onClick={handleAutoLayout}
          disabled={isLayouting || placedComponents.length === 0}
          title="Automatically arrange components using ELK layout engine"
        >
          {isLayouting ? 'Layouting...' : 'Auto Layout'}
        </button>
        <button className="btn btn-secondary" onClick={handleCopy}>
          Copy TSX
        </button>
        <button className="btn btn-secondary" onClick={handleExport}>
          Export Circuit
        </button>
        <button className="btn btn-primary" onClick={() => setShowExportDialog(true)}>
          Export as Component
        </button>
      </div>

      {showExportDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2d2d2d',
            padding: 30,
            borderRadius: 8,
            minWidth: 400,
            border: '1px solid #3e3e3e'
          }}>
            <h2 style={{ marginBottom: 20, fontSize: 18 }}>Export as Reusable Component</h2>
            
            <div style={{ marginBottom: 20 }}>
              <label className="property-label">Component Name</label>
              <input
                type="text"
                className="property-input"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="MyComponent"
                style={{ fontSize: 14 }}
              />
              <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                This will create a reusable TSX component wrapped in a subcircuit
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={handleExportAsComponent}
                style={{ flex: 1 }}
              >
                Export Component
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowExportDialog(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
