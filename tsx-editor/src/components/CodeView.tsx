import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const CodeView: React.FC = () => {
  const {
    fsMap,
    activeFilePath,
    codeViewTab,
    exportPreview,
    setCodeViewTab
  } = useEditorStore()

  const sourceCode = fsMap[activeFilePath] || ''
  const isExportTab = codeViewTab === 'export' && !!exportPreview
  const code = isExportTab ? exportPreview.content : sourceCode
  const label = isExportTab
    ? `Export Preview (${exportPreview?.fileName || 'untitled.tsx'})`
    : `Generated TSX Code (${activeFilePath})`

  return (
    <div className="code-view">
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button
          className={`btn ${codeViewTab === 'source' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: 11, padding: '3px 8px' }}
          onClick={() => setCodeViewTab('source')}
        >
          Source
        </button>
        <button
          className={`btn ${isExportTab ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: 11, padding: '3px 8px' }}
          onClick={() => setCodeViewTab('export')}
          disabled={!exportPreview}
        >
          Export
        </button>
      </div>
      <div className="code-view-header">{label}</div>
      <div className="code-editor">
        {code}
      </div>
    </div>
  )
}
