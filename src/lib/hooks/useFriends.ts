'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Friendship, Profile, PinInvite } from '@/types'

// ─── Get my friends (accepted) ────────────────────────────────────
export function useFriends(userId?: string) {
  return useQuery({
    queryKey: ['friends', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<Profile[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, requester_id, addressee_id, status,
          requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, is_local, home_country, bio, interests),
          addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url, is_local, home_country, bio, interests)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      if (error) throw error

      // Return the OTHER person in each friendship
      return (data ?? []).map((f: any) =>
        f.requester_id === userId ? f.addressee : f.requester
      ).filter(Boolean)
    },
  })
}

// ─── Get pending friend requests (received) ───────────────────────
export function useFriendRequests(userId?: string) {
  return useQuery({
    queryKey: ['friend-requests', userId],
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Friendship[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url, is_local, home_country)
        `)
        .eq('addressee_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Friendship[]
    },
  })
}

// ─── Check friendship status with another user ────────────────────
export function useFriendshipStatus(otherUserId?: string, myUserId?: string) {
  return useQuery({
    queryKey: ['friendship-status', myUserId, otherUserId],
    enabled: !!otherUserId && !!myUserId && otherUserId !== myUserId,
    staleTime: 30_000,
    queryFn: async (): Promise<'none' | 'pending_sent' | 'pending_received' | 'accepted'> => {
      const supabase = createClient()
      const { data } = await supabase
        .from('friendships')
        .select('status, requester_id')
        .or(
          `and(requester_id.eq.${myUserId},addressee_id.eq.${otherUserId}),` +
          `and(requester_id.eq.${otherUserId},addressee_id.eq.${myUserId})`
        )
        .maybeSingle()

      if (!data) return 'none'
      if (data.status === 'accepted') return 'accepted'
      if (data.status === 'pending') {
        return data.requester_id === myUserId ? 'pending_sent' : 'pending_received'
      }
      return 'none'
    },
  })
}

// ─── Send friend request ──────────────────────────────────────────
export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (user.id === addresseeId) throw new Error('No puedes agregarte a ti mismo')

      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending',
      })
      if (error) {
        if (error.code === '23505') throw new Error('Solicitud ya enviada')
        throw new Error(error.message)
      }
    },
    onSuccess: (_, addresseeId) => {
      qc.invalidateQueries({ queryKey: ['friendship-status'] })
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

// ─── Accept friend request ────────────────────────────────────────
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

// ─── Decline / remove friend ──────────────────────────────────────
export function useRemoveFriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),` +
          `and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`
        )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
      qc.invalidateQueries({ queryKey: ['friend-requests'] })
      qc.invalidateQueries({ queryKey: ['friendship-status'] })
    },
  })
}

// ─── Get my pin invites (received) ───────────────────────────────
export function usePinInvites(userId?: string) {
  return useQuery({
    queryKey: ['pin-invites', userId],
    enabled: !!userId,
    staleTime: 20_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<PinInvite[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pin_invites')
        .select(`
          *,
          pin:pins(id, title, category, expires_at, venue_name, status),
          inviter:profiles!pin_invites_inviter_id_fkey(id, display_name, avatar_url)
        `)
        .eq('invitee_id', userId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as PinInvite[]
    },
  })
}

// ─── Respond to pin invite ────────────────────────────────────────
export function useRespondPinInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ inviteId, pinId, accept }: { inviteId: string; pinId: string; accept: boolean }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase
        .from('pin_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId)

      if (accept) {
        await supabase.from('pin_members').insert({
          pin_id: pinId,
          user_id: user.id,
          status: 'active',
          confirmed_attendance: false,
        })
      }
    },
    onSuccess: (_, { pinId }) => {
      qc.invalidateQueries({ queryKey: ['pin-invites'] })
      qc.invalidateQueries({ queryKey: ['pin', pinId] })
      qc.invalidateQueries({ queryKey: ['pins'] })
    },
  })
}
