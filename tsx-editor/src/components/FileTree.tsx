import React, { useState } from 'react'
import { FileTreeNode } from '../types/project'
import '../styles/FileTree.css'

interface FileTreeProps {
  root: FileTreeNode
  onFileSelect: (path: string) => void
  onFileDelete?: (path: string) => void
  onFileMove?: (oldPath: string, newPath: string) => void
  activeFilePath?: string
}

export const FileTree: React.FC<FileTreeProps> = ({
  root,
  onFileSelect,
  onFileDelete,
  onFileMove,
  activeFilePath
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root', 'folder:schematics', 'folder:subcircuits', 'folder:symbols', 'folder:editor'])
  )

  const toggleFolder = (id: string) => {
    const next = new Set(expandedFolders)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedFolders(next)
  }

  const renderNode = (node: FileTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.id)
    const isActive = node.type === 'file' && node.path === activeFilePath

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 16}px` }}>
        {node.type === 'folder' ? (
          <div
            className="file-tree-item folder"
            onClick={() => toggleFolder(node.id)}
          >
            <span className="file-tree-toggle">{isExpanded ? '▼' : '▶'}</span>
            <span className="file-tree-name">📁 {node.name}</span>
          </div>
        ) : (
          <div
            className={`file-tree-item file ${isActive ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
            onClick={() => onFileSelect(node.path!)}
          >
            <span className="file-tree-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.path?.endsWith('.tsx') ? '📄' : '📋'} {node.name}
            </span>
            <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              {onFileMove && (
                <button
                  title="Move or rename file"
                  style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  onClick={() => {
                    const nextPath = window.prompt('Move or rename file:', node.path || '')?.trim()
                    if (nextPath && node.path && nextPath !== node.path) {
                      onFileMove(node.path, nextPath)
                    }
                  }}
                >
                  ✏
                </button>
              )}
              {onFileDelete && (
                <button
                  title="Delete file"
                  style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  onClick={() => {
                    if (node.path && window.confirm(`Delete file "${node.path}"?`)) {
                      onFileDelete(node.path)
                    }
                  }}
                >
                  🗑
                </button>
              )}
            </span>
          </div>
        )}

        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="file-tree">
      <div className="file-tree-header">📁 Files</div>
      <div className="file-tree-content">
        {renderNode(root)}
      </div>
    </div>
  )
}
