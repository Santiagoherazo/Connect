'use client'

import { useEffect, useState } from 'react'
import { MapView } from '@/components/map/MapView'
import { BottomSheet } from '@/components/map/BottomSheet'
import { CategoryFilter } from '@/components/ui/CategoryBadge'
import { NewPinForm } from '@/components/pin/NewPinForm'
import { usePins } from '@/lib/hooks/usePins'
import { useFriendRequests, usePinInvites } from '@/lib/hooks/useFriends'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { useMapStore } from '@/lib/stores'
import { createClient } from '@/lib/supabase/client'
import { PinCategory } from '@/types'
import { Plus, User, RefreshCw, Users } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function MapPage() {
  useGeolocation()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const {
    selectedCategory, setSelectedCategory,
    showNewPinModal, setShowNewPinModal, setNewPinCoords,
  } = useMapStore()

  const { data: pins = [], isLoading, refetch, isFetching } = usePins(selectedCategory)
  const { data: friendRequests = [] } = useFriendRequests(userId ?? undefined)
  const { data: pinInvites = [] } = usePinInvites(userId ?? undefined)
  const notifCount = friendRequests.length + pinInvites.length

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-100">

      {/* Map */}
      <div className="absolute inset-0">
        <MapView
          pins={pins}
          onMapClick={(coords) => { setNewPinCoords(coords); setShowNewPinModal(true) }}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="flex items-start gap-2">
          {/* Logo */}
          <div className="pointer-events-auto bg-white rounded-2xl px-4 py-2.5 shadow-md flex items-center gap-2">
            <span className="text-lg">📍</span>
            <span className="text-base font-bold text-zinc-900">Parche</span>
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className={cn(
              'pointer-events-auto bg-white rounded-2xl p-2.5 shadow-md text-zinc-500 transition-all',
              isFetching && 'animate-spin text-teal-600'
            )}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Friends */}
          <Link
            href="/friends"
            className="pointer-events-auto relative bg-white rounded-2xl p-2.5 shadow-md text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <Users className="w-5 h-5" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className="pointer-events-auto bg-white rounded-2xl p-2.5 shadow-md text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>

        {/* Filters */}
        <div className="mt-3 pointer-events-auto">
          <CategoryFilter
            selected={selectedCategory}
            onChange={(cat) => setSelectedCategory(cat as PinCategory | null)}
          />
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowNewPinModal(true)}
        className="absolute bottom-48 right-4 z-20 bg-teal-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg hover:bg-teal-700 active:scale-95 transition-all"
        aria-label="Crear parche"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom sheet */}
      <BottomSheet pins={pins} loading={isLoading} />

      {/* New pin modal */}
      {showNewPinModal && (
        <NewPinForm onClose={() => { setShowNewPinModal(false); setNewPinCoords(null) }} />
      )}
    </div>
  )
}
