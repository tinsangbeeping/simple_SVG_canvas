import React, { useMemo, useState, useEffect } from "react"
import type { SchematicDoc, SymbolInstance, Selection } from "../schematic/types"
import { SymbolInstanceG } from "./SymbolInstanceG"
import { SymbolLibraryPanel } from "./SymbolLibraryPanel"
import { PatchLibraryPanel } from "./PatchLibraryPanel"
import { getAbsPins, computeWirePoints } from "../schematic/pins"
import { autoLayoutELK } from "../schematic/elkLayout"
import { validateSchematicDoc, formatValidationErrors } from "../schematic/validator"
import { migrateToV1, formatMigrationErrors } from "../schematic/migrate"
import { schematicFixtures } from "../fixtures/fixturesIndex"
import { registerSymbol } from "../symbol-lib/registry"
import { getSymbolDef } from "../symbol-lib/registry"
import { detectJSONType, validateSymbolDef } from "../symbol-lib/smartLoad"
import { findHitTarget } from "../schematic/hitTest"
import { registerPatch, getPatch, listPatches, clearAllPatches } from "../patch-lib/registry"
import { extractPatchFromSelection, insertPatch } from "../patch-lib/operations"
import { computeSymbolBBox } from "../symbol-dsl/geometry"
import { loadSchematic as loadSchematicFromStorage, saveSchematic as saveSchematicToStorage } from "../storage"
import { exportCircuitJSON } from "../schematic/netExtraction"

const GRID = 20
const W = 900
const H = 500

function snap(n: number) {
  return Math.round(n / GRID) * GRID
}

function loadSchematic(): SchematicDoc {
  return loadSchematicFromStorage(demoDoc())
}

function saveSchematic(doc: SchematicDoc) {
  saveSchematicToStorage(doc)
}

function demoDoc(): SchematicDoc {
  return {
    schemaVersion: 1,
    instances: [
      { id: "i1", symbolId: "R", pos: { x: 140, y: 140 }, rotDeg: 0 },
      { id: "i2", symbolId: "R", pos: { x: 320, y: 140 }, rotDeg: 0 },
      { id: "i3", symbolId: "GND", pos: { x: 230, y: 260 }, rotDeg: 0 },
    ],
    wires: [],
  }
}

