'use client'

import { useRef, useState } from 'react'
import { Pin } from '@/types'
import { PinCard } from '@/components/pin/PinCard'
import { useMapStore } from '@/lib/stores'
import { cn } from '@/lib/utils'
import { ChevronUp, X } from 'lucide-react'

interface BottomSheetProps {
  pins: Pin[]
  loading: boolean
}

export function BottomSheet({ pins, loading }: BottomSheetProps) {
  const { selectedPinId, setSelectedPinId } = useMapStore()
  const [expanded, setExpanded] = useState(false)
  const selectedPin = pins.find(p => p.id === selectedPinId)

  return (
    <div className={cn(
      'absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 z-20',
      expanded ? 'max-h-[70vh]' : selectedPin ? 'max-h-56' : 'max-h-40'
    )}>
      {/* Handle */}
      <div
        className="flex flex-col items-center pt-3 pb-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-1 rounded-full bg-zinc-200" />
        <div className="flex items-center justify-between w-full px-4 mt-2">
          <span className="text-sm font-semibold text-zinc-800">
            {loading ? 'Cargando...' : `${pins.length} parche${pins.length !== 1 ? 's' : ''} cerca`}
          </span>
          <ChevronUp className={cn('w-4 h-4 text-zinc-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {/* Selected pin preview */}
      {selectedPin && !expanded && (
        <div className="px-4 pb-4">
          <div className="relative">
            <button
              onClick={() => setSelectedPinId(null)}
              className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white shadow-sm hover:bg-zinc-50"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <PinCard pin={selectedPin} compact />
          </div>
        </div>
      )}

      {/* Full list */}
      {expanded && (
        <div className="overflow-y-auto max-h-[calc(70vh-60px)] px-4 pb-6 space-y-2">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}
          {!loading && pins.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📍</p>
              <p className="text-sm font-medium text-zinc-600">No hay parches activos ahora</p>
              <p className="text-xs text-zinc-400 mt-1">¡Crea el primero tocando el mapa!</p>
            </div>
          )}
          {!loading && pins.map(pin => (
            <PinCard key={pin.id} pin={pin} />
          ))}
        </div>
      )}
    </div>
  )
}
