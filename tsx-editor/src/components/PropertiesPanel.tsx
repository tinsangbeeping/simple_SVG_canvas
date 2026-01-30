import React, { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { getCatalogItem } from '../catalog'
import { EditablePropsSchema, PropSchema } from '../types/catalog'

export const PropertiesPanel: React.FC = () => {
  const { selectedComponentIds, placedComponents, updatePlacedComponent, removePlacedComponent, createSubcircuit } = useEditorStore()
  const [subcircuitName, setSubcircuitName] = useState('')
  const [showSubcircuitDialog, setShowSubcircuitDialog] = useState(false)

  // Multi-select case
  if (selectedComponentIds.length > 1) {
    return (
      <div className="right-panel">
        <div className="panel-header">
          {selectedComponentIds.length} Components Selected
        </div>
        <div className="properties-content">
          <div style={{ marginBottom: 15 }}>
            <strong>Selected:</strong>
            {selectedComponentIds.map(id => {
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
            onClick={() => setShowSubcircuitDialog(true)}
            style={{ width: '100%', marginTop: 10 }}
          >
            Create Subcircuit
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => {
              selectedComponentIds.forEach(id => removePlacedComponent(id))
            }}
            style={{ width: '100%', marginTop: 10 }}
          >
            Delete All
          </button>

          {showSubcircuitDialog && (
            <div style={{ marginTop: 15, padding: 10, background: '#2d2d2d', borderRadius: 4 }}>
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
                    if (subcircuitName) {
                      createSubcircuit(subcircuitName, selectedComponentIds)
                      setShowSubcircuitDialog(false)
                      setSubcircuitName('')
                      alert(`Subcircuit "${subcircuitName}" created in lib/patches/`)
                    }
                  }}
                  style={{ flex: 1 }}
                >
                  Create
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowSubcircuitDialog(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
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
  if (!catalogItem) return null

  const schema = catalogItem.metadata.editablePropsSchema

  const handlePropChange = (propName: string, value: any) => {
    const newProps = { ...selectedComponent.props, [propName]: value }
    
    // Regenerate TSX snippet
    const newTsxSnippet = catalogItem.emitTSX(newProps)
    
    updatePlacedComponent(selectedComponent.id, {
      props: newProps,
      tsxSnippet: newTsxSnippet
    })
  }

  const handleDelete = () => {
    removePlacedComponent(selectedComponent.id)
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
          <strong>{catalogItem.metadata.label}</strong>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            {catalogItem.metadata.kind === 'part' ? 'Part' : 'Patch'}
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
