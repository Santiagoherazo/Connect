'use client'

import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Pin, CATEGORY_META } from '@/types'
import { useMapStore } from '@/lib/stores'
import { MEDELLIN_CENTER } from '@/lib/utils'

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
}

interface MapViewProps {
  pins: Pin[]
  onMapClick?: (coords: [number, number]) => void
}

export function MapView({ pins, onMapClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map())
  const userMarker = useRef<maplibregl.Marker | null>(null)
  // Solo centramos automáticamente UNA vez — cuando llega la primera ubicación real
  const centeredOnUser = useRef(false)

  const {
    userLocation,
    selectedPinId,
    setSelectedPinId,
    setShowNewPinModal,
    setNewPinCoords,
  } = useMapStore()

  // ── Init mapa ─────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      // Arranca en Medellín — se mueve al usuario en cuanto llega su GPS
      center: MEDELLIN_CENTER,
      zoom: 12,
      fadeDuration: 0,
      attributionControl: false,
    })

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    )

    // Click en mapa vacío → crear parche
    map.current.on('click', (e) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      setNewPinCoords(coords)
      setShowNewPinModal(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reaccionar a cambios de ubicación del usuario ─────────────
  useEffect(() => {
    if (!map.current || !userLocation) return
    const [lng, lat] = userLocation

    // ── Centrado automático: solo la primera vez que llegue GPS real ──
    if (!centeredOnUser.current) {
      centeredOnUser.current = true
      map.current.flyTo({
        center: [lng, lat],
        zoom: 15,          // zoom cercano para ver el barrio
        duration: 1200,
        essential: true,
      })
    }

    // ── Punto azul del usuario (Google Maps style) ────────────────
    if (!userMarker.current) {
      const el = document.createElement('div')
      el.className = 'user-location-marker'
      el.innerHTML = `
        <div class="user-dot">
          <div class="user-dot__halo"></div>
          <div class="user-dot__ring"></div>
          <div class="user-dot__core"></div>
        </div>`

      userMarker.current = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        pitchAlignment: 'map',
        rotationAlignment: 'map',
      })
        .setLngLat([lng, lat])
        .addTo(map.current!)
    } else {
      // Actualizar posición silenciosamente en cada update del GPS
      userMarker.current.setLngLat([lng, lat])
    }
  }, [userLocation])

  // ── Markers de pines ──────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    if (!map.current) return

    const currentIds = new Set(pins.map(p => p.id))

    // Remover los que ya expiraron o no existen
    markers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        markers.current.delete(id)
      }
    })

    // Agregar nuevos (no recrear los existentes)
    pins.forEach((pin) => {
      if (markers.current.has(pin.id)) return

      const meta = CATEGORY_META[pin.category]
      const isFull = (pin.member_count ?? 0) >= pin.max_members

      const el = document.createElement('div')
      el.innerHTML = `
        <div class="pmarker${isFull ? ' pmarker--full' : ''}"
             style="--mc:${isFull ? '#9ca3af' : meta.color}">
          <div class="pmarker__pin">
            <span class="pmarker__emoji">${meta.emoji}</span>
          </div>
        </div>`

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setSelectedPinId(pin.id)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!)

      markers.current.set(pin.id, marker)
    })
  }, [pins, setSelectedPinId])

  useEffect(() => {
    if (map.current?.isStyleLoaded()) {
      updateMarkers()
    } else {
      map.current?.on('load', updateMarkers)
    }
  }, [updateMarkers])

  // ── Volar a pin seleccionado ──────────────────────────────────
  useEffect(() => {
    if (!selectedPinId || !map.current) return
    const pin = pins.find(p => p.id === selectedPinId)
    if (pin) {
      map.current.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 15,
        duration: 500,
        offset: [0, -120],
      })
    }
  }, [selectedPinId, pins])

  return (
    <>
      <style>{`
        /* ── Punto azul del usuario ── */
        .user-dot {
          position: relative;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Halo exterior pulsante */
        .user-dot__halo {
          position: absolute;
          width: 52px;
          height: 52px;
          background: rgba(37, 99, 235, 0.12);
          border-radius: 50%;
          animation: halo-pulse 2.5s ease-out infinite;
        }
        /* Anillo medio */
        .user-dot__ring {
          position: absolute;
          width: 28px;
          height: 28px;
          background: rgba(37, 99, 235, 0.25);
          border-radius: 50%;
          animation: halo-pulse 2.5s ease-out infinite 0.4s;
        }
        /* Punto central */
        .user-dot__core {
          width: 16px;
          height: 16px;
          background: #2563EB;
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.55);
          position: relative;
          z-index: 2;
        }
        @keyframes halo-pulse {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        /* ── Markers de pines ── */
        .pmarker { cursor: pointer; }
        .pmarker__pin {
          width: 44px;
          height: 44px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: var(--mc);
          border: 3px solid white;
          box-shadow: 0 3px 12px rgba(0,0,0,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform .15s, box-shadow .15s;
          will-change: transform;
        }
        .pmarker:hover .pmarker__pin,
        .pmarker--selected .pmarker__pin {
          transform: rotate(-45deg) scale(1.2);
          box-shadow: 0 5px 18px rgba(0,0,0,0.32);
        }
        .pmarker--full .pmarker__pin { opacity: 0.55; }
        .pmarker__emoji {
          transform: rotate(45deg);
          font-size: 18px;
          line-height: 1;
          display: block;
        }
        .maplibregl-ctrl-attrib { font-size: 10px !important; }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />
    </>
  )
}
