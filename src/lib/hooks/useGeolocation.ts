'use client'

import { useEffect } from 'react'
import { useMapStore } from '@/lib/stores'
import { MEDELLIN_CENTER } from '@/lib/utils'

export function useGeolocation() {
  const { setUserLocation } = useMapStore()

  useEffect(() => {
    if (!navigator.geolocation) {
      // Fall back to Medellín center
      setUserLocation(MEDELLIN_CENTER)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
      },
      () => {
        // Permission denied — use Medellín center
        setUserLocation(MEDELLIN_CENTER)
      },
      { timeout: 5000, maximumAge: 60_000 }
    )
  }, [setUserLocation])
}
