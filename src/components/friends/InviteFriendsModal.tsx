'use client'

import { useState } from 'react'
import { useFriends } from '@/lib/hooks/useFriends'
import { useInviteToPin } from '@/lib/hooks/usePins'
import { useCurrentUser } from '@/lib/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { X, Send, Check } from 'lucide-react'
import { Profile } from '@/types'

interface InviteFriendsModalProps {
  pinId: string
  pinTitle: string
  currentMembers: string[]
  onClose: () => void
}

export function InviteFriendsModal({ pinId, pinTitle, currentMembers, onClose }: InviteFriendsModalProps) {
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const { userId } = useCurrentUser()                        // Bug fix: usar userId real
  const { data: friends = [], isLoading } = useFriends(userId ?? undefined)
  const inviteToPin = useInviteToPin()

  const available = friends.filter(f => !currentMembers.includes(f.id))

  const handleInvite = async (friend: Profile) => {
    try {
      await inviteToPin.mutateAsync({ pinId, friendId: friend.id })
      setInvited(prev => new Set([...prev, friend.id]))
    } catch (e: any) {
      if (e?.message?.includes('Ya invitaste')) {
        setInvited(prev => new Set([...prev, friend.id]))
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Invitar amigos</h2>
            <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[220px]">{pinTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-zinc-100">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && available.length === 0 && (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm font-medium text-zinc-600">
                {friends.length === 0
                  ? 'Aún no tienes amigos en Parche'
                  : 'Todos tus amigos ya están en el parche'}
              </p>
            </div>
          )}
          {available.map(friend => {
            const isInvited = invited.has(friend.id)
            return (
              <div key={friend.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50">
                <Avatar profile={friend} size="sm" showLocalBadge />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{friend.display_name}</p>
                  <p className="text-xs text-zinc-400">
                    {friend.is_local ? '🏠 Local' : `✈️ ${friend.home_country ?? 'Visitante'}`}
                  </p>
                </div>
                <Button
                  onClick={() => !isInvited && handleInvite(friend)}
                  loading={inviteToPin.isPending && !isInvited}
                  disabled={isInvited}
                  size="sm"
                  variant={isInvited ? 'secondary' : 'primary'}
                  className="gap-1.5 flex-shrink-0"
                >
                  {isInvited
                    ? <><Check className="w-3.5 h-3.5 text-teal-600" />Invitado</>
                    : <><Send className="w-3.5 h-3.5" />Invitar</>}
                </Button>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-zinc-100">
          <Button variant="secondary" size="md" onClick={onClose} className="w-full">Listo</Button>
        </div>
      </div>
    </div>
  )
}
