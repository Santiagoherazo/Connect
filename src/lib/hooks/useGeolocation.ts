'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/lib/stores'
import { useAuthStore } from '@/lib/stores'
import { createClient } from '@/lib/supabase/client'
import { MEDELLIN_CENTER } from '@/lib/utils'

export function useGeolocation() {
  const setUserLocation = useMapStore(s => s.setUserLocation)
  const flyToUser = useMapStore(s => s.flyToUser)
  const setFlyToUser = useMapStore(s => s.setFlyToUser)
  const profile = useAuthStore(s => s.profile)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!navigator.geolocation) {
      setUserLocation(MEDELLIN_CENTER)
      return
    }

    const supabase = createClient()

    const updateLocation = async (pos: GeolocationPosition) => {
      const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude]
      setUserLocation(coords)
      setFlyToUser(coords) // dispara autoenfoque en el mapa

      // Guardar en Supabase si el usuario está logueado y tiene location_sharing activo
      if (profile?.id && profile?.location_sharing !== false) {
        await supabase
          .from('profiles')
          .update({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            last_seen_at: new Date().toISOString(),
          })
          .eq('id', profile.id)
      }
    }

    navigator.geolocation.getCurrentPosition(
      updateLocation,
      () => setUserLocation(MEDELLIN_CENTER),
      { timeout: 8000, maximumAge: 60_000, enableHighAccuracy: true }
    )

    // Actualizar cada 2 minutos mientras la app está abierta
    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      () => {},
      { timeout: 10000, maximumAge: 60_000, enableHighAccuracy: true }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [profile?.id]) // re-run cuando tengamos el perfil
}