export function SchematicCanvas() {
  const [doc, setDoc] = useState<SchematicDoc>(() => loadSchematic())
  const [selection, setSelection] = useState<Selection>(null)
  const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set())
  const [drag, setDrag] = useState<null | { id: string; offsetX: number; offsetY: number }>(null)
  const [pendingPin, setPendingPin] = useState<null | { instId: string; pinName: string; x: number; y: number }>(
    null
  )
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null)
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null)
  const [placementMode, setPlacementMode] = useState<"symbol" | "patch" | null>(null)
  const [libraryVersion, setLibraryVersion] = useState(0) // Force re-render when library changes
  const [hoveredPin, setHoveredPin] = useState<string | null>(null)
  
  // Canvas view state (zoom and pan)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: W, height: H })
  const [zoom, setZoom] = useState(1)

  // Ctrl+drag rectangle selection (for patch selection)
  const [rectSelect, setRectSelect] = useState<null | { start: { x: number; y: number }; end: { x: number; y: number } }>(
    null
  )

  // Auto-save schematic on change
  useEffect(() => {
    saveSchematic(doc)
  }, [doc])
  
  // Update viewBox when zoom changes
  useEffect(() => {
    const scaledW = W / zoom
    const scaledH = H / zoom
    setViewBox((vb) => ({
      x: vb.x,
      y: vb.y,
      width: scaledW,
      height: scaledH,
    }))
  }, [zoom])

  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = []
    for (let x = 0; x <= W; x += GRID) {
      lines.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#222" strokeWidth={1} />)
    }
    for (let y = 0; y <= H; y += GRID) {
      lines.push(<line key={`hy${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#222" strokeWidth={1} />)
    }
    return lines
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "r" || e.key === "R") {
        if (selection && selection.type === "instance") {
          setDoc((prev) => ({
            ...prev,
            instances: prev.instances.map((inst) =>
              inst.id === selection.id
                ? { ...inst, rotDeg: ((inst.rotDeg + 90) % 360) as 0 | 90 | 180 | 270 }
                : inst
            ),
          }))
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          if (selection.type === "instance") {
            // Delete instance and all connected wires
            setDoc((prev) => ({
              ...prev,
              instances: prev.instances.filter((inst) => inst.id !== selection.id),
              wires: prev.wires.filter(
                (wire) => wire.a.instId !== selection.id && wire.b.instId !== selection.id
              ),
            }))
          } else if (selection.type === "wire") {
            // Delete wire
            setDoc((prev) => ({
              ...prev,
              wires: prev.wires.filter((wire) => wire.id !== selection.id),
            }))
          }
          setSelection(null)
        } else if (multiSelection.size > 0) {
          // Delete multiple selected instances
          setDoc((prev) => ({
            ...prev,
            instances: prev.instances.filter((inst) => !multiSelection.has(inst.id)),
            wires: prev.wires.filter(
              (wire) => !multiSelection.has(wire.a.instId) && !multiSelection.has(wire.b.instId)
            ),
          }))
          setMultiSelection(new Set())
        }
      } else if (e.key === "Escape") {
        setPendingPin(null)
        setPlacementMode(null)
        setSelectedSymbolId(null)
        setSelectedPatchId(null)
        setSelection(null)
        setMultiSelection(new Set())
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selection, multiSelection])

  function mouseToSvg(svg: SVGSVGElement, e: React.MouseEvent) {
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const sp = pt.matrixTransform(ctm.inverse())
    return { x: sp.x, y: sp.y }
  }

  function rotatePointLocal(x: number, y: number, rotDeg: 0 | 90 | 180 | 270) {
    switch (rotDeg) {
      case 0:
        return { x, y }
      case 90:
        return { x: -y, y: x }
      case 180:
        return { x: -x, y: -y }
      case 270:
        return { x: y, y: -x }
    }
  }

  function getWorldBBoxForInstance(inst: SymbolInstance, margin = 0) {
    const sym = getSymbolDef(inst.symbolId)
    if (!sym) {
      return { minX: inst.pos.x - 20, minY: inst.pos.y - 20, maxX: inst.pos.x + 20, maxY: inst.pos.y + 20 }
    }
    const bbox = sym.bbox && sym.bbox.w > 0 && sym.bbox.h > 0 ? sym.bbox : computeSymbolBBox(sym)
    const corners = [
      { x: bbox.x, y: bbox.y },
      { x: bbox.x + bbox.w, y: bbox.y },
      { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
      { x: bbox.x, y: bbox.y + bbox.h },
    ].map((c) => rotatePointLocal(c.x, c.y, inst.rotDeg))

    const xs = corners.map((p) => inst.pos.x + p.x)
    const ys = corners.map((p) => inst.pos.y + p.y)
    const minX = Math.min(...xs) - margin
    const maxX = Math.max(...xs) + margin
    const minY = Math.min(...ys) - margin
    const maxY = Math.max(...ys) + margin
    return { minX, minY, maxX, maxY }
  }

  function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
    const x1 = Math.min(a.x, b.x)
    const y1 = Math.min(a.y, b.y)
    const x2 = Math.max(a.x, b.x)
    const y2 = Math.max(a.y, b.y)
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, x2, y2 }
  }

  function rectsIntersect(r1: { x: number; y: number; w: number; h: number }, r2: { x: number; y: number; w: number; h: number }) {
    return !(r2.x > r1.x + r1.w || r2.x + r2.w < r1.x || r2.y > r1.y + r1.h || r2.y + r2.h < r1.y)
  }

  function onInstMouseDown(e: React.MouseEvent, inst: SymbolInstance) {
    e.stopPropagation()
    setSelection({ type: "instance", id: inst.id })
    const svg = (e.currentTarget as SVGElement).ownerSVGElement as SVGSVGElement
    const p = mouseToSvg(svg, e)
    setDrag({ id: inst.id, offsetX: p.x - inst.pos.x, offsetY: p.y - inst.pos.y })
  }

  function onMouseMove(e: React.MouseEvent) {
    const svg = e.currentTarget as SVGSVGElement
    const p = mouseToSvg(svg, e)

    if (rectSelect) {
      setRectSelect((prev) => (prev ? { ...prev, end: { x: p.x, y: p.y } } : prev))
      return
    }

    if (!drag) return
    const nx = snap(p.x - drag.offsetX)
    const ny = snap(p.y - drag.offsetY)
    setDoc((prev) => ({
      ...prev,
      instances: prev.instances.map((inst) =>
        inst.id === drag.id ? { ...inst, pos: { x: nx, y: ny } } : inst
      ),
    }))
  }

  function onMouseUp() {
    setDrag(null)

    if (rectSelect) {
      const r = rectFromPoints(rectSelect.start, rectSelect.end)
      const selectedIds = new Set<string>()
      for (const inst of doc.instances) {
        const bb = getWorldBBoxForInstance(inst, 5)
        const instRect = { x: bb.minX, y: bb.minY, w: bb.maxX - bb.minX, h: bb.maxY - bb.minY }
        if (rectsIntersect(r, instRect)) {
          selectedIds.add(inst.id)
        }
      }
      setMultiSelection(selectedIds)
      setSelection(null)
      setRectSelect(null)
    }
  }

  function onCanvasMouseDown(e: React.MouseEvent) {
    // Ctrl+drag rectangle selection (like the screenshot) for selecting a patch group.
    // Only start on empty canvas (not while placing / wiring / dragging).
    if ((e.ctrlKey || e.metaKey) && !placementMode && !pendingPin) {
      const svg = e.currentTarget as SVGSVGElement
      const p = mouseToSvg(svg, e)
      setRectSelect({ start: { x: p.x, y: p.y }, end: { x: p.x, y: p.y } })
      return
    }

    if (placementMode === "symbol" && selectedSymbolId) {
      const svg = e.currentTarget as SVGSVGElement
      const p = mouseToSvg(svg, e)
      
      // Prompt for tag name if placing a Tag symbol
      let tagName: string | undefined
      if (selectedSymbolId === "Tag") {
        const defaultTags = ["NET1", "SCL", "SDA", "VREF", "MISO", "MOSI", "CLK", "RST"]
        const suggestion = defaultTags[0]
        const input = prompt(`Enter tag name for net label:`, suggestion)
        if (input === null) {
          // User cancelled
          return
        }
        tagName = input.trim() || suggestion
      }
      
      const newInst: SymbolInstance = {
        id: `inst_${Date.now()}`,
        symbolId: selectedSymbolId,
        pos: { x: snap(p.x), y: snap(p.y) },
        rotDeg: 0,
        ...(tagName && { tag: tagName }),
      }
      setDoc((prev) => ({ ...prev, instances: [...prev.instances, newInst] }))
      // Stay in placement mode for multiple placements
    } else if (placementMode === "patch" && selectedPatchId) {
      const svg = e.currentTarget as SVGSVGElement
      const p = mouseToSvg(svg, e)
      try {
        const patch = getPatch(selectedPatchId)
        if (!patch) {
          alert(`Patch not found: ${selectedPatchId}`)
          return
        }
        const newDoc = insertPatch(doc, patch, p)
        setDoc(newDoc)
        alert(`✓ Patch placed`)
      } catch (err) {
        alert(`Failed to place patch: ${err instanceof Error ? err.message : String(err)}`)
      }
    } else {
      const svg = e.currentTarget as SVGSVGElement
      const p = mouseToSvg(svg, e)
      const hit = findHitTarget(p, doc)
      
      if (e.ctrlKey || e.metaKey) {
        // Multi-select mode
        if (hit?.type === "instance") {
          setMultiSelection((prev) => {
            const next = new Set(prev)
            if (next.has(hit.id)) {
              next.delete(hit.id)
            } else {
              next.add(hit.id)
            }
            return next
          })
        }
      } else {
        // Single select mode
        setSelection(hit)
        setMultiSelection(new Set())
      }
    }
  }

  function handlePlaceSymbol(symbolId: string) {
    setSelectedSymbolId(symbolId)
    setSelectedPatchId(null)
    setPlacementMode("symbol")
  }

  function handlePlacePatch(patchId: string) {
    setSelectedPatchId(patchId)
    setSelectedSymbolId(null)
    setPlacementMode("patch")
  }

  function handleSavePatch() {
    if (multiSelection.size === 0) {
      alert("Please select instances first (Ctrl+Click to multi-select)")
      return
    }

    const name = prompt("Enter patch name:")
    if (!name) return

    const description = prompt("Enter patch description (optional):") || ""

    try {
      const patch = extractPatchFromSelection(doc, multiSelection, name, description)
      registerPatch(patch)
      alert(`✓ Patch "${name}" saved with ${patch.instances.length} instances, ${patch.wires.length} wires, ${patch.ports.length} ports`)
      setMultiSelection(new Set())
      setSelection(null)
    } catch (err) {
      alert(`Failed to save patch: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  
  function handleExportPatches() {
    const patches = listPatches()
    const json = JSON.stringify(patches, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `patches_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  function handleImportPatches() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const patches = JSON.parse(event.target?.result as string)
          if (!Array.isArray(patches)) {
            alert("Invalid patch file format")
            return
          }

          const overwriteAll = confirm(
            "匯入 Patch：按「確定」= 覆蓋模式（清空現有再匯入）\n按「取消」= 合併模式（以 patch.id 覆蓋同 ID，保留其餘）"
          )

          const existing = listPatches()
          const existingIds = new Set(existing.map((p) => p.id))

          if (overwriteAll) {
            clearAllPatches()
          }

          let importedValid = 0
          let overwritten = 0

          for (const p of patches) {
            // Minimal validation (runtime); schema validation lives under src/schemas.
            if (
              p &&
              typeof p.id === "string" &&
              typeof p.name === "string" &&
              Array.isArray(p.instances) &&
              Array.isArray(p.wires) &&
              Array.isArray(p.ports)
            ) {
              importedValid++
              if (!overwriteAll && existingIds.has(p.id)) overwritten++
              registerPatch(p) // same id => overwrite
            }
          }

          alert(
            `✓ Imported ${importedValid} patch(es)` +
              (overwriteAll ? " (overwrite mode)" : ` (merge mode, overwritten: ${overwritten})`)
          )
          setLibraryVersion((v) => v + 1) // Force refresh
        } catch (err) {
          alert(`Failed to import patches: ${err}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }
  
  function handleZoomIn() {
    setZoom((z) => Math.min(z * 1.2, 5))
  }
  
  function handleZoomOut() {
    setZoom((z) => Math.max(z / 1.2, 0.1))
  }
  
  function handleResetView() {
    setViewBox({ x: 0, y: 0, width: W, height: H })
    setZoom(1)
  }

  function loadExample() {
    if (schematicFixtures.length === 0) {
      alert("No example schematics available")
      return
    }

    const choice = prompt(
      `Available examples:\n\n` +
        schematicFixtures.map((f, i) => `${i + 1}. ${f.name}\n   ${f.description}`).join("\n\n") +
        `\n\nEnter number (1-${schematicFixtures.length}):`
    )

    if (!choice) return

    const idx = parseInt(choice) - 1
    if (idx < 0 || idx >= schematicFixtures.length || isNaN(idx)) {
      alert("Invalid choice")
      return
    }

    const example = schematicFixtures[idx]
    setDoc(example.schematicDoc)
    alert(`✓ Loaded: ${example.name}`)
  }

  function autoTidy() {
    // Simple auto-arrange: arrange instances in a grid
    const spacing = 200
    setDoc((prev) => ({
      ...prev,
      instances: prev.instances.map((inst, idx) => ({
        ...inst,
        pos: {
          x: 100 + (idx % 3) * spacing,
          y: 100 + Math.floor(idx / 3) * spacing,
        },
      })),
    }))
  }

  async function autoLayoutWithELK() {
    const newDoc = await autoLayoutELK(doc)
    setDoc(newDoc)
  }

  function exportJSON() {
    const validation = validateSchematicDoc(doc)
    if (!validation.valid) {
      alert(`Validation errors:\n${formatValidationErrors(validation)}`)
      return
    }
    const json = JSON.stringify(doc, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `schematic.v1.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCircuitNetlist() {
    try {
      // Clean up document: remove wires referencing non-existent instances
      const validInstanceIds = new Set(doc.instances.map(inst => inst.id))
      const cleanedDoc = {
        ...doc,
        wires: doc.wires.filter(wire => 
          validInstanceIds.has(wire.a.instId) && validInstanceIds.has(wire.b.instId)
        )
      }
      
      // Show warning if wires were removed
      const removedWiresCount = doc.wires.length - cleanedDoc.wires.length
      if (removedWiresCount > 0) {
        console.warn(`Removed ${removedWiresCount} invalid wire(s) during netlist export`)
      }
      
      const json = exportCircuitJSON(cleanedDoc)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `circuit.v1.json`
      a.click()
      URL.revokeObjectURL(url)
      
      if (removedWiresCount > 0) {
        alert(`✓ Circuit JSON exported successfully\n\n⚠️ Note: ${removedWiresCount} invalid wire(s) were skipped.\nConsider cleaning up the schematic.`)
      }
    } catch (err) {
      alert(`⚠️ Circuit JSON export failed:\n${err instanceof Error ? err.message : String(err)}`)
      console.error('Circuit JSON export error:', err)
    }
  }

  function importJSON() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const json = ev.target?.result as string
          const parsed = JSON.parse(json)
          
          const result = detectJSONType(parsed)
          
          switch (result.type) {
            case "schematic":
              // Try to migrate and load as schematic
              const migrationResult = migrateToV1(result.doc)
              if (!migrationResult.success) {
                alert(`Migration failed:\n${formatMigrationErrors(migrationResult.errors)}`)
                return
              }
              
              const loaded = migrationResult.doc
              const validation = validateSchematicDoc(loaded)
              if (!validation.valid) {
                alert(`Validation failed:\n${formatValidationErrors(validation)}`)
                return
              }
              
              setDoc(loaded)
              alert("✓ Schematic loaded successfully")
              break
              
            case "symbol":
              // Single symbol - import into library
              const symValidation = validateSymbolDef(result.symbol)
              if (!symValidation.valid) {
                alert(`Invalid symbol:\n${symValidation.errors.join("\n")}`)
                return
              }
              registerSymbol(result.symbol)
              setLibraryVersion((v) => v + 1)
              alert(`✓ Symbol "${result.symbol.id}" imported into library`)
              break
              
            case "symbolArray":
            case "symbolLibrary":
              // Multiple symbols
              let imported = 0
              const errors: string[] = []
              
              const symbolsToImport = result.type === "symbolArray" ? result.symbols : result.library.symbols
              
              for (const symbol of symbolsToImport) {
                const validation = validateSymbolDef(symbol)
                if (validation.valid) {
                  try {
                    registerSymbol(symbol)
                    imported++
                  } catch (err) {
                    errors.push(`${symbol.id}: ${err}`)
                  }
                } else {
                  errors.push(`${symbol.id}: ${validation.errors.join(", ")}`)
                }
              }
              
              setLibraryVersion((v) => v + 1)
              
              if (errors.length > 0) {
                alert(
                  `✓ Imported ${imported} symbol(s)\n\n` +
                  `Errors:\n${errors.slice(0, 5).join("\n")}` +
                  (errors.length > 5 ? `\n... and ${errors.length - 5} more` : "")
                )
              } else {
                alert(`✓ Successfully imported ${imported} symbol(s) into library`)
              }
              break
              
            case "unknown":
              alert(
                `❌ Unknown JSON format\n\n` +
                `Expected one of:\n` +
                `• SchematicDoc (with instances and wires)\n` +
                `• SymbolDef (with id, primitives, pins)\n` +
                `• SymbolDef[] (array of symbols)\n` +
                `• { schemaVersion: 1, symbols: SymbolDef[] } (standard symbol library)`
              )
              break
          }
        } catch (err) {
          alert(`Failed to load: ${err}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function copyJSON() {
    const validation = validateSchematicDoc(doc)
    if (!validation.valid) {
      alert(`Validation errors:\n${formatValidationErrors(validation)}`)
      return
    }
    const json = JSON.stringify(doc, null, 2)
    navigator.clipboard.writeText(json)
    alert("✓ Copied to clipboard")
  }

  async function pasteJSON() {
    try {
      const json = await navigator.clipboard.readText()
      const parsed = JSON.parse(json)
      
      const result = detectJSONType(parsed)
      
      switch (result.type) {
        case "schematic":
          // Try to migrate and load as schematic
          const migrationResult = migrateToV1(result.doc)
          if (!migrationResult.success) {
            alert(`Migration failed:\n${formatMigrationErrors(migrationResult.errors)}`)
            return
          }
          
          const loaded = migrationResult.doc
          const validation = validateSchematicDoc(loaded)
          if (!validation.valid) {
            alert(`Validation failed:\n${formatValidationErrors(validation)}`)
            return
          }
          
          setDoc(loaded)
          alert("✓ Schematic pasted from clipboard")
          break
          
        case "symbol":
        case "symbolArray":
        case "symbolLibrary":
          alert(
            `This appears to be symbol data.\n\n` +
            `Use "Import Symbols" button to add symbols to your library.`
          )
          break
          
        case "unknown":
          alert(
            `❌ Unknown JSON format\n\n` +
            `Expected SchematicDoc (with instances and wires)`
          )
          break
      }
    } catch (err) {
      alert(`Failed to paste: ${err}`)
    }
  }

  function importSymbols() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const json = ev.target?.result as string
          const parsed = JSON.parse(json)
          
          const result = detectJSONType(parsed)
          
          if (result.type === "schematic") {
            alert(
              `❌ This is a Schematic, not symbol data!\n\n` +
              `Use the "📂 Load" button to load schematics.`
            )
            return
          }
          
          if (result.type === "unknown") {
            alert(
              `❌ Unknown format\n\n` +
              `Expected:\n` +
              `• SymbolDef (with id, primitives, pins)\n` +
              `• SymbolDef[] (array of symbols)\n` +
              `• { schemaVersion: 1, symbols: SymbolDef[] } (standard symbol library)`
            )
            return
          }
          
          // Import symbols
          const symbolsToImport = 
            result.type === "symbol" ? [result.symbol] : 
            result.type === "symbolArray" ? result.symbols :
            result.library.symbols
          
          let imported = 0
          const errors: string[] = []
          
          for (const symbol of symbolsToImport) {
            const validation = validateSymbolDef(symbol)
            if (validation.valid) {
              try {
                registerSymbol(symbol)
                imported++
              } catch (err) {
                errors.push(`${symbol.id}: ${err}`)
              }
            } else {
              errors.push(`${symbol.id}: ${validation.errors.join(", ")}`)
            }
          }
          
          setLibraryVersion((v) => v + 1)
          
          if (errors.length > 0) {
            alert(
              `✓ Imported ${imported} symbol(s)\n\n` +
              `Errors:\n${errors.slice(0, 5).join("\n")}` +
              (errors.length > 5 ? `\n... and ${errors.length - 5} more` : "")
            )
          } else {
            alert(`✓ Successfully imported ${imported} symbol(s) into library`)
          }
        } catch (err) {
          alert(`Failed to import symbols: ${err}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div style={{ background: "#111", padding: 12, color: "white", display: "flex", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            Selected: {selection ? `${selection.type}:${selection.id}` : multiSelection.size > 0 ? `${multiSelection.size} instances` : "none"} | Wires: {doc.wires.length} | Pending: {pendingPin ? `${pendingPin.instId}:${pendingPin.pinName}` : "none"}
            {placementMode === "symbol" && selectedSymbolId && (
              <span style={{ color: "#4af", marginLeft: 12, fontWeight: "bold" }}>
                🎯 Placing: {selectedSymbolId} (click to place, ESC to cancel)
              </span>
            )}
            {placementMode === "patch" && selectedPatchId && (
              <span style={{ color: "#f4a", marginLeft: 12, fontWeight: "bold" }}>
                📦 Placing Patch: {selectedPatchId} (click to place, ESC to cancel)
              </span>
            )}
          </div>
          <button onClick={autoTidy} style={{ padding: "4px 12px" }}>
            Auto Tidy
          </button>
          <button onClick={autoLayoutWithELK} style={{ padding: "4px 12px" }}>
            ELK Layout
          </button>
          <button onClick={handleZoomIn} style={{ padding: "4px 12px", background: "#3a7a5a", border: "none", color: "white" }} title="Zoom In">
            🔍+
          </button>
          <button onClick={handleZoomOut} style={{ padding: "4px 12px", background: "#3a7a5a", border: "none", color: "white" }} title="Zoom Out">
            🔍−
          </button>
          <button onClick={handleResetView} style={{ padding: "4px 12px", background: "#5a6a7a", border: "none", color: "white" }} title="Reset View">
            🎯
          </button>
          <button onClick={exportJSON} style={{ padding: "4px 12px" }}>
            💾 Save
          </button>
          <button onClick={exportCircuitNetlist} style={{ padding: "4px 12px", background: "#4a7a9a", border: "none", color: "white" }} title="Export circuit netlist (circuit.v1.json)">
            🔌 Circuit JSON
          </button>
          <button onClick={importJSON} style={{ padding: "4px 12px" }}>
            📂 Load
          </button>
          <button onClick={importSymbols} style={{ padding: "4px 12px", background: "#6a5aaa", border: "none", color: "white" }}>
            📦 Import Symbols
          </button>
          <button onClick={loadExample} style={{ padding: "4px 12px", background: "#4a8aaa", border: "none", color: "white" }}>
            📘 Examples
          </button>
          <button onClick={copyJSON} style={{ padding: "4px 12px" }}>
            📋 Copy
          </button>
          <button onClick={pasteJSON} style={{ padding: "4px 12px" }}>
            📥 Paste
          </button>
        </div>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>
          Press R to rotate | Delete/Backspace to remove | ESC to cancel | Zoom: {(zoom * 100).toFixed(0)}%
        </div>

        <svg
          width={W}
          height={H}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          style={{ border: "1px solid #333", background: "#0b0b0b", cursor: placementMode ? "crosshair" : "default" }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseDown={onCanvasMouseDown}
        >
          <g>{gridLines}</g>

          {/* wires */}
          <g>
            {doc.wires.map((w) => {
              const points = computeWirePoints(w, doc)
              if (points.length === 0) return null
              const isSelected = selection?.type === "wire" && selection.id === w.id
              return (
                <polyline
                  key={w.id}
                  fill="none"
                  stroke={isSelected ? "#ff0" : "#0ff"}
                  strokeWidth={isSelected ? 3 : 2}
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  style={{ cursor: "pointer" }}
                />
              )
            })}
          </g>

          <g>
            {doc.instances.map((inst) => {
              const isSingleSelected = selection?.type === "instance" && selection.id === inst.id
              const isMultiSelected = multiSelection.has(inst.id)
              const isSelected = isSingleSelected || isMultiSelected
              return (
                <g
                  key={inst.id}
                  onMouseDown={(e) => onInstMouseDown(e, inst)}
                  opacity={selection && !isSelected && multiSelection.size === 0 ? 0.5 : 1}
                  style={{ cursor: "grab" }}
                >
                  <SymbolInstanceG inst={inst} />
                  {/* Render tag name for Tag symbols */}
                  {inst.symbolId === "Tag" && inst.tag && (
                    <text
                      x={inst.pos.x}
                      y={inst.pos.y - 20}
                      fill="#0f0"
                      fontSize={10}
                      textAnchor="middle"
                      pointerEvents="none"
                      fontWeight="bold"
                    >
                      {inst.tag}
                    </text>
                  )}
                  {isSingleSelected && (
                    <rect
                      x={inst.pos.x - 35}
                      y={inst.pos.y - 35}
                      width={70}
                      height={70}
                      fill="none"
                      stroke="#ff0"
                      strokeWidth={2}
                      strokeDasharray="4"
                      pointerEvents="none"
                    />
                  )}
                  {isMultiSelected && (
                    <rect
                      x={inst.pos.x - 35}
                      y={inst.pos.y - 35}
                      width={70}
                      height={70}
                      fill="none"
                      stroke="#f4a"
                      strokeWidth={2}
                      strokeDasharray="2"
                      pointerEvents="none"
                    />
                  )}
                </g>
              )
            })}
          </g>

          {/* pins layer */}
          <g>
            {doc.instances.flatMap((inst) =>
              getAbsPins(inst).map((p) => {
                const pinKey = `${p.instId}:${p.pinName}`
                const isHovered = hoveredPin === pinKey
                const isPending = pendingPin && pendingPin.instId === p.instId && pendingPin.pinName === p.pinName
                
                return (
                  <circle
                    key={pinKey}
                    cx={p.x}
                    cy={p.y}
                    r={isHovered || isPending ? 6 : 4}
                    fill={isPending ? "#00f" : isHovered ? "#0f0" : "#fff"}
                    stroke="#000"
                    strokeWidth={1}
                    style={{ cursor: "pointer", transition: "all 0.1s" }}
                    onMouseEnter={() => setHoveredPin(pinKey)}
                    onMouseLeave={() => setHoveredPin(null)}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      if (!pendingPin) {
                        setPendingPin(p)
                        return
                      }
                      // second click: create wire
                      const a = pendingPin
                      const b = p

                      const wire = {
                        id: `w_${Date.now()}`,
                        a: { instId: a.instId, pinName: a.pinName },
                        b: { instId: b.instId, pinName: b.pinName },
                      }

                      setDoc((prev) => ({ ...prev, wires: [...prev.wires, wire] }))
                      setPendingPin(null)
                    }}
                  />
                )
              })
            )}
          </g>
          
          {/* Wire in progress */}
          {pendingPin && (
            <line
              x1={pendingPin.x}
              y1={pendingPin.y}
              x2={pendingPin.x}
              y2={pendingPin.y}
              stroke="#00f"
              strokeWidth={2}
              strokeDasharray="4"
              pointerEvents="none"
            >
              <animate
                attributeName="stroke-opacity"
                values="1;0.3;1"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          )}

          {/* Ctrl+drag rectangle selection overlay */}
          {rectSelect && (() => {
            const r = rectFromPoints(rectSelect.start, rectSelect.end)
            return (
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill="rgba(255, 255, 0, 0.08)"
                stroke="#ff0"
                strokeWidth={1}
                strokeDasharray="4"
                pointerEvents="none"
              />
            )
          })()}
        </svg>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SymbolLibraryPanel 
          onPlaceSymbol={handlePlaceSymbol} 
          selectedSymbolId={selectedSymbolId}
          onLibraryChange={() => setLibraryVersion((v) => v + 1)}
          key={libraryVersion}
        />
        
        <PatchLibraryPanel
          onPlacePatch={handlePlacePatch}
          onSavePatch={handleSavePatch}
          selectedPatchId={selectedPatchId}
          canSavePatch={multiSelection.size > 0}
          onExportPatches={handleExportPatches}
          onImportPatches={handleImportPatches}
        />
      </div>
    </div>
  )
}
