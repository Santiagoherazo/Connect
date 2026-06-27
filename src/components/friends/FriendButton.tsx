'use client'

import { Button } from '@/components/ui/Button'
import {
  useFriendshipStatus,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRemoveFriend,
} from '@/lib/hooks/useFriends'
import { UserPlus, UserCheck, UserX, Clock } from 'lucide-react'

interface FriendButtonProps {
  otherUserId: string
  myUserId: string
}

export function FriendButton({ otherUserId, myUserId }: FriendButtonProps) {
  const { data: status, isLoading } = useFriendshipStatus(otherUserId, myUserId)
  const sendRequest = useSendFriendRequest()
  const acceptRequest = useAcceptFriendRequest()
  const removeFriend = useRemoveFriend()

  if (isLoading || otherUserId === myUserId) return null

  if (status === 'none') {
    return (
      <Button
        onClick={() => sendRequest.mutate(otherUserId)}
        loading={sendRequest.isPending}
        size="sm"
        className="gap-1.5"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Agregar amigo
      </Button>
    )
  }

  if (status === 'pending_sent') {
    return (
      <Button variant="secondary" size="sm" className="gap-1.5" disabled>
        <Clock className="w-3.5 h-3.5 text-zinc-400" />
        Solicitud enviada
      </Button>
    )
  }

  if (status === 'pending_received') {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => acceptRequest.mutate(otherUserId)}
          loading={acceptRequest.isPending}
          size="sm"
          className="gap-1.5"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Aceptar
        </Button>
        <Button
          onClick={() => removeFriend.mutate(otherUserId)}
          loading={removeFriend.isPending}
          variant="ghost"
          size="sm"
        >
          Ignorar
        </Button>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <Button
        onClick={() => removeFriend.mutate(otherUserId)}
        loading={removeFriend.isPending}
        variant="secondary"
        size="sm"
        className="gap-1.5 text-zinc-600"
      >
        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
        Amigos
      </Button>
    )
  }

  return null
}
