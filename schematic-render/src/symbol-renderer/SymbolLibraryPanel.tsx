import { listSymbols, getSymbolCount, clearAllSymbols, clearUserSymbols, setUseOnlyImportedSymbols, getUseOnlyImportedSymbols, registerSymbol, isCoreSymbol } from "../symbol-lib/registry"
import type { SymbolDef } from "../symbol-dsl/types"
import { useState, useEffect } from "react"
import { SymbolSvg } from "./SymbolSvg"
import { loadRecentSymbols, saveRecentSymbols } from "../storage"

interface SymbolLibraryPanelProps {
  onPlaceSymbol: (symbolId: string) => void
  selectedSymbolId: string | null
  onLibraryChange?: () => void
}

export function SymbolLibraryPanel({ onPlaceSymbol, selectedSymbolId, onLibraryChange }: SymbolLibraryPanelProps) {
  const symbols = listSymbols()
  const count = getSymbolCount()
  const [showMenu, setShowMenu] = useState(false)
  const [useOnlyImported, setUseOnlyImported] = useState(getUseOnlyImportedSymbols())
  const [searchQuery, setSearchQuery] = useState("")
  const [recentSymbols, setRecentSymbols] = useState<string[]>([])

  // Load recent symbols from storage
  useEffect(() => {
    setRecentSymbols(loadRecentSymbols())
  }, [])

  // Save recent symbols to storage
  function addToRecent(symbolId: string) {
    setRecentSymbols((prev) => {
      const updated = [symbolId, ...prev.filter((id) => id !== symbolId)].slice(0, 5)
      saveRecentSymbols(updated)
      return updated
    })
  }

  function handlePlaceSymbol(symbolId: string) {
    addToRecent(symbolId)
    onPlaceSymbol(symbolId)
  }

  // Filter symbols by search query
  const filteredSymbols = symbols.filter((s) =>
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Split into core and imported symbols
  const coreSymbols = filteredSymbols.filter((s) => isCoreSymbol(s.id))
  const importedSymbols = filteredSymbols.filter((s) => !isCoreSymbol(s.id))

  // Get recent symbols that still exist in library
  const recentSymbolDefs = recentSymbols
    .map((id) => symbols.find((s) => s.id === id))
    .filter((s): s is SymbolDef => s !== undefined)

  function handleClearAll() {
    if (confirm("Clear ALL symbols (including built-ins)? This will affect the library after reload.")) {
      clearAllSymbols()
      if (onLibraryChange) onLibraryChange()
    }
  }

  function handleClearUserSymbols() {
    if (confirm("Clear only user-imported symbols? Core symbols will remain.")) {
      clearUserSymbols()
      if (onLibraryChange) onLibraryChange()
    }
  }

  function handleToggleMode() {
    const newMode = !useOnlyImported
    setUseOnlyImported(newMode)
    setUseOnlyImportedSymbols(newMode)
    
    if (newMode) {
      alert(
        "⚠️ Switched to 'Imported Only' mode\n\n" +
        "Built-ins (R, GND) removed from library.\n" +
        "Reload page to see changes."
      )
    } else {
      alert(
        "✓ Switched to 'With Built-ins' mode\n\n" +
        "Built-ins (R, GND) will be included.\n" +
        "Reload page to see changes."
      )
    }
    
    if (onLibraryChange) onLibraryChange()
  }

  function handleImportKiCadJSON() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // Validate format: { schemaVersion: 1, symbols: [{ id, def }] }
        if (data.schemaVersion !== 1) {
          alert(`⚠️ Unsupported schema version: ${data.schemaVersion}`)
          return
        }
        
        if (!Array.isArray(data.symbols)) {
          alert("⚠️ Invalid format: 'symbols' must be an array")
          return
        }
        
        // Import each symbol
        let imported = 0
        let skipped = 0
        
        for (const item of data.symbols) {
          // CLI outputs SymbolDef directly (not wrapped in { id, def })
          const symbolDef = item as SymbolDef
          
          if (!symbolDef.id) {
            skipped++
            continue
          }
          
          try {
            // Register with overwrite enabled
            registerSymbol(symbolDef, true)
            imported++
          } catch (err) {
            console.error(`Failed to import symbol ${symbolDef.id}:`, err)
            skipped++
          }
        }
        
        alert(
          `✓ KiCad JSON import complete\n\n` +
          `Imported: ${imported}\n` +
          (skipped > 0 ? `Skipped: ${skipped}\n` : "") +
          `\nSymbols are now available in the library.`
        )
        
        if (onLibraryChange) onLibraryChange()
      } catch (err) {
        alert(`⚠️ Import failed:\n${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    input.click()
  }

  function handleExportSymbolLibrary() {
    try {
      const library = {
        schemaVersion: 1,
        symbols: symbols.map(s => s), // Already SymbolDef format
      }
      
      const json = JSON.stringify(library, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `symbols.symboldef.v1.json`
      a.click()
      
      URL.revokeObjectURL(url)
      
      alert(`✓ Exported ${symbols.length} symbols to symbols.symboldef.v1.json`)
    } catch (err) {
      alert(`⚠️ Export failed:\n${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div
      style={{
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: 4,
        padding: 12,
        minWidth: 200,
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px 0",
          fontSize: 14,
          fontWeight: "bold",
          color: "#fff",
          paddingBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>📚 Symbol Library</span>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{
            background: "#333",
            color: "white",
            border: "1px solid #555",
            borderRadius: 3,
            padding: "2px 8px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ⚙️
        </button>
      </h3>

      {showMenu && (
        <div
          style={{
            background: "#252525",
            border: "1px solid #444",
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
            fontSize: 11,
          }}
        >
          <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #333" }}>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={useOnlyImported}
                onChange={handleToggleMode}
                style={{ marginRight: 6 }}
              />
              <span>Use only imported symbols</span>
            </label>
            <div style={{ fontSize: 10, color: "#888", marginTop: 4, marginLeft: 20 }}>
              {useOnlyImported ? "Built-ins disabled" : "Built-ins enabled"}
            </div>
          </div>
          <button
            onClick={handleImportKiCadJSON}
            style={{
              width: "100%",
              padding: "6px",
              background: "#2a5a2a",
              color: "white",
              border: "1px solid #4a8a4a",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            📥 Import KiCad (JSON)
          </button>
          <button
            onClick={handleExportSymbolLibrary}
            style={{
              width: "100%",
              padding: "6px",
              background: "#2a4a6a",
              color: "white",
              border: "1px solid #4a6a8a",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            📤 Export Symbol Library
          </button>
          <button
            onClick={handleClearUserSymbols}
            style={{
              width: "100%",
              padding: "6px",
              background: "#444",
              color: "white",
              border: "1px solid #666",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            🗑️ Clear User Symbols
          </button>
          <button
            onClick={handleClearAll}
            style={{
              width: "100%",
              padding: "6px",
              background: "#822",
              color: "white",
              border: "1px solid #a44",
              borderRadius: 3,
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            ⚠️ Clear All Symbols
          </button>
        </div>
      )}
      
      <div
        style={{
          fontSize: 11,
          color: "#888",
          marginBottom: 8,
          padding: "4px 8px",
          background: "#252525",
          borderRadius: 3,
        }}
      >
        {count} symbol{count !== 1 ? "s" : ""}
      </div>

      {/* Search box */}
      <input
        type="text"
        placeholder="🔍 Search symbols..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 8px",
          background: "#252525",
          border: "1px solid #444",
          borderRadius: 3,
          color: "white",
          fontSize: 12,
          marginBottom: 12,
          outline: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#4a8aaa"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#444"
        }}
      />

      {/* Recent section */}
      {recentSymbolDefs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4
            style={{
              margin: "0 0 6px 0",
              fontSize: 11,
              fontWeight: "bold",
              color: "#888",
              textTransform: "uppercase",
            }}
          >
            Recent
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentSymbolDefs.map((symbol) => (
              <SymbolLibraryItem
                key={`recent-${symbol.id}`}
                symbol={symbol}
                isSelected={selectedSymbolId === symbol.id}
                onPlace={() => handlePlaceSymbol(symbol.id)}
                isCore={isCoreSymbol(symbol.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Core symbols section */}
      {coreSymbols.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <h4
            style={{
              margin: "0 0 6px 0",
              fontSize: 11,
              fontWeight: "bold",
              color: "#6a9aff",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>🔧</span>
            <span>Core Symbols</span>
            <span style={{ fontSize: 9, color: "#888", fontWeight: "normal" }}>
              ({coreSymbols.length})
            </span>
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {coreSymbols.map((symbol) => (
              <SymbolLibraryItem
                key={symbol.id}
                symbol={symbol}
                isSelected={selectedSymbolId === symbol.id}
                onPlace={() => handlePlaceSymbol(symbol.id)}
                isCore={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Imported symbols section */}
      {importedSymbols.length > 0 && (
        <div>
          <h4
            style={{
              margin: "0 0 6px 0",
              fontSize: 11,
              fontWeight: "bold",
              color: "#8a8aaa",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>📦</span>
            <span>Imported Symbols</span>
            <span style={{ fontSize: 9, color: "#888", fontWeight: "normal" }}>
              ({importedSymbols.length})
            </span>
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {importedSymbols.map((symbol) => (
              <SymbolLibraryItem
                key={symbol.id}
                symbol={symbol}
                isSelected={selectedSymbolId === symbol.id}
                onPlace={() => handlePlaceSymbol(symbol.id)}
                isCore={false}
              />
            ))}
          </div>
        </div>
      )}
      
      {filteredSymbols.length === 0 && (
        <div style={{ color: "#666", fontSize: 12, fontStyle: "italic", padding: 8, textAlign: "center" }}>
          {searchQuery ? `No symbols matching "${searchQuery}"` : "No symbols in library"}
        </div>
      )}
    </div>
  )
}

interface SymbolLibraryItemProps {
  symbol: SymbolDef
  isSelected: boolean
  onPlace: () => void
  isCore: boolean
}

function SymbolLibraryItem({ symbol, isSelected, onPlace, isCore }: SymbolLibraryItemProps) {
  const [showPreview, setShowPreview] = useState(false)
  
  return (
    <div
      style={{
        background: isSelected ? "#2a4a5a" : "#252525",
        border: `1px solid ${isSelected ? "#4a8aaa" : "#333"}`,
        borderRadius: 3,
        padding: "6px 8px",
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "#2a2a2a"
        }
        setShowPreview(true)
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "#252525"
        }
        setShowPreview(false)
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Thumbnail */}
        <div
          style={{
            width: 32,
            height: 32,
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <SymbolSvg symbol={symbol} width={28} height={28} />
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              marginBottom: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {symbol.id}
            {isCore && (
              <span
                style={{
                  fontSize: 9,
                  background: "#334488",
                  color: "#88aaff",
                  padding: "1px 4px",
                  borderRadius: 2,
                  fontWeight: "bold",
                }}
                title="Core symbol (non-deletable)"
              >
                CORE
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#888",
            }}
          >
            {symbol.pins.length} pin{symbol.pins.length !== 1 ? "s" : ""}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlace()
          }}
          style={{
            background: "#4a8aaa",
            color: "white",
            border: "none",
            borderRadius: 3,
            padding: "4px 10px",
            fontSize: 11,
            cursor: "pointer",
            fontWeight: 500,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#5a9aba"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4a8aaa"
          }}
        >
          Place
        </button>
      </div>

      {/* Large preview on hover */}
      {showPreview && (
        <div
          style={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: 0,
            background: "#1a1a1a",
            border: "2px solid #4a8aaa",
            borderRadius: 4,
            padding: 8,
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <SymbolSvg symbol={symbol} width={100} height={100} />
        </div>
      )}
    </div>
  )
}
