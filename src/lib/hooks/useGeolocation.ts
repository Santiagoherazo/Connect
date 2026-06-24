'use client'

import { useEffect, useRef } from 'react'
import { useMapStore } from '@/lib/stores'
import { MEDELLIN_CENTER } from '@/lib/utils'

export function useGeolocation() {
  // Bug fix: usar ref para setUserLocation — evita el loop infinito
  // (setUserLocation es nueva referencia en cada render de Zustand)
  const setUserLocation = useMapStore(s => s.setUserLocation)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!navigator.geolocation) {
      setUserLocation(MEDELLIN_CENTER)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
      ()    => setUserLocation(MEDELLIN_CENTER),
      { timeout: 6000, maximumAge: 300_000 } // cache 5 min
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
