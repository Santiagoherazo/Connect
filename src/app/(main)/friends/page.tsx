'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/lib/hooks/useAuth'
import {
  useFriends, useFriendRequests,
  useAcceptFriendRequest, useRemoveFriend,
  usePinInvites, useRespondPinInvite,
} from '@/lib/hooks/useFriends'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { Countdown } from '@/components/ui/Countdown'
import { ArrowLeft, UserCheck, UserX, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Tab = 'friends' | 'requests' | 'invites'

export default function FriendsPage() {
  const { userId } = useCurrentUser()
  const [tab, setTab] = useState<Tab>('friends')
  const router = useRouter()

  const { data: friends = [], isLoading: lF } = useFriends(userId ?? undefined)
  const { data: requests = [], isLoading: lR } = useFriendRequests(userId ?? undefined)
  const { data: invites = [], isLoading: lI } = usePinInvites(userId ?? undefined)
  const acceptFriend = useAcceptFriendRequest()
  const removeFriend = useRemoveFriend()
  const respondInvite = useRespondPinInvite()

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'friends', label: 'Mis amigos', count: friends.length },
    { key: 'requests', label: 'Solicitudes', count: requests.length },
    { key: 'invites', label: 'Invitaciones', count: invites.length },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-zinc-100">
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <h1 className="text-base font-semibold flex-1">Amigos</h1>
          {(requests.length + invites.length) > 0 && (
            <span className="bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length + invites.length}
            </span>
          )}
        </div>
        <div className="flex">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex-1 py-3 text-xs font-medium transition-colors relative',
                tab === t.key ? 'text-teal-600' : 'text-zinc-500')}>
              {t.label}
              {t.count > 0 && (
                <span className={cn('ml-1 text-[10px] font-bold rounded-full px-1.5 py-0.5',
                  tab === t.key ? 'bg-teal-100 text-teal-700' : 'bg-zinc-100 text-zinc-500')}>
                  {t.count}
                </span>
              )}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-3">

        {/* FRIENDS */}
        {tab === 'friends' && (
          <>
            {lF && <Spinner />}
            {!lF && friends.length === 0 && (
              <Empty icon="👥" title="Aún no tienes amigos en Parche" desc="Visita el perfil de alguien en un parche y agrégalo" />
            )}
            {friends.map(f => (
              <div key={f.id} className="bg-white rounded-2xl p-4 flex items-center gap-3">
                <button onClick={() => router.push(`/profile/${f.id}`)}>
                  <Avatar profile={f} size="md" showLocalBadge />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => router.push(`/profile/${f.id}`)}
                    className="text-sm font-semibold text-zinc-900 hover:text-teal-600 block text-left">
                    {f.display_name}
                  </button>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {f.is_local ? '🏠 Local' : `✈️ ${f.home_country ?? 'Visitante'}`}
                  </p>
                </div>
                <Button onClick={() => removeFriend.mutate(f.id)} loading={removeFriend.isPending}
                  variant="ghost" size="sm" className="text-zinc-400 hover:text-red-500">
                  <UserX className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </>
        )}

        {/* REQUESTS */}
        {tab === 'requests' && (
          <>
            {lR && <Spinner />}
            {!lR && requests.length === 0 && (
              <Empty icon="🤝" title="Sin solicitudes pendientes" desc="Cuando alguien te agregue, aparecerá aquí" />
            )}
            {requests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={() => router.push(`/profile/${req.requester?.id}`)}>
                    <Avatar profile={req.requester!} size="md" showLocalBadge />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{req.requester?.display_name}</p>
                    <p className="text-xs text-zinc-400">Quiere ser tu amigo en Parche</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => acceptFriend.mutate(req.requester_id)}
                    loading={acceptFriend.isPending} size="sm" className="flex-1 gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" /> Aceptar
                  </Button>
                  <Button onClick={() => removeFriend.mutate(req.requester_id)}
                    loading={removeFriend.isPending} variant="secondary" size="sm" className="flex-1">
                    Ignorar
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* INVITES */}
        {tab === 'invites' && (
          <>
            {lI && <Spinner />}
            {!lI && invites.length === 0 && (
              <Empty icon="📍" title="Sin invitaciones pendientes" desc="Cuando un amigo te invite a un parche, aparecerá aquí" />
            )}
            {invites.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar profile={inv.inviter!} size="xs" />
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-800">{inv.inviter?.display_name}</span> te invitó a un parche
                  </p>
                </div>
                {inv.pin && (
                  <div className="bg-zinc-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryBadge category={inv.pin.category as any} size="sm" />
                      <Countdown expiresAt={inv.pin.expires_at} />
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">{inv.pin.title}</p>
                    {inv.pin.venue_name && (
                      <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{inv.pin.venue_name}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => respondInvite.mutate({ inviteId: inv.id, pinId: inv.pin_id, accept: true })}
                    loading={respondInvite.isPending} size="sm" className="flex-1">
                    ✅ Aceptar y unirme
                  </Button>
                  <Button
                    onClick={() => respondInvite.mutate({ inviteId: inv.id, pinId: inv.pin_id, accept: false })}
                    variant="secondary" size="sm" className="flex-1">
                    Declinar
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Empty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      <p className="text-xs text-zinc-400 mt-1">{desc}</p>
    </div>
  )
}
