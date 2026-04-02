import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const EditorTabs: React.FC = () => {
  const openFilePaths = useEditorStore(s => s.openFilePaths)
  const activeFilePath = useEditorStore(s => s.activeFilePath)
  const setActiveFilePath = useEditorStore(s => s.setActiveFilePath)
  const closeFileTab = useEditorStore(s => s.closeFileTab)

  const label = (path: string) => path.split('/').pop() || path

  return (
    <div style={{
      display: 'flex',
      background: '#252526',
      borderBottom: '1px solid #3e3e3e',
      height: 35,
      alignItems: 'stretch',
      flexShrink: 0,
      overflowX: 'auto',
      overflowY: 'hidden'
    }}>
      {openFilePaths.map(path => {
        const isActive = path === activeFilePath
        return (
          <div
            key={path}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 6px 0 12px',
              background: isActive ? '#1e1e1e' : 'transparent',
              borderRight: '1px solid #3e3e3e',
              borderBottom: isActive ? '2px solid #007acc' : '2px solid transparent',
              cursor: 'default',
              color: isActive ? '#fff' : '#969696',
              fontSize: 12,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              gap: 6,
              userSelect: 'none'
            }}
          >
            <span
              onClick={() => setActiveFilePath(path)}
              style={{ cursor: 'pointer' }}
              title={path}
            >
              {label(path)}
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); closeFileTab(path) }}
              style={{
                cursor: 'pointer',
                opacity: 0.5,
                fontSize: 10,
                lineHeight: 1,
                padding: '2px 3px',
                borderRadius: 2
              }}
              title="Close tab"
            >
              ✕
            </span>
          </div>
        )
      })}
    </div>
  )
}
