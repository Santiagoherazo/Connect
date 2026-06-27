'use client'

import { Pin } from '@/types'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { Countdown } from '@/components/ui/Countdown'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { Users, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PinCardProps {
  pin: Pin
  compact?: boolean
  className?: string
}

export function PinCard({ pin, compact = false, className }: PinCardProps) {
  const router = useRouter()
  const spotsLeft = pin.max_members - (pin.member_count ?? 0)
  const isFull = spotsLeft <= 0

  return (
    <button
      onClick={() => router.push(`/pin/${pin.id}`)}
      className={cn(
        'w-full text-left bg-white rounded-2xl border border-zinc-100 shadow-sm',
        'hover:shadow-md hover:border-zinc-200 transition-all active:scale-[0.98]',
        compact ? 'p-3' : 'p-4',
        isFull && 'opacity-70',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <CategoryBadge category={pin.category} size="sm" />
          <h3 className={cn(
            'font-semibold text-zinc-900 mt-1.5 leading-snug',
            compact ? 'text-sm' : 'text-base'
          )}>
            {pin.title}
          </h3>
        </div>
        <Countdown expiresAt={pin.expires_at} className="flex-shrink-0 mt-0.5" />
      </div>

      {/* Description */}
      {pin.description && !compact && (
        <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{pin.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Creator + members */}
        <div className="flex items-center gap-2">
          {pin.creator && (
            <Avatar profile={pin.creator} size="xs" showLocalBadge />
          )}
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Users className="w-3 h-3" />
            <span>
              {pin.member_count ?? 0}/{pin.max_members}
            </span>
            {!isFull && (
              <span className="text-teal-600 font-medium ml-0.5">
                · {spotsLeft} libre{spotsLeft !== 1 ? 's' : ''}
              </span>
            )}
            {isFull && (
              <span className="text-red-500 font-medium ml-0.5">· Lleno</span>
            )}
          </div>
        </div>

        {/* Venue */}
        {pin.venue_name && (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{pin.venue_name}</span>
          </div>
        )}
      </div>
    </button>
  )
}
