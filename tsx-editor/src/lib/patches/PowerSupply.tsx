// Example patch: Arduino-style power supply circuit
export function PowerSupply(props: { 
  inputVoltage?: string
  outputVoltage?: string 
}) {
  return (
    <subcircuit name="power_supply">
      {/* Voltage regulator */}
      <chip name="U1" manufacturerPartNumber="LM7805" />
      
      {/* Input capacitor */}
      <capacitor name="C1" capacitance="100uF" />
      <trace from=".C1 > .pin1" to=".U1 > .VIN" />
      <trace from=".C1 > .pin2" to="net.GND" />
      
      {/* Output capacitor */}
      <capacitor name="C2" capacitance="10uF" />
      <trace from=".C2 > .pin1" to=".U1 > .VOUT" />
      <trace from=".C2 > .pin2" to="net.GND" />
      
      {/* Connect regulator ground */}
      <trace from=".U1 > .GND" to="net.GND" />
      
      {/* Net labels */}
      <netlabel net="VIN" at=".U1 > .VIN" />
      <netlabel net="5V" at=".U1 > .VOUT" />
    </subcircuit>
  )
}
