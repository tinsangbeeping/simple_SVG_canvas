export const round2SubcircuitTsx = `export const ports = ["VIN", "VOUT", "GND"] as const

export function PowerStage(props: { name: string; schX?: number; schY?: number }) {
  const x = props.schX ?? 0
  const y = props.schY ?? 0

  return (
    <subcircuit name={props.name}>
      {/* // schX={x + 4} */}
      {/* // schY={y + 4} */}
      <resistor
        name="R1"
        resistance="10k"
        schRotation="0deg"
      />
      <capacitor
        name="C1"
        capacitance="100nF"
        schRotation="0deg"
      />
      <trace from=".R1 > .pin1" to="net.VIN" />
      <trace from=".R1 > .pin2" to="net.VOUT" />
      <trace from=".C1 > .pin1" to="net.VOUT" />
      <trace from=".C1 > .pin2" to="net.GND" />
      <trace from="net.INTERNAL_ONLY" to=".R1 > .pin2" />
    </subcircuit>
  )
}
`

export const round2MainTsx = `export default () => (
  <board width="60mm" height="40mm">
    <PowerStage name="PS1" schX={8} schY={8} />
    <chip name="U1" pinCount={8} schRotation="0deg" />
    <trace from=".PS1 > .VOUT" to=".U1 > .pin1" />
    <trace from=".PS1 > .GND" to=".U1 > .pin8" />
  </board>
)
`

export const round2ExpectedPorts = ["VIN", "VOUT", "GND"]
