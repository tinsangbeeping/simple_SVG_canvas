import React, { useState } from 'react'
import { CatalogPanel } from './components/CatalogPanel'
import { Canvas } from './components/Canvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Header } from './components/Header'
import { CodeView } from './components/CodeView'
import { WiringPanel } from './components/WiringPanel'
import { StatusBar } from './components/StatusBar'
import { CatalogItem } from './types/catalog'
import './App.css'

function App() {
  const [draggedItem, setDraggedItem] = useState<CatalogItem | null>(null)

  return (
    <div className="editor-container">
      <Header />
      
      <CatalogPanel onDragStart={setDraggedItem} />
      
      <Canvas />
      
      <div style={{ display: 'flex', flexDirection: 'column', width: 300, marginTop: 74 }}>
        <PropertiesPanel />
        
        {/* Wiring connections */}
        <div style={{ borderTop: '1px solid #3e3e3e', background: '#252526', maxHeight: 200, overflowY: 'auto' }}>
          <WiringPanel />
        </div>
        
        <CodeView />
      </div>

      <StatusBar />
    </div>
  )
}

export default App
