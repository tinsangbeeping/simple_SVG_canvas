import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const CodeView: React.FC = () => {
  const { fsMap, activeFilePath } = useEditorStore()
  const code = fsMap[activeFilePath] || ''

  return (
    <div className="code-view">
      <div className="code-view-header">Generated TSX Code ({activeFilePath})</div>
      <div className="code-editor">
        {code}
      </div>
    </div>
  )
}
