'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Pin, PinCategory, PinDuration } from '@/types'
import { getExpiryDate } from '@/lib/utils'

const supabase = createClient()

// ─── Cache agresivo: los pines no cambian cada segundo ────────────
const PINS_STALE = 45_000   // 45s antes de refetch automático
const PINS_CACHE = 120_000  // 2min en caché aunque sea stale

export function usePins(category?: PinCategory | null) {
  return useQuery({
    queryKey: ['pins', category],
    queryFn: async (): Promise<Pin[]> => {
      let query = supabase
        .from('pins')
        .select(`
          id, title, description, category,
          lat, lng, venue_name, max_members,
          expires_at, status, meeting_point, created_at,
          creator_id,
          creator:profiles!pins_creator_id_fkey(
            id, display_name, avatar_url, is_local, home_country
          ),
          member_count:pin_members(count)
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50) // máx 50 pines en pantalla → limita payload

      if (category) query = query.eq('category', category)

      const { data, error } = await query
      if (error) throw error

      return (data ?? []).map((p: any) => ({
        ...p,
        member_count: p.member_count?.[0]?.count ?? 0,
      }))
    },
    staleTime: PINS_STALE,
    gcTime: PINS_CACHE,
    refetchInterval: 60_000,          // refetch cada 60s (no 30s)
    refetchIntervalInBackground: false, // NO refetch si la tab está oculta
    refetchOnWindowFocus: false,        // NO refetch al volver al tab
  })
}

export function usePin(id: string) {
  return useQuery({
    queryKey: ['pin', id],
    queryFn: async (): Promise<Pin | null> => {
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('pins')
        .insert({
          creator_id: user.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          lat: input.lat,
          lng: input.lng,
          venue_name: input.venue_name ?? null,
          max_members: input.max_members,
          expires_at: getExpiryDate(input.duration).toISOString(),
          meeting_point: input.meeting_point ?? null,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('pin_members').insert({
        pin_id: data.id,
        user_id: user.id,
        status: 'active',
        confirmed_attendance: false,
      })

      return data as Pin
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pins'] }),
  })
}

export function useJoinPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pinId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('pin_members').insert({
        pin_id: pinId, user_id: user.id, status: 'active', confirmed_attendance: false,
      })
      if (error) throw error
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('pin_members')
        .update({ status: 'left' })
        .eq('pin_id', pinId)
        .eq('user_id', user.id)
      if (error) throw error
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
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
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
