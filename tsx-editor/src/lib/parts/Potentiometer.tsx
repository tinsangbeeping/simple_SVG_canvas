// Example library part: Custom Potentiometer
export function Potentiometer(props: { 
  name: string
  resistance: string
  schX?: number
  schY?: number 
}) {
  return (
    <resistor 
      name={props.name} 
      resistance={props.resistance}
      variant="potentiometer"
      schX={props.schX}
      schY={props.schY}
    />
  )
}
