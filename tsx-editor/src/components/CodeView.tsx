import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const CodeView: React.FC = () => {
  const {
    fsMap,
    activeFilePath,
    codeViewTab,
    exportPreview,
    setCodeViewTab,
    updateFile
  } = useEditorStore()

  const sourceCode = fsMap[activeFilePath] || ''
  const isExportTab = codeViewTab === 'export' && !!exportPreview
  const code = isExportTab ? exportPreview.content : sourceCode
  const label = isExportTab
    ? `Export Preview (${exportPreview?.fileName || 'untitled.tsx'})`
    : `Source Code (${activeFilePath})`

  return (
    <div className="code-view" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
      <div className="code-editor" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {isExportTab ? (
          <pre style={{ margin: 0, padding: 12, whiteSpace: 'pre', overflow: 'auto', width: '100%' }}>{code}</pre>
        ) : (
          <textarea
            value={sourceCode}
            onChange={(e) => updateFile(activeFilePath, e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: 12,
              lineHeight: 1.4,
              padding: 12
            }}
          />
        )}
      </div>
    </div>
  )
}
