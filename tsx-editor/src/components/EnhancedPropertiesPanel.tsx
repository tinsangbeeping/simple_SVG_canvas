import React, { useState } from 'react'
import { PlacedComponent, WireConnection } from '../types/catalog'
import '../styles/PropertiesPanel.css'

interface EnhancedPropertiesPanelProps {
  selectedComponent: PlacedComponent | null
  connections: WireConnection[]
  activeFileContent: string
  activeFilePath: string
  placedComponents: PlacedComponent[]
  onPropertyChange?: (componentId: string, propName: string, value: any) => void
}

type TabType = 'properties' | 'connections' | 'tsx-code' | 'json'

type SideKey = 'L' | 'R' | 'U' | 'D'

const parseCustomPinNameMap = (rawValue: string): Map<string, string> => {
  const map = new Map<string, string>()
  const raw = String(rawValue || '').trim()
  if (!raw) return map

  // New format: L1=VIN,R1=VOUT,U1=VCC,D1=GND
  if (raw.includes('=')) {
    raw
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => {
        const [slot, ...rest] = part.split('=')
        const key = slot.trim().toUpperCase()
        const name = rest.join('=').trim()
        if (key && name) map.set(key, name)
      })
    return map
  }

  // Legacy format: comma list, assigned left then right then top then bottom
  const legacy = raw.split(',').map(part => part.trim()).filter(Boolean)
  legacy.forEach((value, index) => {
    map.set(`LEGACY_${index}`, value)
  })
  return map
}

const buildCustomPinNameString = (map: Map<string, string>): string => {
  return [...map.entries()]
    .filter(([key, value]) => !key.startsWith('LEGACY_') && value.trim())
    .map(([key, value]) => `${key}=${value.trim()}`)
    .join(',')
}

const toSideSlots = (leftPins: number, rightPins: number, topPins: number, bottomPins: number): string[] => {
  const slots: string[] = []
  for (let i = 1; i <= leftPins; i += 1) slots.push(`L${i}`)
  for (let i = 1; i <= rightPins; i += 1) slots.push(`R${i}`)
  for (let i = 1; i <= topPins; i += 1) slots.push(`U${i}`)
  for (let i = 1; i <= bottomPins; i += 1) slots.push(`D${i}`)
  return slots
}

