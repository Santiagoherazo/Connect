'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Friendship, Profile, PinInvite } from '@/types'

// ─── Amigos aceptados ─────────────────────────────────────────────
export function useFriends(userId?: string) {
  return useQuery({
    queryKey: ['friends', userId],
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<Profile[]> => {
      const supabase = createClient()

      // Dos queries simples en vez de un .or() complejo — más confiable con RLS
      const [asRequester, asAddressee] = await Promise.all([
        supabase
          .from('friendships')
          .select(`addressee:profiles!friendships_addressee_id_fkey(
            id, display_name, avatar_url, is_local, home_country, bio, interests
          )`)
          .eq('requester_id', userId!)
          .eq('status', 'accepted'),
        supabase
          .from('friendships')
          .select(`requester:profiles!friendships_requester_id_fkey(
            id, display_name, avatar_url, is_local, home_country, bio, interests
          )`)
          .eq('addressee_id', userId!)
          .eq('status', 'accepted'),
      ])

      const friends: Profile[] = []
      asRequester.data?.forEach((f: any) => f.addressee && friends.push(f.addressee))
      asAddressee.data?.forEach((f: any) => f.requester && friends.push(f.requester))
      return friends
    },
  })
}

// ─── Solicitudes recibidas pendientes ─────────────────────────────
export function useFriendRequests(userId?: string) {
  return useQuery({
    queryKey: ['friend-requests', userId],
    enabled: !!userId,
    staleTime: 20_000,
    refetchInterval: 45_000,          // menos frecuente
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Friendship[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, requester_id, addressee_id, status, created_at, updated_at,
          requester:profiles!friendships_requester_id_fkey(
            id, display_name, avatar_url, is_local, home_country
          )
        `)
        .eq('addressee_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as Friendship[]
    },
  })
}

// ─── Estado de amistad entre dos usuarios ─────────────────────────
// Bug fix: query separada por dirección — evita el .or() anidado
// que RLS bloquea cuando no eres ambas partes
export function useFriendshipStatus(otherUserId?: string, myUserId?: string) {
  return useQuery({
    queryKey: ['friendship-status', myUserId, otherUserId],
    enabled: !!otherUserId && !!myUserId && otherUserId !== myUserId,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted'> => {
      const supabase = createClient()

      // Check ambas direcciones por separado
      const [sent, received] = await Promise.all([
        supabase
          .from('friendships')
          .select('status')
          .eq('requester_id', myUserId!)
          .eq('addressee_id', otherUserId!)
          .maybeSingle(),
        supabase
          .from('friendships')
          .select('status')
          .eq('requester_id', otherUserId!)
          .eq('addressee_id', myUserId!)
          .maybeSingle(),
      ])

      if (sent.data) {
        return sent.data.status === 'accepted' ? 'accepted' : 'pending_sent'
      }
      if (received.data) {
        return received.data.status === 'accepted' ? 'accepted' : 'pending_received'
      }
      return 'none'
    },
  })
}

// ─── Enviar solicitud de amistad ──────────────────────────────────
export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const supabase = createClient()
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Debes iniciar sesión')
      if (user.id === addresseeId) throw new Error('No puedes agregarte a ti mismo')

      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending',
      })

      if (error) {
        if (error.code === '23505') throw new Error('Solicitud ya enviada')
        // RLS error — usuario no autenticado correctamente
        if (error.code === '42501') throw new Error('Sin permiso. Recarga e intenta de nuevo.')
        throw new Error(error.message)
      }
    },
    onSuccess: (_, addresseeId) => {
      // Optimistic update — no esperar refetch
      qc.setQueryData(
        ['friendship-status'],
        () => 'pending_sent'
      )
      qc.invalidateQueries({ queryKey: ['friendship-status'] })
    },
    onError: (err) => {
      console.error('Send friend request error:', err)
    },
  })
}

// ─── Aceptar solicitud ────────────────────────────────────────────
export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (requesterId: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('requester_id', requesterId)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
      qc.invalidateQueries({ queryKey: ['friendship-status'] })
    },
  })
}

// ─── Eliminar / rechazar amistad ──────────────────────────────────
export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete en ambas direcciones por separado (evita .or() con RLS)
      await Promise.all([
        supabase.from('friendships')
          .delete()
          .eq('requester_id', user.id)
          .eq('addressee_id', otherUserId),
        supabase.from('friendships')
          .delete()
          .eq('requester_id', otherUserId)
          .eq('addressee_id', user.id),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
      qc.invalidateQueries({ queryKey: ['friendship-status'] })
    },
  })
}

// ─── Invitaciones a pines recibidas ──────────────────────────────
export function usePinInvites(userId?: string) {
  return useQuery({
    queryKey: ['pin-invites', userId],
    enabled: !!userId,
    staleTime: 20_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<PinInvite[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pin_invites')
        .select(`
          id, pin_id, inviter_id, invitee_id, status, created_at,
          pin:pins(id, title, category, expires_at, venue_name, status),
          inviter:profiles!pin_invites_inviter_id_fkey(id, display_name, avatar_url)
        `)
        .eq('invitee_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as PinInvite[]
    },
  })
}

// ─── Responder invitación a pin ───────────────────────────────────
export function useRespondPinInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      inviteId, pinId, accept,
    }: { inviteId: string; pinId: string; accept: boolean }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase
        .from('pin_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId)
        .eq('invitee_id', user.id)

      if (accept) {
        const { error } = await supabase.from('pin_members').insert({
          pin_id: pinId,
          user_id: user.id,
          status: 'active',
          confirmed_attendance: false,
        })
        if (error && error.code !== '23505') throw new Error(error.message)
      }
    },
    onSuccess: (_, { pinId }) => {
      qc.invalidateQueries({ queryKey: ['pin-invites'] })
      qc.invalidateQueries({ queryKey: ['pin', pinId] })
      qc.invalidateQueries({ queryKey: ['pins'] })
    },
  })
}
