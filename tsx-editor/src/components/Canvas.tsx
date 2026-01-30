import React, { useRef, useState, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { PlacedComponent } from '../types/catalog'
import { getCatalogItem } from '../catalog'
import { SchematicSymbol } from './SchematicSymbol'
import { getPinConfig, getPinPosition } from '../types/schematic'

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null)
  const [hoveredPin, setHoveredPin] = useState<{ componentId: string; pinName: string } | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')

  const {
    placedComponents,
    wires,
    selectedComponentIds,
    wiringStart,
    cursorNearPin,
    viewport,
    setViewport,
    setSelectedComponents,
    toggleComponentSelection,
    updatePlacedComponent,
    addPlacedComponent,
    startWiring,
    completeWiring,
    cancelWiring,
    setCursorNearPin
  } = useEditorStore()

  // Handle canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
      
      // Clear selection if not ctrl-clicking
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedComponents([])
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleCanvasMouseUp = () => {
    setIsPanning(false)
  }

  // Handle drop from catalog
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const catalogItemId = e.dataTransfer.getData('catalogItemId')
    
    if (!catalogItemId || !canvasRef.current) return

    const catalogItem = getCatalogItem(catalogItemId)
    if (!catalogItem) return

    // Calculate drop position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left - viewport.x) / 20) * 20 // Snap to grid
    const y = Math.round((e.clientY - rect.top - viewport.y) / 20) * 20

    // Generate unique name
    const baseName = catalogItem.metadata.defaultProps.name || 'COMP'
    const existingNames = placedComponents.map(c => c.name)
    let counter = 1
    let uniqueName = baseName
    
    while (existingNames.includes(uniqueName)) {
      const match = baseName.match(/^([A-Z]+)(\d*)$/)
      if (match) {
        const prefix = match[1]
        uniqueName = `${prefix}${counter}`
        counter++
      } else {
        uniqueName = `${baseName}${counter}`
        counter++
      }
    }

    const props = {
      ...catalogItem.metadata.defaultProps,
      name: uniqueName,
      schX: x,
      schY: y
    }

    const newComponent: PlacedComponent = {
      id: `comp-${Date.now()}-${Math.random()}`,
      catalogId: catalogItemId,
      name: uniqueName,
      props,
      tsxSnippet: catalogItem.emitTSX(props)
    }

    addPlacedComponent(newComponent)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle component dragging
  const handleComponentMouseDown = (e: React.MouseEvent, componentId: string) => {
    e.stopPropagation()
    
    // Check if clicking near a pin
    if (cursorNearPin && cursorNearPin.componentId === componentId) {
      return // Let pin click handle it
    }
    
    // Multi-select with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      toggleComponentSelection(componentId)
      return
    }
    
    // Single select if not already selected
    if (!selectedComponentIds.includes(componentId)) {
      setSelectedComponents([componentId])
    }
    
    setDraggedComponentId(componentId)
    
    const component = placedComponents.find(c => c.id === componentId)
    if (!component) return

    const startX = e.clientX
    const startY = e.clientY
    
    // Get all selected components for group dragging
    const selectedComps = placedComponents.filter(c => selectedComponentIds.includes(c.id))
    const initialPositions = selectedComps.map(c => ({
      id: c.id,
      schX: c.props.schX || 0,
      schY: c.props.schY || 0
    }))

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      
      // Move all selected components
      initialPositions.forEach(({ id, schX, schY }) => {
        const comp = placedComponents.find(c => c.id === id)
        if (!comp) return

        const newX = Math.round((schX + dx) / 20) * 20 // Snap to grid
        const newY = Math.round((schY + dy) / 20) * 20

        const catalogItem = getCatalogItem(comp.catalogId)
        if (!catalogItem) return

        const newProps = {
          ...comp.props,
          schX: newX,
          schY: newY
        }

        updatePlacedComponent(id, {
          props: newProps,
          tsxSnippet: catalogItem.emitTSX(newProps)
        })
      })
    }

    const handleMouseUp = () => {
      setDraggedComponentId(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Handle pin click for wiring
  const handlePinClick = (e: React.MouseEvent, componentId: string, pinName: string) => {
    e.stopPropagation()
    
    if (!wiringStart) {
      // Start wiring from this pin
      startWiring(componentId, pinName)
    } else {
      // Complete wiring to this pin
      if (wiringStart.componentId !== componentId) {
        completeWiring(componentId, pinName)
      } else {
        // Cancel if clicking same component
        cancelWiring()
      }
    }
  }

  // Check if cursor is near any pin
  const checkCursorNearPin = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left - viewport.x
    const mouseY = e.clientY - rect.top - viewport.y

    let nearPin: { componentId: string; pinName: string } | null = null

    for (const component of placedComponents) {
      const schematic = getPinConfig(component.catalogId)
      if (!schematic) continue

      for (const pin of schematic.pins) {
        const pinPos = getPinPosition(
          component.catalogId,
          pin.name,
          component.props.schX || 0,
          component.props.schY || 0
        )

        if (!pinPos) continue

        const distance = Math.sqrt(
          Math.pow(mouseX - pinPos.x, 2) + Math.pow(mouseY - pinPos.y, 2)
        )

        if (distance < 15) { // 15px threshold
          nearPin = { componentId: component.id, pinName: pin.name }
          break
        }
      }

      if (nearPin) break
    }

    setCursorNearPin(nearPin)
    setHoveredPin(nearPin)
    
    // Update cursor style
    if (nearPin) {
      setCursorStyle('crosshair')
    } else if (isPanning) {
      setCursorStyle('grabbing')
    } else {
      setCursorStyle('default')
    }
  }

  // Render wire between two pins
  const renderWire = (wire: any, wireIndex: number) => {
    const fromComp = placedComponents.find(c => c.id === wire.from.componentId)
    const toComp = placedComponents.find(c => c.id === wire.to.componentId)
    
    if (!fromComp || !toComp) return null

    const fromPos = getPinPosition(
      fromComp.catalogId,
      wire.from.pinName,
      fromComp.props.schX || 0,
      fromComp.props.schY || 0
    )
    const toPos = getPinPosition(
      toComp.catalogId,
      wire.to.pinName,
      toComp.props.schX || 0,
      toComp.props.schY || 0
    )

    if (!fromPos || !toPos) return null

    // Calculate offset for multiple wires to the same pin
    // Find how many wires use this exact pin pair
    const wiresFromSamePin = wires.filter(w => 
      w.from.componentId === wire.from.componentId && 
      w.from.pinName === wire.from.pinName
    ).length
    
    const wiresConnectedHere = wires.filter(w => 
      (w.to.componentId === wire.from.componentId && w.to.pinName === wire.from.pinName) ||
      (w.from.componentId === wire.from.componentId && w.from.pinName === wire.from.pinName)
    )
    
    // Add offset to route multiple wires differently
    const routeOffset = wiresConnectedHere.length > 1 ? (wireIndex % 3) * 25 : 0
    
    // Create orthogonal routing with dynamic midpoint based on wire count
    const horizontalSpacing = Math.abs(toPos.x - fromPos.x) / 2
    const midX = fromPos.x + horizontalSpacing + routeOffset
    
    return (
      <g key={wire.id}>
        <path
          d={`M ${fromPos.x} ${fromPos.y} L ${midX} ${fromPos.y} L ${midX} ${toPos.y} L ${toPos.x} ${toPos.y}`}
          stroke="#2196F3"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Add dots at connection points */}
        <circle cx={fromPos.x} cy={fromPos.y} r="3" fill="#2196F3" />
        <circle cx={toPos.x} cy={toPos.y} r="3" fill="#2196F3" />
      </g>
    )
  }

  // Render temporary wire during wiring
  const renderTempWire = () => {
    if (!wiringStart || !hoveredPin) return null

    const fromComp = placedComponents.find(c => c.id === wiringStart.componentId)
    const toComp = placedComponents.find(c => c.id === hoveredPin.componentId)
    
    if (!fromComp || !toComp) return null

    const fromPos = getPinPosition(
      fromComp.catalogId,
      wiringStart.pinName,
      fromComp.props.schX || 0,
      fromComp.props.schY || 0
    )
    const toPos = getPinPosition(
      toComp.catalogId,
      hoveredPin.pinName,
      toComp.props.schX || 0,
      toComp.props.schY || 0
    )

    if (!fromPos || !toPos) return null

    const midX = (fromPos.x + toPos.x) / 2

    return (
      <g>
        <path
          d={`M ${fromPos.x} ${fromPos.y} L ${midX} ${fromPos.y} L ${midX} ${toPos.y} L ${toPos.x} ${toPos.y}`}
          stroke="#FFC107"
          strokeWidth="3.5"
          fill="none"
          strokeDasharray="5,5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={fromPos.x} cy={fromPos.y} r="3" fill="#FFC107" />
        <circle cx={toPos.x} cy={toPos.y} r="3" fill="#FFC107" />
      </g>
    )
  }

  return (
    <div className="canvas-container">
      <div
        ref={canvasRef}
        className={`canvas`}
        style={{ cursor: cursorStyle }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={(e) => {
          handleCanvasMouseMove(e)
          checkCursorNearPin(e)
        }}
        onMouseUp={handleCanvasMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div 
          className="canvas-grid"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px)`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`
          }}
        />
        
        <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px)`, position: 'relative' }}>
          {/* Render wires as SVG */}
          <svg 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              pointerEvents: 'none',
              overflow: 'visible'
            }}
          >
            {wires.map((wire, idx) => renderWire(wire, idx))}
            {renderTempWire()}
          </svg>

          {/* Render components */}
          {placedComponents.map((component) => {
            const catalogItem = getCatalogItem(component.catalogId)
            if (!catalogItem) return null

            const schematic = getPinConfig(component.catalogId)
            const width = schematic?.width || 60
            const height = schematic?.height || 40
            const isSelected = selectedComponentIds.includes(component.id)

            return (
              <div
                key={component.id}
                className={`placed-component ${isSelected ? 'selected' : ''}`}
                style={{
                  left: component.props.schX || 0,
                  top: component.props.schY || 0,
                  width,
                  height,
                  background: 'transparent',
                  border: isSelected ? '2px solid #007acc' : '1px solid #3e3e3e',
                  cursor: cursorNearPin?.componentId === component.id ? 'crosshair' : 'move',
                  boxShadow: isSelected ? '0 0 0 2px rgba(0, 122, 204, 0.3)' : 'none'
                }}
                onMouseDown={(e) => handleComponentMouseDown(e, component.id)}
              >
                {/* Component label */}
                <div style={{
                  position: 'absolute',
                  top: -20,
                  left: 0,
                  fontSize: 11,
                  color: isSelected ? '#007acc' : '#e0e0e0',
                  fontWeight: 500,
                  pointerEvents: 'none'
                }}>
                  {component.name}
                  {component.props.resistance && ` (${component.props.resistance})`}
                  {component.props.capacitance && ` (${component.props.capacitance})`}
                </div>

                {/* Schematic symbol */}
                <SchematicSymbol 
                  type={component.catalogId}
                  width={width}
                  height={height}
                  color={isSelected ? '#007acc' : '#4CAF50'}
                />

                {/* Render pins */}
                {schematic?.pins.map((pin) => {
                  const isPinNearCursor = cursorNearPin?.componentId === component.id && cursorNearPin?.pinName === pin.name
                  const isPinWiringStart = wiringStart?.componentId === component.id && wiringStart?.pinName === pin.name
                  
                  return (
                    <div
                      key={pin.name}
                      className="component-pin"
                      style={{
                        position: 'absolute',
                        left: pin.x - 5,
                        top: pin.y - 5,
                        width: isPinNearCursor ? 12 : 10,
                        height: isPinNearCursor ? 12 : 10,
                        background: isPinWiringStart
                          ? '#FFC107'
                          : isPinNearCursor
                          ? '#2196F3'
                          : '#888',
                        border: '2px solid #1e1e1e',
                        borderRadius: '50%',
                        cursor: 'crosshair',
                        zIndex: 10,
                        transition: 'all 0.15s',
                        transform: isPinNearCursor ? 'scale(1.3)' : 'scale(1)'
                      }}
                      onClick={(e) => handlePinClick(e, component.id, pin.name)}
                      title={`${component.name}.${pin.name}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
