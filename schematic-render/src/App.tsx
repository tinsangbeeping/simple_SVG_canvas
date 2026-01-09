import { useState } from "react"
import { SchematicCanvas } from "./symbol-renderer/SchematicCanvas"
import { SymbolGallery } from "./symbol-renderer/SymbolGallery"

export default function App() {
  const [view, setView] = useState<"editor" | "gallery">("editor")

  return (
    <div>
      <div style={{ background: "#000", padding: "8px 16px", display: "flex", gap: 16 }}>
        <button
          onClick={() => setView("editor")}
          style={{
            padding: "8px 16px",
            background: view === "editor" ? "#555" : "#222",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          📐 Schematic Editor
        </button>
        <button
          onClick={() => setView("gallery")}
          style={{
            padding: "8px 16px",
            background: view === "gallery" ? "#555" : "#222",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          🎨 Symbol Gallery
        </button>
      </div>
      {view === "editor" ? <SchematicCanvas /> : <SymbolGallery />}
    </div>
  )
}
