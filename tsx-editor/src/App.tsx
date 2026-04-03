import React, { useEffect, useState } from 'react'
import { CatalogPanel } from './components/CatalogPanel'
import { Canvas } from './components/Canvas'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { FileTree } from './components/FileTree'
import { EditorTabs } from './components/EditorTabs'
import { EnhancedPropertiesPanel } from './components/EnhancedPropertiesPanel'
import { useEditorStore } from './store/editorStore'
import { buildProjectFileTree } from './utils/projectManager'
import { CatalogItem } from './types/catalog'
import './App.css'

type LeftTab = 'workspaces' | 'files' | 'components' | 'symbols' | 'subcircuits'

const TAB_LABELS: { id: LeftTab; label: string }[] = [
  { id: 'workspaces', label: 'WS' },
  { id: 'files',      label: 'Files' },
  { id: 'components', label: 'Parts' },
  { id: 'symbols',    label: 'Sym' },
  { id: 'subcircuits',label: 'Sub' },
]

function App() {
  const [draggedItem, setDraggedItem] = useState<CatalogItem | null>(null)
  const [leftPanelTab, setLeftPanelTab] = useState<LeftTab>('files')
  const [editingWsId, setEditingWsId] = useState<string | null>(null)
  const [editingWsName, setEditingWsName] = useState('')

  const regenerateTSX        = useEditorStore(s => s.regenerateTSX)
  const fsMap                = useEditorStore(s => s.fsMap)
  const activeFilePath       = useEditorStore(s => s.activeFilePath)
  const setActiveFilePath    = useEditorStore(s => s.setActiveFilePath)
  const selectedComponentIds = useEditorStore(s => s.selectedComponentIds)
  const placedComponents     = useEditorStore(s => s.placedComponents)
  const wires                = useEditorStore(s => s.wires)
  const updatePlacedComponent= useEditorStore(s => s.updatePlacedComponent)
  const workspaces           = useEditorStore(s => s.workspaces)
  const activeWorkspaceId    = useEditorStore(s => s.activeWorkspaceId)
  const switchWorkspace      = useEditorStore(s => s.switchWorkspace)
  const createWorkspace      = useEditorStore(s => s.createWorkspace)
  const deleteWorkspace      = useEditorStore(s => s.deleteWorkspace)
  const renameWorkspace      = useEditorStore(s => s.renameWorkspace)

  const projectFileTree = buildProjectFileTree(fsMap)

  const selectedComponent = selectedComponentIds.length > 0
    ? placedComponents.find(c => c.id === selectedComponentIds[0]) || null
    : null

  const relevantConnections = selectedComponent
    ? wires.filter(w => w.from.componentId === selectedComponent.id || w.to.componentId === selectedComponent.id)
    : []

  const activeFileContent = fsMap[activeFilePath || 'main.tsx'] || ''

  // Derived symbol and subcircuit lists from fsMap
  const symbolFiles = Object.keys(fsMap).filter(p => p.startsWith('symbols/') && p.endsWith('.tsx'))
  const subcircuitFiles = Object.keys(fsMap).filter(
    p => p.startsWith('subcircuits/') && p.endsWith('.tsx')
  )

  useEffect(() => { regenerateTSX() }, [regenerateTSX])

  const startRenameWorkspace = (id: string, name: string) => {
    setEditingWsId(id)
    setEditingWsName(name)
  }

  const finishRenameWorkspace = () => {
    if (editingWsId && editingWsName.trim()) {
      renameWorkspace(editingWsId, editingWsName.trim())
    }
    setEditingWsId(null)
    setEditingWsName('')
  }

  return (
    <div className="editor-container">
      <Header />

      <div style={{ display: 'flex', flex: 1, marginTop: 74, overflow: 'hidden' }}>
        {/* ── Left Panel ── */}
        <div style={{ width: 250, background: '#252526', borderRight: '1px solid #3e3e3e', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', background: '#2d2d2d', borderBottom: '1px solid #3e3e3e', flexShrink: 0 }}>
            {TAB_LABELS.map(t => (
              <button
                key={t.id}
                className={`catalog-tab ${leftPanelTab === t.id ? 'active' : ''}`}
                onClick={() => setLeftPanelTab(t.id)}
                style={{ flex: 1, fontSize: 11 }}
                title={t.id.charAt(0).toUpperCase() + t.id.slice(1)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

            {/* WORKSPACES */}
            {leftPanelTab === 'workspaces' && (
              <div style={{ padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#ccc', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Workspaces</span>
                  <button
                    style={{ background: '#007acc', border: 'none', color: '#fff', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}
                    onClick={() => {
                      const name = prompt('New workspace name:')
                      if (name?.trim()) createWorkspace(name.trim())
                    }}
                  >+ New</button>
                </div>
                {Object.values(workspaces).map(ws => (
                  <div
                    key={ws.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
                      background: ws.id === activeWorkspaceId ? '#094771' : '#2a2a2a',
                      color: ws.id === activeWorkspaceId ? '#fff' : '#ccc',
                      fontSize: 13
                    }}
                    onClick={() => switchWorkspace(ws.id)}
                  >
                    {editingWsId === ws.id ? (
                      <input
                        autoFocus
                        value={editingWsName}
                        onChange={e => setEditingWsName(e.target.value)}
                        onBlur={finishRenameWorkspace}
                        onKeyDown={e => { if (e.key === 'Enter') finishRenameWorkspace(); if (e.key === 'Escape') { setEditingWsId(null) } }}
                        style={{ flex: 1, background: '#333', border: '1px solid #007acc', color: '#fff', borderRadius: 3, padding: '2px 4px', fontSize: 12 }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                    )}
                    <div style={{ display: 'flex', gap: 4, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
                      <button
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                        title="Rename"
                        onClick={() => startRenameWorkspace(ws.id, ws.name)}
                      >✏</button>
                      <button
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}
                        title="Delete"
                        onClick={() => {
                          if (window.confirm(`Delete workspace "${ws.name}"?`)) deleteWorkspace(ws.id)
                        }}
                      >🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FILES */}
            {leftPanelTab === 'files' && (
              <FileTree
                root={projectFileTree}
                onFileSelect={setActiveFilePath}
                activeFilePath={activeFilePath}
              />
            )}

            {/* COMPONENTS */}
            {leftPanelTab === 'components' && (
              <CatalogPanel onDragStart={setDraggedItem} embedded />
            )}

            {/* SYMBOLS */}
            {leftPanelTab === 'symbols' && (
              <div style={{ padding: 8 }}>
                <div style={{ color: '#ccc', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Symbol Files</div>
                {symbolFiles.length === 0 && (
                  <div style={{ color: '#666', fontSize: 12 }}>No symbol files found.<br />Add .tsx files to the <code>symbols/</code> folder.</div>
                )}
                {symbolFiles.map(path => (
                  <div
                    key={path}
                    style={{
                      padding: '5px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
                      background: path === activeFilePath ? '#094771' : '#2a2a2a',
                      color: path === activeFilePath ? '#fff' : '#ccc',
                      fontSize: 12
                    }}
                    onClick={() => setActiveFilePath(path)}
                  >
                    📐 {path.replace('symbols/', '')}
                  </div>
                ))}
              </div>
            )}

            {/* SUBCIRCUITS */}
            {leftPanelTab === 'subcircuits' && (
              <div style={{ padding: 8 }}>
                <div style={{ color: '#ccc', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Subcircuits</div>
                {subcircuitFiles.length === 0 && (
                  <div style={{ color: '#666', fontSize: 12 }}>No subcircuit files yet.</div>
                )}
                {subcircuitFiles.map(path => (
                  <div
                    key={path}
                    style={{
                      padding: '5px 8px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
                      background: path === activeFilePath ? '#094771' : '#2a2a2a',
                      color: path === activeFilePath ? '#fff' : '#ccc',
                      fontSize: 12
                    }}
                    onClick={() => setActiveFilePath(path)}
                  >
                    🔧 {path.replace('subcircuits/', '')}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* ── Center: editor tabs + canvas ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <EditorTabs />
          <Canvas />
        </div>

        {/* ── Right Panel ── */}
        <div style={{ width: 300, background: '#252526', borderLeft: '1px solid #3e3e3e', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <EnhancedPropertiesPanel
            selectedComponent={selectedComponent}
            connections={relevantConnections}
            activeFileContent={activeFileContent}
            activeFilePath={activeFilePath || 'main.tsx'}
            placedComponents={placedComponents}
            onPropertyChange={(componentId, propName, value) => {
              const component = placedComponents.find(c => c.id === componentId)
              if (component) {
                updatePlacedComponent(componentId, {
                  ...(propName === 'name' ? { name: String(value || component.name) } : {}),
                  props: { ...component.props, [propName]: value }
                })
              }
            }}
          />
        </div>
      </div>

      <StatusBar />
    </div>
  )
}

export default App
