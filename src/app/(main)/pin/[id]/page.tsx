'use client'

import { use, useEffect, useState } from 'react'
import { usePin, useJoinPin, useLeavePin, useIsMember } from '@/lib/hooks/usePins'
import { GroupChat } from '@/components/chat/GroupChat'
import { Avatar } from '@/components/ui/Avatar'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { Countdown } from '@/components/ui/Countdown'
import { Button } from '@/components/ui/Button'
import { InviteFriendsModal } from '@/components/friends/InviteFriendsModal'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, MapPin, Users, Sparkles, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PageProps { params: Promise<{ id: string }> }

export default function PinPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [generatingIce, setGeneratingIce] = useState(false)
  const [iceError, setIceError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [joinError, setJoinError] = useState('')

  const { data: pin, isLoading } = usePin(id)
  const joinPin = useJoinPin()
  const leavePin = useLeavePin()
  const { data: isMember } = useIsMember(id, userId ?? undefined)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const handleJoin = async () => {
    setJoinError('')
    try {
      await joinPin.mutateAsync(id)
    } catch (e: any) {
      setJoinError(e?.message ?? 'Error al unirte al parche')
    }
  }

  const handleIcebreaker = async () => {
    setGeneratingIce(true)
    setIceError('')
    try {
      const res = await fetch('/api/icebreaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinId: id }),
      })
      const data = await res.json()
      if (!res.ok) setIceError(data.error ?? 'Error generando icebreaker')
    } catch {
      setIceError('Error de conexión')
    } finally {
      setGeneratingIce(false)
    }
  }

  if (isLoading || !pin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const activeMembers = pin.members?.filter(m => m.status === 'active') ?? []
  const memberCount = activeMembers.length
  const spotsLeft = pin.max_members - memberCount
  const isCreator = pin.creator_id === userId
  const memberIds = activeMembers.map(m => m.user_id)

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <CategoryBadge category={pin.category} size="sm" />
              <Countdown expiresAt={pin.expires_at} />
            </div>
            <h1 className="text-base font-semibold text-zinc-900 truncate">{pin.title}</h1>
          </div>
        </div>

        <div className="px-4 pb-3 space-y-2.5">
          {pin.description && <p className="text-sm text-zinc-500">{pin.description}</p>}

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{memberCount}/{pin.max_members}</span>
              {spotsLeft > 0 && <span className="text-teal-600 font-medium">· {spotsLeft} libres</span>}
              {spotsLeft === 0 && <span className="text-red-500 font-medium">· Lleno</span>}
            </div>
            {pin.venue_name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[160px]">{pin.venue_name}</span>
              </div>
            )}
          </div>

          {/* Avatars — click to profile */}
          {activeMembers.length > 0 && (
            <div className="flex -space-x-1.5">
              {activeMembers.slice(0, 8).map(m =>
                m.profile ? (
                  <button
                    key={m.user_id}
                    onClick={() => router.push(`/profile/${m.user_id}`)}
                    className="ring-2 ring-white rounded-full hover:z-10 transition-transform hover:scale-110"
                  >
                    <Avatar profile={m.profile} size="xs" showLocalBadge />
                  </button>
                ) : null
              )}
              {activeMembers.length > 8 && (
                <span className="text-xs text-zinc-400 ml-1 self-center">+{activeMembers.length - 8}</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {!isMember && spotsLeft > 0 && userId && (
              <Button onClick={handleJoin} loading={joinPin.isPending} size="sm" className="flex-1">
                Unirme al parche
              </Button>
            )}
            {isMember && !isCreator && (
              <Button onClick={() => leavePin.mutate(id)} loading={leavePin.isPending} variant="ghost" size="sm">
                Salir
              </Button>
            )}
            {isMember && (
              <Button
                onClick={() => setShowInvite(true)}
                variant="secondary"
                size="sm"
                className="gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                Invitar amigos
              </Button>
            )}
            {isMember && memberCount >= 3 && (
              <Button onClick={handleIcebreaker} loading={generatingIce} variant="secondary" size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Icebreaker IA
              </Button>
            )}
            {spotsLeft === 0 && !isMember && (
              <p className="text-sm text-zinc-400 py-2">El parche está lleno 😕</p>
            )}
          </div>

          {joinError && <p className="text-xs text-red-500">{joinError}</p>}
          {iceError && <p className="text-xs text-red-500">{iceError}</p>}
        </div>
      </div>

      {/* Chat */}
      {isMember && userId ? (
        <div className="flex-1 overflow-hidden">
          <GroupChat pinId={id} currentUserId={userId} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <p className="text-3xl mb-3">🔒</p>
            <p className="text-sm font-medium text-zinc-600">Únete para ver el chat del grupo</p>
            {!userId && (
              <p className="text-xs text-zinc-400 mt-1">
                <button onClick={() => router.push('/login')} className="text-teal-600 font-medium">
                  Inicia sesión
                </button>
                {' '}para participar
              </p>
            )}
          </div>
        </div>
      )}

      {/* Invite friends modal */}
      {showInvite && (
        <InviteFriendsModal
          pinId={id}
          pinTitle={pin.title}
          currentMembers={memberIds}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}
