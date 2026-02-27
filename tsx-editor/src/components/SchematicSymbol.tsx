import React from 'react'

interface SchematicSymbolProps {
  type: string
  width: number
  height: number
  color?: string
}

export const SchematicSymbol: React.FC<SchematicSymbolProps> = ({ 
  type, 
  width, 
  height,
  color = '#4CAF50'
}) => {
  const renderSymbol = () => {
    switch (type) {
      case 'resistor':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path
              d={`M 0 ${height/2} L 10 ${height/2} L 15 ${height/2-5} L 20 ${height/2+5} L 25 ${height/2-5} L 30 ${height/2+5} L 35 ${height/2-5} L 40 ${height/2+5} L 45 ${height/2-5} L 50 ${height/2} L ${width} ${height/2}`}
              stroke={color}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        )
      
      case 'capacitor':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1={width/2} y1="0" x2={width/2} y2={height/2-5} stroke={color} strokeWidth="2" />
            <line x1={width/2-10} y1={height/2-5} x2={width/2+10} y2={height/2-5} stroke={color} strokeWidth="2" />
            <line x1={width/2-10} y1={height/2+5} x2={width/2+10} y2={height/2+5} stroke={color} strokeWidth="2" />
            <line x1={width/2} y1={height/2+5} x2={width/2} y2={height} stroke={color} strokeWidth="2" />
          </svg>
        )
      
      case 'inductor':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path
              d={`M 0 ${height/2} L 10 ${height/2} Q 15 ${height/2-5} 20 ${height/2} Q 25 ${height/2+5} 30 ${height/2} Q 35 ${height/2-5} 40 ${height/2} Q 45 ${height/2+5} 50 ${height/2} L ${width} ${height/2}`}
              stroke={color}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        )
      
      case 'diode':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height/2} x2="10" y2={height/2} stroke={color} strokeWidth="2" />
            <polygon 
              points={`15,${height/2-8} 25,${height/2} 15,${height/2+8}`}
              fill={color}
            />
            <line x1="25" y1={height/2-8} x2="25" y2={height/2+8} stroke={color} strokeWidth="2" />
            <line x1="25" y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth="2" />
          </svg>
        )
      
      case 'led':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height/2} x2="10" y2={height/2} stroke={color} strokeWidth="2" />
            <polygon 
              points={`15,${height/2-8} 25,${height/2} 15,${height/2+8}`}
              fill={color}
            />
            <line x1="25" y1={height/2-8} x2="25" y2={height/2+8} stroke={color} strokeWidth="2" />
            <line x1="25" y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth="2" />
            {/* LED arrows */}
            <path d="M 20 5 L 25 0 M 23 5 L 25 0 L 20 2" stroke={color} strokeWidth="1" fill="none"/>
            <path d="M 26 5 L 31 0 M 29 5 L 31 0 L 26 2" stroke={color} strokeWidth="1" fill="none"/>
          </svg>
        )
      
      case 'transistor':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height/2} x2="15" y2={height/2} stroke={color} strokeWidth="2" />
            <line x1="15" y1="10" x2="15" y2={height-10} stroke={color} strokeWidth="3" />
            <line x1="15" y1="20" x2={width} y2="5" stroke={color} strokeWidth="2" />
            <line x1="15" y1={height-20} x2={width} y2={height-5} stroke={color} strokeWidth="2" />
            <polygon 
              points={`${width-8},${height-5} ${width},${height-5} ${width-4},${height-12}`}
              fill={color}
            />
          </svg>
        )
      
      case 'chip':
      case 'customchip':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <rect 
              x="5" 
              y="5" 
              width={width-10} 
              height={height-10} 
              fill="none" 
              stroke={color} 
              strokeWidth="2"
            />
            <circle cx="10" cy="10" r="2" fill={color} />
          </svg>
        )
      
      case 'switch':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height/2} x2="10" y2={height/2} stroke={color} strokeWidth="2" />
            <circle cx="10" cy={height/2} r="3" fill={color} />
            <line x1="10" y1={height/2} x2={width-10} y2={height/2-10} stroke={color} strokeWidth="2" />
            <circle cx={width-10} cy={height/2} r="3" fill={color} />
            <line x1={width-10} y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth="2" />
          </svg>
        )
      
      case 'pushbutton':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <circle cx={width/4} cy={height/2} r="4" fill={color} />
            <circle cx={width*3/4} cy={height/2} r="4" fill={color} />
            <line x1={width/4} y1={height/2-10} x2={width*3/4} y2={height/2-10} stroke={color} strokeWidth="2" />
            <line x1={width/2} y1={height/2-10} x2={width/2} y2={height/2-20} stroke={color} strokeWidth="2" />
          </svg>
        )
      
      case 'pinheader':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <rect x="5" y="5" width={width-10} height={height-10} fill="none" stroke={color} strokeWidth="2" />
            {[...Array(8)].map((_, i) => (
              <circle key={i} cx="10" cy={10 + i * 10} r="2" fill={color} />
            ))}
          </svg>
        )
      
      case 'testpoint':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <circle cx={width/2} cy={height/2} r={Math.min(width, height)/3} fill="none" stroke={color} strokeWidth="2" />
            <circle cx={width/2} cy={height/2} r="2" fill={color} />
          </svg>
        )

      case 'net':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path
              d={`M 2 ${height * 0.2} L ${Math.max(24, width * 0.62)} ${height * 0.2} L ${Math.max(30, width * 0.72)} ${height / 2} L ${Math.max(24, width * 0.62)} ${height * 0.8} L 2 ${height * 0.8} Z`}
              fill="none"
              stroke={color}
              strokeWidth="2"
            />
            <line x1={Math.max(30, width * 0.72)} y1={height / 2} x2={width - 2} y2={height / 2} stroke={color} strokeWidth="2" />
          </svg>
        )
      
      case 'voltageprobe':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <circle cx={width/3} cy={height/2} r="8" fill="none" stroke={color} strokeWidth="2" />
            <line x1="0" y1={height/2} x2={width/3 - 8} y2={height/2} stroke={color} strokeWidth="2" />
            <line x1={width/3} y1={height/2 - 8} x2={width/3} y2="0" stroke={color} strokeWidth="2" />
            <line x1={width/3} y1={height/2 + 8} x2={width/3} y2={height} stroke={color} strokeWidth="2" />
            <line x1={width/3 + 8} y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth="1" strokeDasharray="3,3" />
          </svg>
        )
      
      case 'voltagesource':
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <line x1="0" y1={height/2} x2="10" y2={height/2} stroke={color} strokeWidth="2" />
            <circle cx={width/2} cy={height/2} r="10" fill="none" stroke={color} strokeWidth="2" />
            <line x1={width/2} y1={height/2 - 6} x2={width/2} y2={height/2 + 6} stroke={color} strokeWidth="2" />
            <line x1={width/2 - 6} y1={height/2} x2={width/2 + 6} y2={height/2} stroke={color} strokeWidth="2" />
            <line x1={width - 10} y1={height/2} x2={width} y2={height/2} stroke={color} strokeWidth="2" />
          </svg>
        )
      
      default:
        return (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <rect width={width} height={height} fill="none" stroke={color} strokeWidth="1" strokeDasharray="2,2" />
          </svg>
        )
    }
  }

  return <>{renderSymbol()}</>
}
