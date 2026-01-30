// Example reusable patch: I2C Pullups with configurable resistance
export function I2CPullups(props: { r?: string }) {
  const r = props.r ?? "4.7k"
  return (
    <subcircuit name="i2c_pullups">
      <resistor name="R1" resistance={r} />
      <resistor name="R2" resistance={r} />
      <trace from=".R1 > .pin1" to="net.VCC" />
      <trace from=".R2 > .pin1" to="net.VCC" />
      <trace from=".R1 > .pin2" to="net.SCL" />
      <trace from=".R2 > .pin2" to="net.SDA" />
    </subcircuit>
  )
}
