'use client'

import { useEffect, useState } from 'react'
import { cn, getCountdown, getUrgencyLevel } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface CountdownProps {
  expiresAt: string
  onExpire?: () => void
  className?: string
  showIcon?: boolean
}

export function Countdown({ expiresAt, onExpire, className, showIcon = true }: CountdownProps) {
  const [countdown, setCountdown] = useState(getCountdown(expiresAt))
  const [urgency, setUrgency] = useState(getUrgencyLevel(expiresAt))

  useEffect(() => {
    const tick = () => {
      const c = getCountdown(expiresAt)
      const u = getUrgencyLevel(expiresAt)
      setCountdown(c)
      setUrgency(u)
      if (c === 'Expirado') {
        onExpire?.()
        clearInterval(interval)
      }
    }

    const interval = setInterval(tick, 30_000) // update every 30s
    tick() // run immediately
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
        {
          'bg-red-100 text-red-700': urgency === 'critical',
          'bg-amber-100 text-amber-700': urgency === 'warning',
          'bg-zinc-100 text-zinc-600': urgency === 'normal',
        },
        className
      )}
    >
      {showIcon && <Clock className="w-3 h-3" />}
      {countdown}
    </span>
  )
}
