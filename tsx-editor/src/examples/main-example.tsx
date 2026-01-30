// Example main circuit using patches
import { I2CPullups } from './lib/patches/I2CPullups'
import { PowerSupply } from './lib/patches/PowerSupply'

export default function Circuit() {
  return (
    <board width="100mm" height="80mm">
      {/* Power supply section */}
      <PowerSupply inputVoltage="12V" outputVoltage="5V" />
      
      {/* Main microcontroller */}
      <chip name="U2" manufacturerPartNumber="ATMEGA328P" schX={50} schY={40} />
      
      {/* I2C pullups */}
      <I2CPullups r="4.7k" />
      
      {/* Status LED with resistor */}
      <subcircuit name="status_led" schX={20} schY={60}>
        <resistor name="R1" resistance="330" />
        <led name="LED1" color="green" />
        <trace from=".R1 > .pin2" to=".LED1 > .anode" />
        <trace from=".LED1 > .cathode" to="net.GND" />
      </subcircuit>
      
      {/* Switch for reset */}
      <switch name="SW1" variant="spst" schX={80} schY={20} />
      <trace from=".SW1 > .pin1" to=".U2 > .RESET" />
      <trace from=".SW1 > .pin2" to="net.GND" />
      
      {/* Crystal oscillator */}
      <capacitor name="C3" capacitance="22pF" schX={60} schY={50} />
      <capacitor name="C4" capacitance="22pF" schX={70} schY={50} />
    </board>
  )
}
