import React, { useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'

export const Header: React.FC = () => {
  const {
    fsMap,
    placedComponents,
    applyLayout,
    selectedComponentIds,
    removeSelectedComponents,
    copySelectedComponents,
    pasteCopiedComponents,
    generateParentChildrenStructure,
    activeFilePath,
    breadcrumbStack,
    goBackFile
  } = useEditorStore()

  const currentFileLabel = activeFilePath === 'main.tsx'
    ? 'main.tsx'
    : activeFilePath.replace('subcircuits/', '')

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportName, setExportName] = useState('MyComponent')
  const [isLayouting, setIsLayouting] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTypingTarget = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )

      if (isTypingTarget) return

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentIds.length > 0) {
        e.preventDefault()
        removeSelectedComponents()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedComponentIds.length > 0) {
        e.preventDefault()
        copySelectedComponents()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteCopiedComponents()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedComponentIds, removeSelectedComponents, copySelectedComponents, pasteCopiedComponents])

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
    const currentTsx = fsMap[activeFilePath] || ''
    navigator.clipboard.writeText(currentTsx)
    alert(`Copied ${activeFilePath} to clipboard`) 
  }

  const handleExportAsComponent = () => {
    if (!exportName) return

    if (placedComponents.length === 0) {
      alert('No components to export')
      return
    }

    const minX = Math.min(...placedComponents.map(c => c.props.schX || 0))
    const minY = Math.min(...placedComponents.map(c => c.props.schY || 0))

    const componentsTSX = placedComponents
      .filter(c => c.catalogId !== 'netport')
      .map(c => {
        const localX = (c.props.schX || 0) - minX
        const localY = (c.props.schY || 0) - minY
        const propsStr = Object.entries(c.props)
          .filter(([k]) => !['schX', 'schY', 'subcircuitName', 'ports', 'netName'].includes(k))
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')

        const tagName = c.catalogId === 'subcircuit-instance' ? c.props.subcircuitName : c.catalogId
        return `      <${tagName} name="${c.name}" ${propsStr ? `${propsStr} ` : ''}schX={x + ${localX}} schY={y + ${localY}} />`
      })
      .join('\n')

    const exportedTSX = `export function ${exportName}(props: {\n  name: string\n  schX?: number\n  schY?: number\n}) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n${componentsTSX || '      {/* Add components here */}'}\n    </subcircuit>\n  )\n}\n`

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

  const handleExportZip = () => {
    try {
      const structure = generateParentChildrenStructure()
      const timestamp = Date.now()

      const parentBlob = new Blob([structure.parent], { type: 'text/plain' })
      const parentUrl = URL.createObjectURL(parentBlob)
      const parentLink = document.createElement('a')
      parentLink.href = parentUrl
      parentLink.download = `circuit-main-${timestamp}.tsx`
      parentLink.click()
      URL.revokeObjectURL(parentUrl)

      Object.entries(structure.children).forEach(([path, content], index) => {
        const fileName = path.split('/').pop() || 'file.tsx'
        const childBlob = new Blob([content], { type: 'text/plain' })
        const childUrl = URL.createObjectURL(childBlob)
        const childLink = document.createElement('a')
        childLink.href = childUrl
        childLink.download = `circuit-${fileName}`

        setTimeout(() => {
          childLink.click()
          URL.revokeObjectURL(childUrl)
        }, 100 * (index + 1))
      })

      alert('Project structure exported successfully!')
    } catch (error) {
      alert('Failed to export: ' + (error as Error).message)
    }
  }

  return (
    <div className="editor-header" style={{ display: 'flex', flexDirection: 'column', height: 74, alignItems: 'stretch', paddingTop: 8, paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1>TSX Schematic Editor</h1>
        <div className="editor-header-actions">
          <button className="btn btn-secondary" onClick={handleAutoLayout} disabled={isLayouting || placedComponents.length === 0}>
            {isLayouting ? 'Layouting...' : 'Auto Layout'}
          </button>
          <button className="btn btn-secondary" onClick={handleExportZip} disabled={placedComponents.length === 0}>
            Export Structure
          </button>
          <button className="btn btn-secondary" onClick={handleCopy}>Copy TSX</button>
          <button className="btn btn-secondary" onClick={handleExport}>Export Circuit</button>
          <button className="btn btn-primary" onClick={() => setShowExportDialog(true)}>
            Export as Component
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12, color: '#aaa' }}>
        <button className="btn btn-secondary" disabled={breadcrumbStack.length === 0} onClick={goBackFile} style={{ padding: '2px 8px', fontSize: 11 }}>
          Back
        </button>
        <span style={{
          padding: '2px 8px',
          border: '1px solid #505050',
          borderRadius: 4,
          color: '#d4d4d4',
          fontSize: 11,
          background: '#252526'
        }}>
          Editing: {currentFileLabel}
        </span>
        <span>{[...breadcrumbStack, activeFilePath].join('  ›  ')}</span>
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
          <div style={{ background: '#2d2d2d', padding: 30, borderRadius: 8, minWidth: 400, border: '1px solid #3e3e3e' }}>
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
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleExportAsComponent} style={{ flex: 1 }}>
                Export Component
              </button>
              <button className="btn btn-secondary" onClick={() => setShowExportDialog(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
