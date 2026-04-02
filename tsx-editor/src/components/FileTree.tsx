import React, { useState } from 'react'
import { FileTreeNode } from '../types/project'
import '../styles/FileTree.css'

interface FileTreeProps {
  root: FileTreeNode
  onFileSelect: (path: string) => void
  activeFilePath?: string
}

export const FileTree: React.FC<FileTreeProps> = ({ root, onFileSelect, activeFilePath }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'symbols', 'subcircuits', 'schematics']))

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
            onClick={() => onFileSelect(node.path!)}
          >
            <span className="file-tree-name">
              {node.path?.endsWith('.tsx') ? '📄' : '📋'} {node.name}
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
