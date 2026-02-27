import React, { useMemo, useState } from 'react'
import { getAllCatalogItems } from '../catalog'
import { CatalogItem } from '../types/catalog'
import { useEditorStore } from '../store/editorStore'

interface CatalogPanelProps {
  onDragStart: (item: CatalogItem) => void
}

export const CatalogPanel: React.FC<CatalogPanelProps> = ({ onDragStart }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [mode, setMode] = useState<'all' | 'components' | 'subcircuits'>('all')
  const { fsMap, setFSMap } = useEditorStore()

  const partItems = useMemo(() => getAllCatalogItems().filter(item => item.metadata.kind === 'part'), [])
  const quickItems = useMemo(
    () => partItems.filter(item => ['net', 'customchip'].includes(item.metadata.id)),
    [partItems]
  )

  const subcircuits = Object.keys(fsMap)
    .filter(path => path.startsWith('subcircuits/') && path.endsWith('.tsx'))
    .map(path => {
      const name = path.replace('subcircuits/', '').replace('.tsx', '')
      return { name, path, isUserCreated: true }
    })

  const filteredParts = searchQuery
    ? partItems.filter(item =>
        item.metadata.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.metadata.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        item.metadata.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : partItems

  const filteredSubcircuits = searchQuery
    ? subcircuits.filter(({ name }) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subcircuits

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    e.dataTransfer.setData('catalogItemId', item.metadata.id)
    onDragStart(item)
  }

  const handleSubcircuitDragStart = (e: React.DragEvent, subcircuitName: string) => {
    e.dataTransfer.setData('subcircuitName', subcircuitName)
    const subcircuitItem: CatalogItem = {
      metadata: {
        id: subcircuitName,
        label: subcircuitName,
        kind: 'subcircuit',
        category: 'Subcircuits',
        editablePropsSchema: {},
        defaultProps: { name: subcircuitName }
      },
      emitTSX: (props) => `<${subcircuitName} name="${subcircuitName}_1" schX={${props.schX}} schY={${props.schY}} />`
    }
    onDragStart(subcircuitItem)
  }

  const handleDeleteSubcircuit = (path: string, name: string) => {
    if (confirm(`Delete subcircuit "${name}"?`)) {
      const newFsMap = { ...fsMap }
      delete newFsMap[path]
      setFSMap(newFsMap)
      setTimeout(() => useEditorStore.getState().regenerateTSX(), 0)
    }
  }

  return (
    <div className="left-panel">
      <div className="panel-header">Component Library</div>
      
      {/* Search bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #3e3e3e' }}>
        <input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            background: '#1e1e1e',
            border: '1px solid #3e3e3e',
            borderRadius: '4px',
            color: '#cccccc',
            fontSize: '13px',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#007acc'}
          onBlur={(e) => e.target.style.borderColor = '#3e3e3e'}
        />
      </div>

      <div className="catalog-tabs">
        <button
          className={`catalog-tab ${mode === 'all' ? 'active' : ''}`}
          onClick={() => setMode('all')}
          style={{ flex: 1 }}
        >
          All
        </button>
        <button
          className={`catalog-tab ${mode === 'components' ? 'active' : ''}`}
          onClick={() => setMode('components')}
          style={{ flex: 1 }}
        >
          Components
        </button>
        <button
          className={`catalog-tab ${mode === 'subcircuits' ? 'active' : ''}`}
          onClick={() => setMode('subcircuits')}
          style={{ flex: 1 }}
        >
          Subcircuits
        </button>
      </div>
      
      <div className="catalog-items">
        <div style={{ padding: '6px 4px 10px', color: '#888', fontSize: 11, fontWeight: 600 }}>
          Quick Add
        </div>
        {quickItems.map((item) => (
          <div
            key={`quick-${item.metadata.id}`}
            className="catalog-item"
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
          >
            <div className="catalog-item-label">{item.metadata.label}</div>
            {item.metadata.description && (
              <div className="catalog-item-desc">{item.metadata.description}</div>
            )}
          </div>
        ))}

        {mode !== 'subcircuits' && (
          <>
            <div style={{ padding: '6px 4px 10px', color: '#888', fontSize: 11, fontWeight: 600 }}>
              Components
            </div>
            {filteredParts.map((item) => (
              <div
                key={item.metadata.id}
                className="catalog-item"
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
              >
                <div className="catalog-item-label">{item.metadata.label}</div>
                {item.metadata.description && (
                  <div className="catalog-item-desc">{item.metadata.description}</div>
                )}
              </div>
            ))}
          </>
        )}

        {mode !== 'components' && (
          <>
            {mode === 'all' && (
              <div style={{ padding: '12px 4px 10px', color: '#888', fontSize: 11, fontWeight: 600 }}>
                Subcircuits
              </div>
            )}
            {mode === 'subcircuits' && (
              <div style={{ padding: '6px 4px 10px', color: '#888', fontSize: 11, fontWeight: 600 }}>
                Subcircuits
              </div>
            )}
            {filteredSubcircuits.length === 0 ? (
          <div style={{ padding: '12px 8px', color: '#888', fontSize: 12, lineHeight: 1.4 }}>
            {searchQuery ? 'No matching subcircuits.' : 'No subcircuits yet. Select components and click "Create Subcircuit".'}
          </div>
            ) : (
              filteredSubcircuits.map(({ name, path }) => (
            <div
              key={path}
              className="catalog-item"
              draggable
              onDragStart={(e) => handleSubcircuitDragStart(e, name)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ flex: 1 }}>
                <div className="catalog-item-label">{name}</div>
                <div className="catalog-item-desc">Reusable subcircuit</div>
              </div>
              <button
                className="btn"
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  background: '#d32f2f',
                  color: 'white'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSubcircuit(path, name)
                }}
                title="Delete subcircuit"
              >
                ×
              </button>
            </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
