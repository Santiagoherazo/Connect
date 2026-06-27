'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/lib/stores'
import { MEDELLIN_CENTER } from '@/lib/utils'

export function useGeolocation() {
  const setUserLocation = useMapStore(s => s.setUserLocation)
  const watchId = useRef<number | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (!navigator.geolocation) {
      setUserLocation(MEDELLIN_CENTER)
      return
    }

    // Posición rápida inmediata (baja precisión pero instantánea)
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      ()    => setUserLocation(MEDELLIN_CENTER),
      { timeout: 4000, maximumAge: 60_000, enableHighAccuracy: false }
    )

    // Tracking continuo de alta precisión
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      (err) => console.warn('GPS watch error:', err.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
