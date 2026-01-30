import React from 'react'
import { useEditorStore } from '../store/editorStore'

export const WiringPanel: React.FC = () => {
  const { wires, placedComponents, removeWire } = useEditorStore()

  if (wires.length === 0) {
    return (
      <div style={{ padding: 15, color: '#888', fontSize: 12 }}>
        No connections yet. Enable wiring mode to connect pins.
      </div>
    )
  }

  return (
    <div style={{ padding: 15 }}>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: '#e0e0e0' }}>
        Connections ({wires.length})
      </div>
      
      {wires.map((wire) => {
        const fromComp = placedComponents.find(c => c.id === wire.from.componentId)
        const toComp = placedComponents.find(c => c.id === wire.to.componentId)
        
        if (!fromComp || !toComp) return null

        return (
          <div
            key={wire.id}
            style={{
              padding: 8,
              marginBottom: 6,
              background: '#2d2d2d',
              border: '1px solid #3e3e3e',
              borderRadius: 3,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: '#4CAF50' }}>
                {fromComp.name}.{wire.from.pinName}
              </div>
              <div style={{ color: '#888', margin: '2px 0' }}>→</div>
              <div style={{ color: '#2196F3' }}>
                {toComp.name}.{wire.to.pinName}
              </div>
            </div>
            
            <button
              onClick={() => removeWire(wire.id)}
              style={{
                padding: '4px 8px',
                background: '#f44336',
                border: 'none',
                borderRadius: 3,
                color: 'white',
                cursor: 'pointer',
                fontSize: 10
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