export const EnhancedPropertiesPanel: React.FC<EnhancedPropertiesPanelProps> = ({
  selectedComponent,
  connections,
  activeFileContent,
  activeFilePath,
  placedComponents,
  onPropertyChange
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('properties')

  const relevantConnections = connections.filter(
    c => selectedComponent && (c.from.componentId === selectedComponent.id || c.to.componentId === selectedComponent.id)
  )

  const renderCustomChipEditor = () => {
    if (!selectedComponent || selectedComponent.catalogId !== 'customchip') return null

    const legacyCount = Math.max(2, Number(selectedComponent.props.pinCount || 8))
    const leftPins = Math.max(0, Number(selectedComponent.props.leftPins ?? Math.ceil(legacyCount / 2)))
    const rightPins = Math.max(0, Number(selectedComponent.props.rightPins ?? Math.floor(legacyCount / 2)))
    const topPins = Math.max(0, Number(selectedComponent.props.topPins ?? 0))
    const bottomPins = Math.max(0, Number(selectedComponent.props.bottomPins ?? 0))
    const slots = toSideSlots(leftPins, rightPins, topPins, bottomPins)

    const parsed = parseCustomPinNameMap(String(selectedComponent.props.pinNames || ''))
    const legacyValues = [...parsed.entries()]
      .filter(([key]) => key.startsWith('LEGACY_'))
      .sort((a, b) => Number(a[0].replace('LEGACY_', '')) - Number(b[0].replace('LEGACY_', '')))
      .map(([, value]) => value)

    const effectiveMap = new Map<string, string>()
    slots.forEach((slot, index) => {
      const explicit = parsed.get(slot)
      const legacy = legacyValues[index]
      if (explicit) {
        effectiveMap.set(slot, explicit)
      } else if (legacy) {
        effectiveMap.set(slot, legacy)
      }
    })

    const setDirectionalCount = (propName: 'leftPins' | 'rightPins' | 'topPins' | 'bottomPins', value: number) => {
      const safe = Math.max(0, Number.isFinite(value) ? value : 0)
      onPropertyChange?.(selectedComponent.id, propName, safe)

      const nextLeft = propName === 'leftPins' ? safe : leftPins
      const nextRight = propName === 'rightPins' ? safe : rightPins
      const nextTop = propName === 'topPins' ? safe : topPins
      const nextBottom = propName === 'bottomPins' ? safe : bottomPins
      const total = nextLeft + nextRight + nextTop + nextBottom
      onPropertyChange?.(selectedComponent.id, 'pinCount', Math.max(2, total))
    }

    return (
      <div style={{ marginTop: 12, borderTop: '1px solid #3e3e3e', paddingTop: 12 }}>
        <div className="property-group">
          <label>Name:</label>
          <input
            type="text"
            value={selectedComponent.name}
            onChange={e => onPropertyChange?.(selectedComponent.id, 'name', e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="property-group">
            <label>Left Pins:</label>
            <input
              type="number"
              min={0}
              value={leftPins}
              onChange={e => setDirectionalCount('leftPins', Number(e.target.value))}
            />
          </div>
          <div className="property-group">
            <label>Right Pins:</label>
            <input
              type="number"
              min={0}
              value={rightPins}
              onChange={e => setDirectionalCount('rightPins', Number(e.target.value))}
            />
          </div>
          <div className="property-group">
            <label>Top Pins:</label>
            <input
              type="number"
              min={0}
              value={topPins}
              onChange={e => setDirectionalCount('topPins', Number(e.target.value))}
            />
          </div>
          <div className="property-group">
            <label>Bottom Pins:</label>
            <input
              type="number"
              min={0}
              value={bottomPins}
              onChange={e => setDirectionalCount('bottomPins', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="property-group">
          <label>Total Pins:</label>
          <input type="number" value={Math.max(2, leftPins + rightPins + topPins + bottomPins)} readOnly />
        </div>

        <div className="property-group">
          <label>Per-Pin Names:</label>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #3e3e3e', borderRadius: 4, padding: 8 }}>
            {slots.length === 0 ? (
              <div style={{ color: '#888', fontSize: 12 }}>Add at least one pin on a side.</div>
            ) : (
              slots.map(slot => (
                <div key={slot} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, marginBottom: 6 }}>
                  <label style={{ margin: 0, color: '#9cdcfe' }}>{slot}</label>
                  <input
                    type="text"
                    value={effectiveMap.get(slot) || ''}
                    placeholder={`Name for ${slot}`}
                    onChange={e => {
                      const next = new Map(effectiveMap)
                      if (e.target.value.trim()) {
                        next.set(slot, e.target.value)
                      } else {
                        next.delete(slot)
                      }
                      onPropertyChange?.(selectedComponent.id, 'pinNames', buildCustomPinNameString(next))
                    }}
                  />
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>
            Stored as: L1=VIN,R1=VOUT,U1=VCC,D1=GND
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="enhanced-properties-panel">
      <div className="tab-header">
        <button
          className={`tab-button ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          ⚙️ Properties
        </button>
        <button
          className={`tab-button ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          🔗 Connections
        </button>
        <button
          className={`tab-button ${activeTab === 'tsx-code' ? 'active' : ''}`}
          onClick={() => setActiveTab('tsx-code')}
        >
          📝 TSX
        </button>
        <button
          className={`tab-button ${activeTab === 'json' ? 'active' : ''}`}
          onClick={() => setActiveTab('json')}
        >
          {} JSON
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'properties' && (
          <div className="properties-tab">
            {selectedComponent ? (
              <div>
                <div className="property-group">
                  <label>Component:</label>
                  <input
                    type="text"
                    value={selectedComponent.name}
                    onChange={e => onPropertyChange?.(selectedComponent.id, 'name', e.target.value)}
                  />
                </div>
                <div className="property-group">
                  <label>Type:</label>
                  <input type="text" value={selectedComponent.catalogId} readOnly />
                </div>
                <div className="property-group">
                  <label>Position X:</label>
                  <input
                    type="number"
                    value={selectedComponent.props.schX || 0}
                    onChange={e =>
                      onPropertyChange?.(selectedComponent.id, 'schX', Number(e.target.value))
                    }
                  />
                </div>
                <div className="property-group">
                  <label>Position Y:</label>
                  <input
                    type="number"
                    value={selectedComponent.props.schY || 0}
                    onChange={e =>
                      onPropertyChange?.(selectedComponent.id, 'schY', Number(e.target.value))
                    }
                  />
                </div>
                {renderCustomChipEditor()}
              </div>
            ) : (
              <p className="placeholder">Select a component to view properties</p>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="connections-tab">
            {relevantConnections.length > 0 ? (
              <div className="connections-list">
                <h4>Connected Pins ({relevantConnections.length})</h4>
                {relevantConnections.map(conn => (
                  <div key={conn.id} className="connection-item">
                    <span className="connection-from">
                      {placedComponents.find(c => c.id === conn.from.componentId)?.name}.
                      {conn.from.pinName}
                    </span>
                    <span className="connection-arrow">→</span>
                    <span className="connection-to">
                      {placedComponents.find(c => c.id === conn.to.componentId)?.name}.
                      {conn.to.pinName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="placeholder">
                {selectedComponent ? 'No connections' : 'Select a component to view connections'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'tsx-code' && (
          <div className="tsx-code-tab">
            <div className="file-label">{activeFilePath}</div>
            <pre className="code-display">
              <code>{activeFileContent}</code>
            </pre>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="json-tab">
            <pre className="json-display">
              <code>
                {JSON.stringify(
                  {
                    file: activeFilePath,
                    components: placedComponents.length,
                    connections: connections.length,
                    selectedComponent: selectedComponent
                      ? { id: selectedComponent.id, name: selectedComponent.name }
                      : null
                  },
                  null,
                  2
                )}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

