'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Pin, PinCategory, PinDuration } from '@/types'
import { getExpiryDate } from '@/lib/utils'

// ─── Bug fix: NO inicializar supabase a nivel de módulo ───────────
// Se crea dentro de cada función para evitar problemas con SSR/cookies

export function usePins(category?: PinCategory | null) {
  return useQuery({
    queryKey: ['pins', category],
    queryFn: async (): Promise<Pin[]> => {
      const supabase = createClient()
      let query = supabase
        .from('pins')
        .select(`
          id, title, description, category,
          lat, lng, venue_name, max_members,
          expires_at, status, meeting_point, created_at, creator_id,
          creator:profiles!pins_creator_id_fkey(
            id, display_name, avatar_url, is_local, home_country
          ),
          member_count:pin_members(count)
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (category) query = query.eq('category', category)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((p: any) => ({
        ...p,
        member_count: p.member_count?.[0]?.count ?? 0,
      }))
    },
    staleTime: 45_000,
    gcTime: 120_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  })
}

export function usePin(id: string) {
  return useQuery({
    queryKey: ['pin', id],
    queryFn: async (): Promise<Pin | null> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pins')
        .select(`
          *,
          creator:profiles!pins_creator_id_fkey(*),
          members:pin_members(
            *,
            profile:profiles(id, display_name, avatar_url, is_local, home_country)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Pin
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

interface CreatePinInput {
  title: string
  description?: string
  category: PinCategory
  lat: number
  lng: number
  venue_name?: string
  max_members: number
  duration: PinDuration
  meeting_point?: string
}

export function useCreatePin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePinInput) => {
      const supabase = createClient()
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error('Debes iniciar sesión para crear un parche')

      const expiresAt = getExpiryDate(input.duration).toISOString()

      const { data, error } = await supabase
        .from('pins')
        .insert({
          creator_id: user.id,
          title: input.title,
          description: input.description || null,
          category: input.category,
          lat: input.lat,
          lng: input.lng,
          venue_name: input.venue_name || null,
          max_members: input.max_members,
          expires_at: expiresAt,
          meeting_point: input.meeting_point || null,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Auto-join creator
      const { error: memberErr } = await supabase.from('pin_members').insert({
        pin_id: data.id,
        user_id: user.id,
        status: 'active',
        confirmed_attendance: true,
      })
      if (memberErr) throw new Error(memberErr.message)

      // System message
      await supabase.from('pin_messages').insert({
        pin_id: data.id,
        sender_id: user.id,
        content: `📍 Parche creado. ¡Únete!`,
        type: 'system',
      })

      return data as Pin
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pins'] })
    },
    onError: (err) => {
      console.error('Error creating pin:', err)
    },
  })
}

export function useJoinPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pinId: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check pin is still active and has space
      const { data: pin } = await supabase
        .from('pins')
        .select('status, max_members, member_count:pin_members(count)')
        .eq('id', pinId)
        .single()

      if (!pin || pin.status !== 'active') throw new Error('El parche ya no está disponible')

      const { error } = await supabase.from('pin_members').insert({
        pin_id: pinId,
        user_id: user.id,
        status: 'active',
        confirmed_attendance: false,
      })
      if (error) {
        if (error.code === '23505') throw new Error('Ya eres miembro de este parche')
        throw new Error(error.message)
      }

      // System message
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      await supabase.from('pin_messages').insert({
        pin_id: pinId,
        sender_id: user.id,
        content: `👋 ${profile?.display_name ?? 'Alguien'} se unió al parche`,
        type: 'system',
      })
    },
    onSuccess: (_, pinId) => {
      qc.invalidateQueries({ queryKey: ['pin', pinId] })
      qc.invalidateQueries({ queryKey: ['pins'] })
    },
  })
}

export function useLeavePin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pinId: string) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('pin_members')
        .update({ status: 'left' })
        .eq('pin_id', pinId)
        .eq('user_id', user.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_, pinId) => {
      qc.invalidateQueries({ queryKey: ['pin', pinId] })
      qc.invalidateQueries({ queryKey: ['pins'] })
    },
  })
}

export function useIsMember(pinId: string, userId?: string) {
  return useQuery({
    queryKey: ['membership', pinId, userId],
    enabled: !!userId && !!pinId,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('pin_members')
        .select('pin_id')
        .eq('pin_id', pinId)
        .eq('user_id', userId!)
        .eq('status', 'active')
        .maybeSingle()
      return !!data
    },
  })
}

// ─── Invite a friend to a pin ─────────────────────────────────────
export function useInviteToPin() {
  return useMutation({
    mutationFn: async ({ pinId, friendId }: { pinId: string; friendId: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('pin_invites').insert({
        pin_id: pinId,
        inviter_id: user.id,
        invitee_id: friendId,
        status: 'pending',
      })
      if (error) {
        if (error.code === '23505') throw new Error('Ya invitaste a esta persona')
        throw new Error(error.message)
      }
    },
  })
}
