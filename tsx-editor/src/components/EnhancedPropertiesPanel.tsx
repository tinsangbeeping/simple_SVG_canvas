import React, { useState } from 'react'
import { PlacedComponent, WireConnection, FSMap } from '../types/catalog'
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
                  <input type="text" value={selectedComponent.name} readOnly />
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

