import type { SymbolInstance } from "../schematic/types"
import { getSymbolDef } from "../symbol-lib/registry"
import { SymbolG } from "./SymbolG"

export function SymbolInstanceG({ inst }: { inst: SymbolInstance }) {
  const symbol = getSymbolDef(inst.symbolId)
  if (!symbol) {
    // Render error placeholder
    return (
      <g transform={`translate(${inst.pos.x} ${inst.pos.y})`}>
        <rect x={-20} y={-20} width={40} height={40} fill="#300" stroke="#f00" strokeWidth={2} />
        <text x={0} y={0} fontSize={10} fill="#f00" textAnchor="middle" dominantBaseline="middle">
          ?
        </text>
      </g>
    )
  }
  
  const transform = `translate(${inst.pos.x} ${inst.pos.y}) rotate(${inst.rotDeg})`
  return (
    <g transform={transform}>
      <SymbolG symbol={symbol} showDebug={false} />
    </g>
  )
}

