import React, { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getCatalogItem } from '../catalog'
import { ExposedPortSelection, PropSchema } from '../types/catalog'
import { getPinConfig } from '../types/schematic'

export const PropertiesPanel: React.FC = () => {
  const {
    selectedComponentIds,
    placedComponents,
    wires,
    updatePlacedComponent,
    removePlacedComponent,
    createSubcircuit,
    openSubcircuitEditor,
    activeFilePath,
    exposeSubcircuitPort,
    subcircuitCreation,
    beginSubcircuitPinSelection,
    cancelSubcircuitPinSelection
  } = useEditorStore()
  const [subcircuitName, setSubcircuitName] = useState('')
  const [creationStep, setCreationStep] = useState<'select' | 'name'>('select')
  const [selectedPortNames, setSelectedPortNames] = useState<Record<string, string>>({})
  const [portNameByPin, setPortNameByPin] = useState<Record<string, string>>({})

  // Multi-select case
  if (selectedComponentIds.length > 1 || subcircuitCreation.active) {
    const selectedIds = subcircuitCreation.active ? subcircuitCreation.componentIds : selectedComponentIds
    const selectedPinRows = subcircuitCreation.selectedPins.map(pin => {
      const component = placedComponents.find(c => c.id === pin.componentId)
      const key = `${pin.componentId}:${pin.pinName}`
      return {
        key,
        componentId: pin.componentId,
        pinName: pin.pinName,
        componentName: component?.name || pin.componentId
      }
    })

    return (
      <div className="right-panel">
        <div className="panel-header">
          {selectedIds.length} Components Selected
        </div>
        <div className="properties-content">
          <div style={{ marginBottom: 15 }}>
            <strong>Selected:</strong>
            {selectedIds.map(id => {
              const comp = placedComponents.find(c => c.id === id)
              return comp ? (
                <div key={id} style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                  • {comp.name}
                </div>
              ) : null
            })}
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => {
              beginSubcircuitPinSelection(selectedComponentIds)
              setCreationStep('select')
              setSelectedPortNames({})
            }}
            style={{ width: '100%', marginTop: 10 }}
            disabled={subcircuitCreation.active}
          >
            {subcircuitCreation.active ? 'Pin Selection Active' : 'Create Subcircuit'}
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => {
              selectedIds.forEach(id => removePlacedComponent(id))
            }}
            style={{ width: '100%', marginTop: 10 }}
            disabled={subcircuitCreation.active}
          >
            {subcircuitCreation.active ? 'Delete Disabled While Selecting Pins' : 'Delete All'}
          </button>

          {subcircuitCreation.active && creationStep === 'select' && (
            <div style={{ marginTop: 15, padding: 10, background: '#2d2d2d', borderRadius: 4 }}>
              <div className="property-label" style={{ marginBottom: 8 }}>Step 1: Select boundary pins on canvas</div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
                Click yellow pins to select/unselect. Selected pins turn orange. If there are no boundary wires, all pins on selected components become selectable.
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                Candidate pins: {subcircuitCreation.candidatePins.length} • Selected: {subcircuitCreation.selectedPins.length}
              </div>

              {selectedPinRows.length > 0 && (
                <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #3e3e3e', borderRadius: 4, padding: 8, marginBottom: 10 }}>
                  {selectedPinRows.map(pin => (
                    <div key={pin.key} style={{ fontSize: 12, color: '#ffb74d', marginBottom: 4 }}>
                      • {pin.componentName}.{pin.pinName}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-primary"
                  disabled={subcircuitCreation.selectedPins.length === 0}
                  onClick={() => {
                    const defaults: Record<string, string> = {}
                    subcircuitCreation.selectedPins.forEach(pin => {
                      defaults[`${pin.componentId}:${pin.pinName}`] = pin.pinName.toUpperCase()
                    })
                    setSelectedPortNames(defaults)
                    setCreationStep('name')
                  }}
                  style={{ flex: 1 }}
                >
                  Next: Name Ports
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    cancelSubcircuitPinSelection()
                    setCreationStep('select')
                    setSelectedPortNames({})
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {subcircuitCreation.active && creationStep === 'name' && (
            <div style={{ marginTop: 15, padding: 10, background: '#2d2d2d', borderRadius: 4 }}>
              <div className="property-label">Step 2: Name ports and subcircuit</div>
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 10 }}>
                {selectedPinRows.map(pin => {
                  const key = pin.key
                  const value = selectedPortNames[key] ?? pin.pinName.toUpperCase()
                  return (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: '#bbb', alignSelf: 'center' }}>{pin.componentName}.{pin.pinName}</div>
                      <input
                        className="property-input"
                        value={value}
                        onChange={(e) => setSelectedPortNames(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="PORT"
                        style={{ height: 28, fontSize: 12 }}
                      />
                    </div>
                  )
                })}
              </div>

              <label className="property-label">Subcircuit Name</label>
              <input
                type="text"
                className="property-input"
                value={subcircuitName}
                onChange={(e) => setSubcircuitName(e.target.value)}
                placeholder="MySubcircuit"
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (!subcircuitName) return

                    const exposedPorts: ExposedPortSelection[] = subcircuitCreation.selectedPins.map(pin => {
                      const key = `${pin.componentId}:${pin.pinName}`
                      return {
                        componentId: pin.componentId,
                        pinName: pin.pinName,
                        portName: (selectedPortNames[key] || pin.pinName.toUpperCase()).trim()
                      }
                    })

                    createSubcircuit(subcircuitName, subcircuitCreation.componentIds, exposedPorts)
                    setSubcircuitName('')
                    setSelectedPortNames({})
                    setCreationStep('select')
                    alert(`Subcircuit "${subcircuitName}" created in subcircuits/`)
                  }}
                  style={{ flex: 1 }}
                >
                  Create
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setCreationStep('select')
                  }}
                  style={{ flex: 1 }}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Single select case
  const selectedComponent = placedComponents.find((c) => c.id === selectedComponentIds[0])

  if (!selectedComponent) {
    return (
      <div className="right-panel">
        <div className="panel-header">Properties</div>
        <div className="empty-state">
          Select a component to view properties
          <div style={{ marginTop: 10, fontSize: 11, color: '#666' }}>
            Tip: Hold Ctrl/Cmd and click to select multiple
          </div>
        </div>
      </div>
    )
  }

  const catalogItem = getCatalogItem(selectedComponent.catalogId)
  const isSubcircuitInstance = selectedComponent.catalogId === 'subcircuit-instance'
  if (!catalogItem && !isSubcircuitInstance) return null

  const handleDelete = () => {
    removePlacedComponent(selectedComponent.id)
  }

  if (isSubcircuitInstance) {
    const subcircuitName = selectedComponent.props.subcircuitName as string
    const ports = (selectedComponent.props.ports as string[] | undefined) || []
    return (
      <div className="right-panel">
        <div className="panel-header">Subcircuit Instance</div>
        <div className="properties-content">
          <div style={{ marginBottom: 12 }}>
            <strong>{selectedComponent.name}</strong>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Type: {subcircuitName}</div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => openSubcircuitEditor(subcircuitName)}
          >
            Open Subcircuit
          </button>

          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>Ports</div>
          {ports.length === 0 ? (
            <div style={{ fontSize: 12, color: '#777' }}>No exposed ports</div>
          ) : (
            ports.map((port) => (
              <div key={port} style={{ fontSize: 12, color: '#ce93d8', marginBottom: 4 }}>
                • {port}
              </div>
            ))
          )}

          <button
            className="btn btn-secondary"
            onClick={handleDelete}
            style={{ width: '100%', marginTop: 12 }}
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  const schema = catalogItem!.metadata.editablePropsSchema
  const isInSubcircuitFile = activeFilePath.startsWith('subcircuits/')
  const pins = getPinConfig(selectedComponent.catalogId)?.pins || []

  const exposedPortMap = new Map<string, string>()
  wires.forEach((wire) => {
    const fromComp = placedComponents.find(c => c.id === wire.from.componentId)
    const toComp = placedComponents.find(c => c.id === wire.to.componentId)
    if (!fromComp || !toComp) return

    if (fromComp.id === selectedComponent.id && toComp.catalogId === 'netport') {
      exposedPortMap.set(wire.from.pinName, toComp.props.netName || toComp.name)
    }

    if (toComp.id === selectedComponent.id && fromComp.catalogId === 'netport') {
      exposedPortMap.set(wire.to.pinName, fromComp.props.netName || fromComp.name)
    }
  })

  const handlePropChange = (propName: string, value: any) => {
    const newProps = { ...selectedComponent.props, [propName]: value }
    
    // Regenerate TSX snippet
    const newTsxSnippet = catalogItem!.emitTSX(newProps)
    
    updatePlacedComponent(selectedComponent.id, {
      ...(propName === 'name' ? { name: String(value || selectedComponent.name) } : {}),
      props: newProps,
      tsxSnippet: newTsxSnippet
    })
  }

  return (
    <div className="right-panel">
      <div className="panel-header">
        Properties
        <button 
          className="btn btn-secondary"
          onClick={handleDelete}
          style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '11px' }}
        >
          Delete
        </button>
      </div>

      <div className="properties-content">
        <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #3e3e3e' }}>
          <strong>{catalogItem!.metadata.label}</strong>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            {catalogItem!.metadata.kind === 'part' ? 'Part' : 'Subcircuit'}
          </div>
        </div>

        {Object.entries(schema).map(([propName, propSchema]) => (
          <div key={propName} className="property-group">
            <PropertyEditor
              label={propSchema.label}
              propName={propName}
              propSchema={propSchema}
              value={selectedComponent.props[propName]}
              onChange={(value) => handlePropChange(propName, value)}
            />
          </div>
        ))}

        {isInSubcircuitFile && pins.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #3e3e3e' }}>
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, fontWeight: 600 }}>
              Exposed Subcircuit Ports
            </div>
            {pins.map(pin => {
              const value = portNameByPin[pin.name] ?? pin.name.toUpperCase()
              const linkedPort = exposedPortMap.get(pin.name)
              return (
                <div key={pin.name} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                    {pin.name}{linkedPort ? ` → net.${linkedPort}` : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 8 }}>
                    <input
                      type="text"
                      className="property-input"
                      value={value}
                      onChange={(e) => setPortNameByPin(prev => ({ ...prev, [pin.name]: e.target.value }))}
                      placeholder="PORT_NAME"
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => exposeSubcircuitPort(selectedComponent.id, pin.name, value)}
                    >
                      Expose
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface PropertyEditorProps {
  label: string
  propName: string
  propSchema: PropSchema
  value: any
  onChange: (value: any) => void
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({
  label,
  propName,
  propSchema,
  value,
  onChange
}) => {
  const displayLabel = propSchema.unit ? `${label} (${propSchema.unit})` : label

  if (propSchema.type === 'select') {
    return (
      <>
        <label className="property-label">{displayLabel}</label>
        <select
          className="property-select"
          value={value || propSchema.default}
          onChange={(e) => onChange(e.target.value)}
        >
          {propSchema.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </>
    )
  }

  if (propSchema.type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={value || propSchema.default}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="property-label" style={{ margin: 0 }}>{displayLabel}</span>
      </label>
    )
  }

  const inputType = propSchema.type === 'number' ? 'number' : 'text'

  return (
    <>
      <label className="property-label">{displayLabel}</label>
      <input
        type={inputType}
        className="property-input"
        value={value ?? propSchema.default ?? ''}
        onChange={(e) => {
          const newValue = propSchema.type === 'number' 
            ? parseFloat(e.target.value) 
            : e.target.value
          onChange(newValue)
        }}
      />
    </>
  )
}
