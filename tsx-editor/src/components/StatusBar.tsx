import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const StatusBar: React.FC = () => {
  const { wiringStart, selectedComponentIds, placedComponents, wires, activeFilePath } = useEditorStore()

  const getMessage = () => {
    if (wiringStart) {
      const comp = placedComponents.find(c => c.id === wiringStart.componentId)
      return `🔌 Click another pin to connect from ${comp?.name}.${wiringStart.pinName}`
    }
    
    if (selectedComponentIds.length > 1) {
      return `✨ ${selectedComponentIds.length} components selected • Create subcircuit or delete`
    }
    
    if (selectedComponentIds.length === 1) {
      const comp = placedComponents.find(c => c.id === selectedComponentIds[0])
      return `📝 Editing ${comp?.name} • Hold Ctrl/Cmd to select multiple`
    }
    
    return `💡 ${activeFilePath} • Drag from Parts/Subcircuits • Click pins to connect • ${placedComponents.length} items, ${wires.length} connections`
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 30,
      background: '#2d2d2d',
      borderTop: '1px solid #3e3e3e',
      display: 'flex',
      alignItems: 'center',
      padding: '0 15px',
      fontSize: 12,
      color: '#888',
      zIndex: 100
    }}>
      {getMessage()}
    </div>
  )
}
