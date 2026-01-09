import type { SymbolDef, Primitive, StrokeStyle } from "../symbol-dsl/types"
import { computeSymbolBBox } from "../symbol-dsl/geometry"

function getStrokeProps(stroke?: Partial<StrokeStyle>) {
  return {
    strokeWidth: stroke?.width ?? 1,
    strokeDasharray: stroke?.dash?.join(" "),
    strokeLinecap: stroke?.cap,
    strokeLinejoin: stroke?.join,
  }
}

function renderPrimitive(p: Primitive, i: number) {
  switch (p.kind) {
    case "line":
      return (
        <line
          key={i}
          x1={p.a.x}
          y1={p.a.y}
          x2={p.b.x}
          y2={p.b.y}
          stroke="currentColor"
          {...getStrokeProps(p)}
        />
      )
    case "rect":
      return (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={p.fill ? "currentColor" : "none"}
          stroke="currentColor"
          {...getStrokeProps(p.stroke)}
        />
      )
    case "circle":
      return (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill={p.fill ? "currentColor" : "none"}
          stroke="currentColor"
          {...getStrokeProps(p.stroke)}
        />
      )
    case "arc": {
      // Convert arc to SVG path using A command
      const { cx, cy, r, startAngle, endAngle } = p
      const start = {
        x: cx + r * Math.cos((startAngle * Math.PI) / 180),
        y: cy + r * Math.sin((startAngle * Math.PI) / 180),
      }
      const end = {
        x: cx + r * Math.cos((endAngle * Math.PI) / 180),
        y: cy + r * Math.sin((endAngle * Math.PI) / 180),
      }
      const largeArc = endAngle - startAngle > 180 ? 1 : 0
      const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
      return (
        <path
          key={i}
          d={d}
          fill={p.fill ? "currentColor" : "none"}
          stroke="currentColor"
          {...getStrokeProps(p)}
        />
      )
    }
    case "polyline": {
      const points = p.points.map((pt) => `${pt.x},${pt.y}`).join(" ")
      if (p.closed) {
        return (
          <polygon
            key={i}
            points={points}
            fill={p.fill ? "currentColor" : "none"}
            stroke="currentColor"
            {...getStrokeProps(p)}
          />
        )
      }
      return (
        <polyline
          key={i}
          points={points}
          fill="none"
          stroke="currentColor"
          {...getStrokeProps(p)}
        />
      )
    }
    case "text":
      return (
        <text
          key={i}
          x={p.x}
          y={p.y}
          fontSize={p.size ?? 6}
          textAnchor={p.anchor === "l" ? "start" : p.anchor === "r" ? "end" : "middle"}
          dominantBaseline="middle"
          fill="currentColor"
        >
          {p.text}
        </text>
      )
  }
}

export function SymbolG({ symbol, showDebug }: { symbol: SymbolDef; showDebug?: boolean }) {
  const declaredBBox = symbol.bbox
  const computedBBox = computeSymbolBBox(symbol)

  return (
    <g>
      <g>{symbol.primitives.map(renderPrimitive)}</g>

      <g>
        {symbol.pins.map((pin, idx) => (
          <g key={idx}>
            <circle cx={pin.pos.x} cy={pin.pos.y} r={2} fill="currentColor" />
            <text x={pin.pos.x + 3} y={pin.pos.y} fontSize={5} dominantBaseline="middle">
              {pin.name}
            </text>
          </g>
        ))}
      </g>

      {showDebug && (
        <>
          {/* Computed bbox - green dashed */}
          <rect
            x={computedBBox.x}
            y={computedBBox.y}
            width={computedBBox.w}
            height={computedBBox.h}
            fill="none"
            stroke="green"
            strokeDasharray="3 3"
            opacity={0.7}
          />
          {/* Declared bbox - gray dashed */}
          {declaredBBox && (
            <rect
              x={declaredBBox.x}
              y={declaredBBox.y}
              width={declaredBBox.w}
              height={declaredBBox.h}
              fill="none"
              stroke="gray"
              strokeDasharray="5 2"
              opacity={0.5}
            />
          )}
        </>
      )}
    </g>
  )
}
