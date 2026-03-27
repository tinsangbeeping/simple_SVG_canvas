import React, { useEffect, useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { pixelToSchematic } from '../utils/coordinateScale'

export const Header: React.FC = () => {
  const {
    fsMap,
    placedComponents,
    applyLayout,
    selectedComponentIds,
    rotateSelectedComponents,
    removeSelectedComponents,
    copySelectedComponents,
    pasteCopiedComponents,
    generateFlatCircuitTSX,
    generateProjectStructure,
    importTSXIntoActiveFile,
    setCodeViewTab,
    setExportPreview,
    activeFilePath,
    breadcrumbStack,
    goBackFile
  } = useEditorStore()

  const currentFileLabel = activeFilePath === 'main.tsx'
    ? 'main.tsx'
    : activeFilePath.replace('subcircuits/', '')

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importContent, setImportContent] = useState('')
  const [exportName, setExportName] = useState('MyComponent')
  const [isLayouting, setIsLayouting] = useState(false)

  const downloadTextFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

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
        return
      }

      if (e.key.toLowerCase() === 'r' && selectedComponentIds.length > 0) {
        e.preventDefault()
        rotateSelectedComponents()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedComponentIds, removeSelectedComponents, copySelectedComponents, pasteCopiedComponents, rotateSelectedComponents])

  const handleExport = () => {
    const circuitTsx = generateFlatCircuitTSX() || fsMap['main.tsx'] || ''

    setExportPreview({
      fileName: 'circuit.tsx',
      content: circuitTsx
    })
    setCodeViewTab('export')

    downloadTextFile(circuitTsx, 'circuit.tsx')
  }

  const handleCopy = () => {
    const currentTsx = fsMap[activeFilePath] || ''
    navigator.clipboard.writeText(currentTsx)
    alert(`Copied ${activeFilePath} to clipboard`) 
  }

  const handleImport = () => {
    if (!importContent.trim()) return

    try {
      importTSXIntoActiveFile(importContent)
      setShowImportDialog(false)
      setImportContent('')
      alert(`Imported TSX into ${activeFilePath}`)
    } catch (error) {
      alert('Import failed: ' + (error as Error).message)
    }
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
        const normalizedProps = { ...c.props }
        if (c.catalogId === 'switch') {
          if (normalizedProps.type === undefined && normalizedProps.variant !== undefined) {
            normalizedProps.type = normalizedProps.variant
          }
          delete normalizedProps.variant
          if (normalizedProps.footprint === undefined || normalizedProps.footprint === '') {
            normalizedProps.footprint = 'pushbutton'
          }
        }

        const localX = pixelToSchematic((c.props.schX || 0) - minX)
        const localY = pixelToSchematic((c.props.schY || 0) - minY)
        const coordX = Number.isInteger(localX) ? String(localX) : String(Number(localX.toFixed(3)))
        const coordY = Number.isInteger(localY) ? String(localY) : String(Number(localY.toFixed(3)))
        const propLines = Object.entries(normalizedProps)
          .filter(([k]) => !['name', 'schX', 'schY', 'schRotation', 'subcircuitName', 'ports', 'netName'].includes(k))
          .map(([k, v]) => {
            if (typeof v === 'number') return `${k}={${v}}`
            if (typeof v === 'boolean') return v ? k : ''
            return `${k}="${v}"`
          })
          .filter(Boolean)

        const rotation = String(normalizedProps.schRotation || '0deg')

        const tagName = c.catalogId === 'subcircuit-instance' ? c.props.subcircuitName : c.catalogId
        return [
          `      {/* // schX={${coordX}} */}`,
          `      {/* // schY={${coordY}} */}`,
          `      <${tagName}`,
          `        name="${c.name}"`,
          ...propLines.map(line => `        ${line}`),
          `        schRotation="${rotation}"`,
          `      />`
        ].join('\n')
      })
      .join('\n')

    const exportedTSX = `import React from "react"\n\nexport default function ${exportName}(props: {\n  name: string\n  schX?: number\n  schY?: number\n}) {\n  const x = props.schX ?? 0\n  const y = props.schY ?? 0\n\n  return (\n    <subcircuit name={props.name}>\n${componentsTSX || '      {/* Add components here */}'}\n    </subcircuit>\n  )\n}\n`

    setExportPreview({
      fileName: `${exportName}.tsx`,
      content: exportedTSX
    })
    setCodeViewTab('export')

    setShowExportDialog(false)
    alert(`Export preview opened: ${exportName}.tsx`)
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
      const structure = generateProjectStructure()
      const timestamp = Date.now()

      downloadTextFile(structure.parent, `circuit-${timestamp}.tsx`)

      Object.entries(structure.children).forEach(([path, content], index) => {
        const fileName = path.split('/').pop() || 'file.tsx'

        setTimeout(() => {
          downloadTextFile(content, `circuit-${fileName}`)
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
          <button className="btn btn-secondary" onClick={() => setShowImportDialog(true)}>
            Import TSX
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

      {showImportDialog && (
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
          <div style={{ background: '#2d2d2d', padding: 30, borderRadius: 8, minWidth: 640, maxWidth: 820, border: '1px solid #3e3e3e' }}>
            <h2 style={{ marginBottom: 20, fontSize: 18 }}>Import Minimal TSX</h2>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#aaa' }}>
              Supported for this milestone: {'<chip />'}, {'<net />'}, and {'<trace from="..." to="..." />'}.
            </div>
            <textarea
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder={'Paste a <board>...</board>, <subcircuit>...</subcircuit>, or raw <chip /> / <net /> / <trace /> lines'}
              style={{
                width: '100%',
                minHeight: 260,
                resize: 'vertical',
                background: '#1e1e1e',
                border: '1px solid #3e3e3e',
                color: '#d4d4d4',
                padding: 12,
                fontFamily: 'monospace',
                fontSize: 13,
                borderRadius: 6,
                marginBottom: 16
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleImport} style={{ flex: 1 }}>
                Import Into Current File
              </button>
              <button className="btn btn-secondary" onClick={() => setShowImportDialog(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
