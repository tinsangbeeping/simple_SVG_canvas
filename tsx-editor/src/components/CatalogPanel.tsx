import React, { useState } from 'react'
import { getAllCatalogItems, getCatalogItemsByKind, getCatalogItemsByCategory } from '../catalog'
import { CatalogItem } from '../types/catalog'

interface CatalogPanelProps {
  onDragStart: (item: CatalogItem) => void
}

type TabType = 'parts' | 'connectivity' | 'primitives' | 'patches'

export const CatalogPanel: React.FC<CatalogPanelProps> = ({ onDragStart }) => {
  const [activeTab, setActiveTab] = useState<TabType>('parts')
  
  const getItemsForTab = () => {
    switch (activeTab) {
      case 'parts':
        return getAllCatalogItems().filter(item => 
          item.metadata.category && 
          !['Connectivity', 'Primitives'].includes(item.metadata.category) &&
          item.metadata.kind === 'part'
        )
      case 'connectivity':
        return getCatalogItemsByCategory('Connectivity')
      case 'primitives':
        return getCatalogItemsByCategory('Primitives')
      case 'patches':
        return getCatalogItemsByKind('patch')
      default:
        return []
    }
  }

  const items = getItemsForTab()

  const handleDragStart = (e: React.DragEvent, item: CatalogItem) => {
    e.dataTransfer.setData('catalogItemId', item.metadata.id)
    onDragStart(item)
  }

  return (
    <div className="left-panel">
      <div className="panel-header">Component Library</div>
      
      <div className="catalog-tabs">
        <button
          className={`catalog-tab ${activeTab === 'parts' ? 'active' : ''}`}
          onClick={() => setActiveTab('parts')}
          style={{ flex: 1 }}
        >
          Parts
        </button>
        <button
          className={`catalog-tab ${activeTab === 'connectivity' ? 'active' : ''}`}
          onClick={() => setActiveTab('connectivity')}
          style={{ flex: 1 }}
        >
          Wiring
        </button>
        <button
          className={`catalog-tab ${activeTab === 'primitives' ? 'active' : ''}`}
          onClick={() => setActiveTab('primitives')}
          style={{ flex: 1 }}
        >
          Symbols
        </button>
        <button
          className={`catalog-tab ${activeTab === 'patches' ? 'active' : ''}`}
          onClick={() => setActiveTab('patches')}
          style={{ flex: 1 }}
        >
          Patches
        </button>
      </div>

      <div className="catalog-items">
        {items.map((item) => (
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
      </div>
    </div>
  )
}
