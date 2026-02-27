import React, { useRef, useState, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { PlacedComponent } from '../types/catalog'
import { getCatalogItem } from '../catalog'
import { SchematicSymbol } from './SchematicSymbol'
import { getPinConfig } from '../types/schematic'

export const Canvas: React.FC = () => {
  const SNAP_STEP = 2
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggedComponentId, setDraggedComponentId] = useState<string | null>(null)
  const [hoveredPin, setHoveredPin] = useState<{ componentId: string; pinName: string } | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null)
  const [isBoxSelecting, setIsBoxSelecting] = useState(false)

  const {
    placedComponents,
    wires,
    selectedComponentIds,
    wiringStart,
    cursorNearPin,
    subcircuitCreation,
    viewport,
    setViewport,
    setSelectedComponents,
    toggleComponentSelection,
    updatePlacedComponent,
    addPlacedComponent,
    startWiring,
    completeWiring,
    cancelWiring,
    toggleSubcircuitPinSelection,
    setCursorNearPin,
    openSubcircuitEditor
  } = useEditorStore()

  const getDynamicPins = (component: PlacedComponent) => {
    if (component.catalogId === 'netport') {
      return [{ name: 'port', x: 0, y: 11 }]
    }

    if (component.catalogId === 'subcircuit-instance') {
      const ports = (component.props.ports as string[] | undefined) || []
      if (ports.length === 0) {
        return [{ name: 'IO', x: 0, y: 20 }]
      }
      return ports.map((portName, index) => {
        const row = Math.floor(index / 2)
        const isLeft = index % 2 === 0
        return {
          name: portName,
          x: isLeft ? 0 : 130,
          y: 18 + row * 18
        }
      })
    }

    if (component.catalogId === 'customchip') {
      const count = Math.max(2, Number(component.props.pinCount || 8))
      const parsedNames = String(component.props.pinNames || '')
        .split(',')
        .map((value: string) => value.trim())
        .filter(Boolean)

      const leftCount = Math.ceil(count / 2)
      const rightCount = Math.floor(count / 2)
      const leftSpacing = 20
      const rightSpacing = 20

      const leftPins = Array.from({ length: leftCount }).map((_, index) => ({
        name: parsedNames[index] || `pin${index + 1}`,
        x: 0,
        y: 20 + index * leftSpacing
      }))

      const rightPins = Array.from({ length: rightCount }).map((_, index) => ({
        name: parsedNames[leftCount + index] || `pin${leftCount + index + 1}`,
        x: 100,
        y: 20 + index * rightSpacing
      }))

      return [...leftPins, ...rightPins]
    }

    const schematic = getPinConfig(component.catalogId)
    return schematic?.pins.map(pin => ({ name: pin.name, x: pin.x, y: pin.y })) || []
  }

  const getComponentSize = (component: PlacedComponent) => {
    if (component.catalogId === 'netport') {
      return { width: 72, height: 22 }
    }
    if (component.catalogId === 'subcircuit-instance') {
      const portCount = ((component.props.ports as string[] | undefined) || []).length
      const rows = Math.max(1, Math.ceil(portCount / 2))
      return { width: 130, height: Math.max(46, 28 + rows * 18) }
    }
    if (component.catalogId === 'customchip') {
      const count = Math.max(2, Number(component.props.pinCount || 8))
      return {
        width: 100,
        height: Math.max(80, 24 + Math.ceil(count / 2) * 20)
      }
    }
    const schematic = getPinConfig(component.catalogId)
    return {
      width: schematic?.width || 60,
      height: schematic?.height || 40
    }
  }

  const getPinPositionForComponent = (component: PlacedComponent, pinName: string): { x: number; y: number } | null => {
    const pin = getDynamicPins(component).find(p => p.name === pinName)
    if (!pin) return null
    return {
      x: (component.props.schX || 0) + pin.x,
      y: (component.props.schY || 0) + pin.y
    }
  }

  // Handle canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-grid')) {
      // Ctrl+drag for selection box
      if (e.ctrlKey || e.metaKey) {
        setIsBoxSelecting(true)
        const rect = canvasRef.current?.getBoundingClientRect()
        if (rect) {
          const startX = e.clientX - rect.left - viewport.x
          const startY = e.clientY - rect.top - viewport.y
          setSelectionBox({ start: { x: startX, y: startY }, end: { x: startX, y: startY } })
        }
        return
      }
      
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
      
      // Clear selection
      setSelectedComponents([])
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isBoxSelecting && selectionBox) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const endX = e.clientX - rect.left - viewport.x
        const endY = e.clientY - rect.top - viewport.y
        setSelectionBox({ ...selectionBox, end: { x: endX, y: endY } })
      }
      return
    }
    
    if (isPanning) {
      setViewport({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleCanvasMouseUp = () => {
    if (isBoxSelecting && selectionBox) {
      // Select all components within the box
      const minX = Math.min(selectionBox.start.x, selectionBox.end.x)
      const maxX = Math.max(selectionBox.start.x, selectionBox.end.x)
      const minY = Math.min(selectionBox.start.y, selectionBox.end.y)
      const maxY = Math.max(selectionBox.start.y, selectionBox.end.y)
      
      const selectedIds = placedComponents.filter(comp => {
        const compX = comp.props.schX || 0
        const compY = comp.props.schY || 0
        const schematic = getPinConfig(comp.catalogId)
        const width = schematic?.width || 60
        const height = schematic?.height || 40
        
        return compX >= minX && compX + width <= maxX && compY >= minY && compY + height <= maxY
      }).map(comp => comp.id)
      
      setSelectedComponents(selectedIds)
      setSelectionBox(null)
      setIsBoxSelecting(false)
    }
    setIsPanning(false)
  }

  // Handle drop from catalog
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const catalogItemId = e.dataTransfer.getData('catalogItemId')
    const subcircuitName = e.dataTransfer.getData('subcircuitName')
    
    if (!canvasRef.current) return

    // Calculate drop position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left - viewport.x) / SNAP_STEP) * SNAP_STEP
    const y = Math.round((e.clientY - rect.top - viewport.y) / SNAP_STEP) * SNAP_STEP

    if (subcircuitName) {
      const existingNames = placedComponents.map(c => c.name)
      const base = subcircuitName
      let i = 1
      let uniqueName = `${base}${i}`
      while (existingNames.includes(uniqueName)) {
        i += 1
        uniqueName = `${base}${i}`
      }

      const subcircuitFile = useEditorStore.getState().fsMap[`subcircuits/${subcircuitName}.tsx`] || ''
      const ports = [...new Set(Array.from(subcircuitFile.matchAll(/net\.([A-Za-z_][A-Za-z0-9_]*)/g)).map(m => m[1]))]

      addPlacedComponent({
        id: `sub-${Date.now()}-${Math.random()}`,
        catalogId: 'subcircuit-instance',
        name: uniqueName,
        props: {
          subcircuitName,
          ports,
          schX: x,
          schY: y
        },
        tsxSnippet: `<${subcircuitName} name="${uniqueName}" schX={${x}} schY={${y}} />`
      })
      return
    }

    // Handle regular catalog item drop
    if (!catalogItemId) return

    const catalogItem = getCatalogItem(catalogItemId)
    if (!catalogItem) return

    // Generate unique name
    const baseName = catalogItem.metadata.defaultProps.name || 'COMP'
    const existingNames = placedComponents.map(c => c.name)
    let counter = 1
    let uniqueName = baseName

    if (catalogItemId !== 'net') {
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
    
    // Single select if not already selected
    if (!selectedComponentIds.includes(componentId)) {
      setSelectedComponents([componentId])
    }
    
    setDraggedComponentId(componentId)
    
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

        const newX = Math.round((schX + dx) / SNAP_STEP) * SNAP_STEP
        const newY = Math.round((schY + dy) / SNAP_STEP) * SNAP_STEP

        const newProps = {
          ...comp.props,
          schX: newX,
          schY: newY
        }

        if (comp.catalogId === 'subcircuit-instance') {
          updatePlacedComponent(id, {
            props: newProps,
            tsxSnippet: `<${comp.props.subcircuitName} name="${comp.name}" schX={${newX}} schY={${newY}} />`
          })
          return
        }

        const catalogItem = getCatalogItem(comp.catalogId)
        if (!catalogItem) return

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

    if (subcircuitCreation.active) {
      toggleSubcircuitPinSelection(componentId, pinName)
      return
    }
    
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
      const pins = getDynamicPins(component)

      for (const pin of pins) {
        const pinPos = getPinPositionForComponent(component, pin.name)

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
    
    if (!fromComp || !toComp) {
      console.log('Wire missing component:', wire, { fromComp, toComp })
      return null
    }

    const fromPos = getPinPositionForComponent(fromComp, wire.from.pinName)
    const toPos = getPinPositionForComponent(toComp, wire.to.pinName)

    if (!fromPos || !toPos) return null

    // Calculate offset for multiple wires to the same pin
    // Find how many wires use this exact pin pair
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

    const fromPos = getPinPositionForComponent(fromComp, wiringStart.pinName)
    const toPos = getPinPositionForComponent(toComp, hoveredPin.pinName)

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
              width: '4000px', 
              height: '4000px',
              pointerEvents: 'none',
              overflow: 'visible'
            }}
            viewBox="0 0 4000 4000"
          >
            {wires.map((wire, idx) => renderWire(wire, idx))}
            {renderTempWire()}
            
            {/* Selection box */}
            {selectionBox && (
              <rect
                x={Math.min(selectionBox.start.x, selectionBox.end.x)}
                y={Math.min(selectionBox.start.y, selectionBox.end.y)}
                width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
                height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
                fill="rgba(0, 122, 204, 0.1)"
                stroke="#007acc"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </svg>

          {/* Render components */}
          {placedComponents.map((component) => {
            const pins = getDynamicPins(component)
            const { width, height } = getComponentSize(component)
            const isSelected = selectedComponentIds.includes(component.id)
            const isSubcircuit = component.catalogId === 'subcircuit-instance'
            const isNetPort = component.catalogId === 'netport'
            const isNet = component.catalogId === 'net'

            if (!isSubcircuit && !isNetPort && !getCatalogItem(component.catalogId)) {
              return null
            }
            
            return (
              <div
                key={component.id}
                className={`placed-component ${isSelected ? 'selected' : ''}`}
                style={{
                  left: component.props.schX || 0,
                  top: component.props.schY || 0,
                  width,
                  height,
                  background: isNetPort
                    ? 'rgba(156, 39, 176, 0.15)'
                    : isSubcircuit
                    ? 'rgba(255, 152, 0, 0.12)'
                    : 'transparent',
                  border: isSelected
                    ? '2px solid #007acc'
                    : isNetPort
                    ? '1px dashed rgba(156, 39, 176, 0.7)'
                    : isNet
                    ? 'none'
                    : isSubcircuit
                    ? '2px dashed rgba(255, 152, 0, 0.55)'
                    : '1px solid #3e3e3e',
                  cursor: cursorNearPin?.componentId === component.id ? 'crosshair' : 'move',
                  boxShadow: isSelected ? '0 0 0 2px rgba(0, 122, 204, 0.3)' : 'none',
                  borderRadius: isSubcircuit || isNetPort ? '4px' : '0'
                }}
                onMouseDown={(e) => handleComponentMouseDown(e, component.id)}
                onDoubleClick={() => {
                  if (isSubcircuit && component.props.subcircuitName) {
                    openSubcircuitEditor(component.props.subcircuitName)
                  }
                }}
              >
                {/* Component label */}
                <div style={{
                  position: 'absolute',
                  top: -20,
                  left: 0,
                  fontSize: 11,
                  color: isSelected
                    ? '#007acc'
                    : isNetPort
                    ? '#ce93d8'
                    : isSubcircuit
                    ? '#ff9800'
                    : '#e0e0e0',
                  fontWeight: 500,
                  pointerEvents: 'none'
                }}>
                  {!isNet && (
                    <>
                  {isSubcircuit ? '📦 ' : isNetPort ? '🔌 ' : ''}{component.name}
                  {component.props.resistance && ` (${component.props.resistance})`}
                  {component.props.capacitance && ` (${component.props.capacitance})`}
                    </>
                  )}
                </div>

                {isSubcircuit && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 13,
                    color: '#ff9800',
                    fontWeight: 600,
                    pointerEvents: 'none',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {component.props.subcircuitName}
                  </div>
                )}

                {isNetPort && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 8,
                    transform: 'translateY(-50%)',
                    fontSize: 11,
                    color: '#ce93d8',
                    fontWeight: 600,
                    pointerEvents: 'none'
                  }}>
                    net.{component.props.netName || component.name}
                  </div>
                )}

                {!isSubcircuit && !isNetPort && (
                  <SchematicSymbol 
                    type={component.catalogId}
                    width={width}
                    height={height}
                    color={isSelected ? '#007acc' : '#4CAF50'}
                  />
                )}

                {isNet && (
                  <div style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 11,
                    color: isSelected ? '#007acc' : '#4CAF50',
                    fontWeight: 700,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    maxWidth: '65%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {component.props.name || component.name}
                  </div>
                )}

                {/* Render pins */}
                {pins.map((pin) => {
                  const isPinNearCursor = cursorNearPin?.componentId === component.id && cursorNearPin?.pinName === pin.name
                  const isPinWiringStart = wiringStart?.componentId === component.id && wiringStart?.pinName === pin.name
                  const pinKey = `${component.id}:${pin.name}`
                  const isPinCandidate = subcircuitCreation.candidatePins.some(
                    candidate => `${candidate.componentId}:${candidate.pinName}` === pinKey
                  )
                  const isPinSelectedForSubcircuit = subcircuitCreation.selectedPins.some(
                    selected => `${selected.componentId}:${selected.pinName}` === pinKey
                  )
                  
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
                        background: isPinSelectedForSubcircuit
                          ? '#FF5722'
                          : isPinCandidate && subcircuitCreation.active
                          ? '#FFD54F'
                          : isPinWiringStart
                          ? '#FFC107'
                          : isPinNearCursor
                          ? '#2196F3'
                          : '#888',
                        border: '2px solid #1e1e1e',
                        borderRadius: '50%',
                        cursor: subcircuitCreation.active ? 'pointer' : 'crosshair',
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
