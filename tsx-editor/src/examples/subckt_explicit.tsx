export const ports = ["VIN", "VOUT"] as const

export function Subckt(props: { name: string; schX?: number; schY?: number }) {
  const x = props.schX ?? 0
  const y = props.schY ?? 0

  return (
    <subcircuit name={props.name}>
      {/* // schX={x + 10} */}
      {/* // schY={y + 10} */}
      <resistor
        name="R1"
        resistance="1k"
        schRotation="0deg"
      />

      <trace from="net.VIN" to=".R1 > .pin1" />
      <trace from=".R1 > .pin2" to="net.VOUT" />
      <trace from=".R1 > .pin2" to="net.GND" />
    </subcircuit>
  )
}