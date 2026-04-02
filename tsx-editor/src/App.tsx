import React, { useEffect, useState } from 'react'
import { CatalogPanel } from './components/CatalogPanel'
import { Canvas } from './components/Canvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Header } from './components/Header'
import { CodeView } from './components/CodeView'
import { WiringPanel } from './components/WiringPanel'
import { StatusBar } from './components/StatusBar'
import { FileTree } from './components/FileTree'
import { EnhancedPropertiesPanel } from './components/EnhancedPropertiesPanel'
import { useEditorStore } from './store/editorStore'
import { buildProjectFileTree } from './utils/projectManager'
import { CatalogItem } from './types/catalog'
import './App.css'

function App() {
  const [draggedItem, setDraggedItem] = useState<CatalogItem | null>(null)
  const regenerateTSX = useEditorStore(state => state.regenerateTSX)
  const fsMap = useEditorStore(state => state.fsMap)
  const activeFilePath = useEditorStore(state => state.activeFilePath)
  const setActiveFilePath = useEditorStore(state => state.setActiveFilePath)
  const selectedComponentIds = useEditorStore(state => state.selectedComponentIds)
  const placedComponents = useEditorStore(state => state.placedComponents)
  const wires = useEditorStore(state => state.wires)
  const updatePlacedComponent = useEditorStore(state => state.updatePlacedComponent)

  // Build file tree from fsMap
  const projectFileTree = buildProjectFileTree(fsMap)
  
  // Get selected component (first selected if any)
  const selectedComponent = selectedComponentIds.length > 0 
    ? placedComponents.find(c => c.id === selectedComponentIds[0]) || null
    : null

  // Get connections for selected component
  const relevantConnections = selectedComponent
    ? wires.filter(w => w.from.componentId === selectedComponent.id || w.to.componentId === selectedComponent.id)
    : []

  // Get active file content
  const activeFileContent = fsMap[activeFilePath || 'schematics/main.tsx'] || ''

  useEffect(() => {
    regenerateTSX()
  }, [regenerateTSX])

  return (
    <div className="editor-container">
      <Header />
      
      <div style={{ display: 'flex', flex: 1, marginTop: 74, overflow: 'hidden' }}>
        {/* Left Panel - File Tree */}
        <div style={{ width: 250, background: '#252526', borderRight: '1px solid #3e3e3e', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 15px', background: '#2d2d2d', borderBottom: '1px solid #3e3e3e', fontSize: '13px', fontWeight: 500 }}>
            📁 Project Files
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <FileTree 
              root={projectFileTree} 
              onFileSelect={setActiveFilePath}
              activeFilePath={activeFilePath}
            />
          </div>
        </div>

        {/* Center - Canvas & Catalog */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CatalogPanel onDragStart={setDraggedItem} />
          <Canvas />
        </div>
        
        {/* Right Panel - Enhanced Properties */}
        <div style={{ width: 300, background: '#252526', borderLeft: '1px solid #3e3e3e', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <EnhancedPropertiesPanel 
            selectedComponent={selectedComponent}
            connections={relevantConnections}
            activeFileContent={activeFileContent}
            activeFilePath={activeFilePath || 'schematics/main.tsx'}
            placedComponents={placedComponents}
            onPropertyChange={(componentId, propName, value) => {
              if (propName === 'schX' || propName === 'schY') {
                const component = placedComponents.find(c => c.id === componentId)
                if (component) {
                  updatePlacedComponent(componentId, {
                    props: {
                      ...component.props,
                      [propName]: value
                    }
                  })
                }
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
