import { useState } from "react"
import type { SymbolDef } from "../symbol-dsl/types"
import { SymbolSvg } from "./SymbolSvg"
import { validateSymbolDef, formatValidationErrors } from "../schematic/validator"
import { registerSymbol, listSymbols } from "../symbol-lib/registry"
import { symbolFixtures } from "../fixtures/fixturesIndex"

export function SymbolGallery() {
  const [symbols, setSymbols] = useState<SymbolDef[]>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  function importSymbolJSON() {
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
          const parsed = JSON.parse(json) as SymbolDef
          
          // Validate
          const validation = validateSymbolDef(parsed)
          if (!validation.valid) {
            setImportError(`Validation failed:\n${formatValidationErrors(validation)}`)
            return
          }
          
          setSymbols((prev) => [...prev, parsed])
          setImportError(null)
          alert(`✓ Imported symbol: ${parsed.id}`)
        } catch (err) {
          setImportError(`Failed to import: ${err}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  async function pasteSymbolJSON() {
    try {
      const json = await navigator.clipboard.readText()
      const parsed = JSON.parse(json) as SymbolDef
      
      // Validate
      const validation = validateSymbolDef(parsed)
      if (!validation.valid) {
        setImportError(`Validation failed:\n${formatValidationErrors(validation)}`)
        return
      }
      
      setSymbols((prev) => [...prev, parsed])
      setImportError(null)
      alert(`✓ Imported symbol: ${parsed.id}`)
    } catch (err) {
      setImportError(`Failed to paste: ${err}`)
    }
  }

  function addToLibrary(symbol: SymbolDef) {
    try {
      registerSymbol(symbol)
      alert(`✓ Added ${symbol.id} to library`)
    } catch (err) {
      alert(`Failed to add to library: ${err}`)
    }
  }

  function removeSymbol(idx: number) {
    setSymbols((prev) => prev.filter((_, i) => i !== idx))
    if (selectedIdx === idx) {
      setSelectedIdx(null)
    }
  }

  function loadFixtures() {
    const loaded: SymbolDef[] = []
    const errors: string[] = []
    
    symbolFixtures.forEach((fixture) => {
      const validation = validateSymbolDef(fixture.symbolDef)
      if (validation.valid) {
        loaded.push(fixture.symbolDef)
      } else {
        errors.push(`${fixture.name}: ${formatValidationErrors(validation)}`)
      }
    })
    
    setSymbols(loaded)
    if (errors.length > 0) {
      setImportError(`Some fixtures failed validation:\n${errors.join("\n\n")}`)
    } else {
      setImportError(null)
      alert(`✓ Loaded ${loaded.length} fixture symbols`)
    }
  }

  function exportBuiltins() {
    const builtins = listSymbols()
    const exportData = {
      schemaVersion: 1,
      symbols: builtins,
    }
    
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `builtin_symbols.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedSymbol = selectedIdx !== null ? symbols[selectedIdx] : null

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "white" }}>
      {/* Left Panel - Symbol List */}
      <div style={{ width: 300, borderRight: "1px solid #333", padding: 12, overflow: "auto" }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 12px 0" }}>Symbol Gallery</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={importSymbolJSON} style={{ flex: 1, padding: "8px 12px" }}>
              📂 Import JSON
            </button>
            <button onClick={pasteSymbolJSON} style={{ flex: 1, padding: "8px 12px" }}>
              📋 Paste
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={loadFixtures} style={{ flex: 1, padding: "8px 12px", background: "#246" }}>
              🧪 Load Fixtures
            </button>
            <button onClick={exportBuiltins} style={{ flex: 1, padding: "8px 12px", background: "#264" }}>
              💾 Export Built-ins
            </button>
          </div>
        </div>

        {importError && (
          <div style={{ padding: 8, background: "#822", marginBottom: 12, fontSize: 12, whiteSpace: "pre-wrap" }}>
            {importError}
          </div>
        )}

        <div>
          {symbols.length === 0 && (
            <div style={{ padding: 12, opacity: 0.5, textAlign: "center" }}>
              No symbols imported yet
            </div>
          )}
          {symbols.map((sym, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: 8,
                marginBottom: 8,
                background: selectedIdx === idx ? "#333" : "#222",
                cursor: "pointer",
                borderRadius: 4,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold" }}>{sym.id}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {sym.primitives.length} primitives, {sym.pins.length} pins
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeSymbol(idx)
                }}
                style={{ padding: "4px 8px", fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div style={{ flex: 1, padding: 12, overflow: "auto" }}>
        {selectedSymbol ? (
          <div>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Preview: {selectedSymbol.id}</h3>
              <button onClick={() => addToLibrary(selectedSymbol)} style={{ padding: "8px 16px" }}>
                ➕ Add to Library
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <SymbolSvg symbol={selectedSymbol} showDebug={true} />
            </div>

            <div style={{ marginTop: 12 }}>
              <h4>JSON</h4>
              <pre style={{ background: "#222", padding: 12, overflow: "auto", fontSize: 11 }}>
                {JSON.stringify(selectedSymbol, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div style={{ padding: 12, opacity: 0.5, textAlign: "center" }}>
            Select a symbol from the left panel to preview
          </div>
        )}
      </div>
    </div>
  )
}
