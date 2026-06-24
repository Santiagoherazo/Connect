'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'

// Devuelve amigos que tienen ubicación reciente (< 30 min) y location_sharing activo
export function useFriendLocations(userId?: string) {
  return useQuery({
    queryKey: ['friend-locations', userId],
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000, // refresca cada minuto
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Profile[]> => {
      const supabase = createClient()
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      // Amigos donde yo soy requester
      const [asRequester, asAddressee] = await Promise.all([
        supabase
          .from('friendships')
          .select(`addressee:profiles!friendships_addressee_id_fkey(
            id, display_name, avatar_url, lat, lng, last_seen_at, location_sharing
          )`)
          .eq('requester_id', userId!)
          .eq('status', 'accepted'),
        supabase
          .from('friendships')
          .select(`requester:profiles!friendships_requester_id_fkey(
            id, display_name, avatar_url, lat, lng, last_seen_at, location_sharing
          )`)
          .eq('addressee_id', userId!)
          .eq('status', 'accepted'),
      ])

      const friends: Profile[] = []
      asRequester.data?.forEach((f: any) => f.addressee && friends.push(f.addressee))
      asAddressee.data?.forEach((f: any) => f.requester && friends.push(f.requester))

      // Filtrar: solo los que tienen ubicación reciente y sharing activo
      return friends.filter(f =>
        f.location_sharing &&
        f.lat != null &&
        f.lng != null &&
        f.last_seen_at != null &&
        f.last_seen_at > thirtyMinutesAgo
      )
    },
  })
}
