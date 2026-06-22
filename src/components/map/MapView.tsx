'use client'

import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Pin, CATEGORY_META } from '@/types'
import { useMapStore } from '@/lib/stores'
import { MEDELLIN_CENTER } from '@/lib/utils'

// ─── Tile gratuito via OpenStreetMap / Carto ──────────────────────
// Sin API key, sin tarjeta, sin límites
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    'carto-light': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: 'carto-light-layer',
      type: 'raster',
      source: 'carto-light',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

interface MapViewProps {
  pins: Pin[]
  onMapClick?: (coords: [number, number]) => void
}

export function MapView({ pins, onMapClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map())
  const {
    userLocation,
    selectedPinId,
    setSelectedPinId,
    setShowNewPinModal,
    setNewPinCoords,
  } = useMapStore()

  // ── Init map ─────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: userLocation ?? MEDELLIN_CENTER,
      zoom: 13.5,
      fadeDuration: 0,
      attributionControl: false,
    })

    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    )

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'bottom-right'
    )

    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserLocation: true,
      }),
      'bottom-right'
    )

    // Click en mapa → crear parche
    map.current.on('click', (e) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      if (onMapClick) {
        onMapClick(coords)
      } else {
        setNewPinCoords(coords)
        setShowNewPinModal(true)
      }
    })
  }, [])

  // ── Actualizar markers ────────────────────────────────────────
  const updateMarkers = useCallback(() => {
    if (!map.current) return

    const currentIds = new Set(pins.map(p => p.id))

    // Remover los que ya no existen
    markers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        markers.current.delete(id)
      }
    })

    // Agregar nuevos (no recrear existentes)
    pins.forEach((pin) => {
      if (markers.current.has(pin.id)) return

      const meta = CATEGORY_META[pin.category]
      const isFull = (pin.member_count ?? 0) >= pin.max_members

      const el = document.createElement('div')
      el.innerHTML = `
        <div class="pmarker ${isFull ? 'pmarker--full' : ''}"
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

  // ── Volar al pin seleccionado ─────────────────────────────────
  useEffect(() => {
    if (!selectedPinId || !map.current) return
    const pin = pins.find(p => p.id === selectedPinId)
    if (pin) {
      map.current.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 15,
        duration: 500,
        offset: [0, -100],
      })
    }
  }, [selectedPinId, pins])

  return (
    <>
      <style>{`
        .pmarker { cursor: pointer; }
        .pmarker__pin {
          width: 44px; height: 44px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: var(--mc);
          border: 3px solid white;
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
          display: flex; align-items: center; justify-content: center;
          transition: transform .15s, box-shadow .15s;
          will-change: transform;
        }
        .pmarker:hover .pmarker__pin {
          transform: rotate(-45deg) scale(1.18);
          box-shadow: 0 5px 18px rgba(0,0,0,0.3);
        }
        .pmarker--full .pmarker__pin { opacity: 0.6; }
        .pmarker__emoji {
          transform: rotate(45deg);
          font-size: 18px; line-height: 1;
          display: block;
        }
        .maplibregl-ctrl-bottom-right { bottom: 180px !important; }
        .maplibregl-ctrl-attrib { font-size: 10px !important; }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />
    </>
  )
}
