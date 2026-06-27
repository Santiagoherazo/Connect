'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores'

// ─── Hook centralizado de auth ────────────────────────────────────
// Evita que cada componente haga su propio getUser() → reduce llamadas a Supabase
export function useCurrentUser() {
  const { profile, setProfile } = useAuthStore()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      setLoading(false)

      if (uid && !profile) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single()
          .then(({ data: p }) => {
            if (p) setProfile(p as any)
          })
      }
    })

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null)
      if (!session) setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { userId, loading, profile }
}
