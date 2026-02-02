import React from 'react'

interface BagelLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function BagelLoader({ text = 'Loading', size = 'md', fullScreen = true }: BagelLoaderProps) {
  const [dots, setDots] = React.useState('')

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [])

  const sizeClasses = {
    sm: { ring: 'w-10 h-10', outer: 'p-1.5', emoji: 'text-lg', dot: 'w-1 h-1' },
    md: { ring: 'w-14 h-14', outer: 'p-2', emoji: 'text-2xl', dot: 'w-1.5 h-1.5' },
    lg: { ring: 'w-20 h-20', outer: 'p-3', emoji: 'text-3xl', dot: 'w-2 h-2' },
  }

  const s = sizeClasses[size]

  const loader = (
    <div className="flex flex-col justify-center items-center gap-4">
      {/* Bagel Hologram Loader */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-bagel-orange/20 blur-xl rounded-full scale-150 animate-pulse" />

        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="absolute w-[1px] h-16 bg-bagel-orange" />
          <div className="absolute w-16 h-[1px] bg-bagel-orange" />
        </div>

        {/* Main Ring System */}
        <div className={`relative ${s.outer} border border-dashed border-bagel-orange/30 rounded-full animate-[spin_3s_linear_infinite]`}>

          <div className={`${s.ring} border border-dashed border-bagel-sesame/50 rounded-full flex justify-center items-center animate-[spin_2s_linear_infinite_reverse]`}>
            <div className="relative z-10 p-2 bg-white rounded-full border border-bagel-orange/40 shadow-[0_0_20px_-5px_#FF6B35]">
              <span className={`${s.emoji} animate-[pulse_2s_ease-in-out_infinite]`}>🥯</span>
            </div>
          </div>

          {/* 4 Orbiting Dots at Cardinal Points */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${s.dot} bg-bagel-orange rounded-full shadow-[0_0_8px_#FF6B35]`} />
          <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 ${s.dot} bg-bagel-sesame rounded-full shadow-[0_0_8px_#FFD23F]`} />
          <div className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 ${s.dot} bg-bagel-sesame rounded-full shadow-[0_0_8px_#FFD23F]`} />
          <div className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 ${s.dot} bg-bagel-orange rounded-full shadow-[0_0_8px_#FF6B35]`} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-xs font-mono tracking-[0.2em] text-bagel-orange uppercase">
          {text}{dots}
        </p>
        <p className="text-[10px] text-bagel-dark/50">The People's Private Payroll</p>
      </div>
    </div>
  )

  if (fullScreen) {
    return (
      <div className='w-full h-screen bg-bagel-cream flex flex-col justify-center items-center'>
        {loader}
      </div>
    )
  }

  return loader
}

// Export the original name as well for compatibility
export const HoloPulse = BagelLoader
