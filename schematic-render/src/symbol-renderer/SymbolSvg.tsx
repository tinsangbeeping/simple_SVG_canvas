import type { SymbolDef } from "../symbol-dsl/types"
import { SymbolG } from "./SymbolG"
import { computeSymbolBBox } from "../symbol-dsl/geometry"

export function SymbolSvg({ symbol, showDebug = false, width, height }: { symbol: SymbolDef; showDebug?: boolean; width?: number; height?: number }) {
  const declaredBBox = symbol.bbox
  const computedBBox = computeSymbolBBox(symbol)
  const bbox = declaredBBox && declaredBBox.w > 0 && declaredBBox.h > 0 ? declaredBBox : computedBBox
  
  const pad = 20
  const vb = `${bbox.x - pad} ${bbox.y - pad} ${bbox.w + 2 * pad} ${bbox.h + 2 * pad}`

  return (
    <svg 
      width={width || 260} 
      height={height || 160} 
      viewBox={vb} 
      style={{ border: showDebug ? "1px solid #333" : "none" }}
    >
      <SymbolG symbol={symbol} showDebug={showDebug} />
    </svg>
  )
}
