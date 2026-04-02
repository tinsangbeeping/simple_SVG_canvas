import { Subckt } from "./subcircuits/Subckt"

export default () => (
  <board width="50mm" height="50mm">
    <Subckt name="S1" schX={8} schY={8} />
    <chip
      name="U1"
      pinCount={8}
      symbolPreset="default"
      footprint="soic8"
      schRotation="0deg"
      schX={30}
      schY={20}
    />
    <trace from=".S1 > .VOUT" to=".U1 > .pin1" />
    <trace from=".S1 > .VIN" to=".U1 > .pin2" />
  </board>
)
