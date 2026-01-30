import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const CodeView: React.FC = () => {
  const { fsMap } = useEditorStore()
  const mainTsx = fsMap['main.tsx'] || ''

  return (
    <div className="code-view">
      <div className="code-view-header">Generated TSX Code</div>
      <div className="code-editor">
        {mainTsx}
      </div>
    </div>
  )
}
