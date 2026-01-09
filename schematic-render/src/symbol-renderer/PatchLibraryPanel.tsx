import { listPatches } from "../patch-lib/registry"
import type { Patch } from "../patch-lib/types"
import { useState } from "react"

interface PatchLibraryPanelProps {
  onPlacePatch: (patchId: string) => void
  onSavePatch: () => void
  selectedPatchId: string | null
  canSavePatch: boolean
  onExportPatches: () => void
  onImportPatches: () => void
}

export function PatchLibraryPanel({
  onPlacePatch,
  onSavePatch,
  selectedPatchId,
  canSavePatch,
  onExportPatches,
  onImportPatches,
}: PatchLibraryPanelProps) {
  const patches = listPatches()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredPatches = patches.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

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
        }}
      >
        📦 Patch Library
      </h3>

      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>{patches.length} patch(es)</div>

      {/* Save Patch Button */}
      <button
        onClick={onSavePatch}
        disabled={!canSavePatch}
        style={{
          width: "100%",
          padding: "8px",
          background: canSavePatch ? "#4a8aaa" : "#333",
          color: canSavePatch ? "white" : "#666",
          border: "1px solid #555",
          borderRadius: 3,
          cursor: canSavePatch ? "pointer" : "not-allowed",
          fontSize: 12,
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        💾 Save Patch from Selection
      </button>
      
      {/* Import/Export buttons */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        <button
          onClick={onExportPatches}
          style={{
            flex: 1,
            padding: "6px",
            background: "#555",
            color: "white",
            border: "1px solid #666",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          📤 Export
        </button>
        <button
          onClick={onImportPatches}
          style={{
            flex: 1,
            padding: "6px",
            background: "#555",
            color: "white",
            border: "1px solid #666",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          📥 Import
        </button>
      </div>

      {/* Search box */}
      <input
        type="text"
        placeholder="🔍 Search patches..."
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
      />

      {/* Patch list */}
      {filteredPatches.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredPatches.map((patch) => (
            <PatchLibraryItem
              key={patch.id}
              patch={patch}
              isSelected={selectedPatchId === patch.id}
              onPlace={() => onPlacePatch(patch.id)}
            />
          ))}
        </div>
      )}

      {filteredPatches.length === 0 && (
        <div style={{ color: "#666", fontSize: 12, fontStyle: "italic", padding: 8, textAlign: "center" }}>
          {searchQuery ? `No patches matching "${searchQuery}"` : "No patches saved yet"}
        </div>
      )}
    </div>
  )
}

interface PatchLibraryItemProps {
  patch: Patch
  isSelected: boolean
  onPlace: () => void
}

function PatchLibraryItem({ patch, isSelected, onPlace }: PatchLibraryItemProps) {
  return (
    <div
      style={{
        background: isSelected ? "#2a4a5a" : "#252525",
        border: `1px solid ${isSelected ? "#4a8aaa" : "#333"}`,
        borderRadius: 3,
        padding: "8px 10px",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
              marginBottom: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {patch.name}
          </div>
          <div style={{ fontSize: 10, color: "#888" }}>
            {patch.instances.length} inst, {patch.wires.length} wire, {patch.ports.length} port
          </div>
          {patch.description && (
            <div
              style={{
                fontSize: 10,
                color: "#666",
                marginTop: 2,
                fontStyle: "italic",
              }}
            >
              {patch.description}
            </div>
          )}
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
        >
          Place
        </button>
      </div>
    </div>
  )
}
