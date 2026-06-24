'use client'

import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Pin, Profile, CATEGORY_META } from '@/types'
import { useMapStore } from '@/lib/stores'
import { MEDELLIN_CENTER } from '@/lib/utils'

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
  friends?: Profile[]
  onMapClick?: (coords: [number, number]) => void
}

export function MapView({ pins, friends = [], onMapClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const pinMarkers = useRef<Map<string, maplibregl.Marker>>(new Map())
  const friendMarkers = useRef<Map<string, maplibregl.Marker>>(new Map())

  const {
    userLocation,
    flyToUser,
    setFlyToUser,
    selectedPinId,
    setSelectedPinId,
    setShowNewPinModal,
    setNewPinCoords,
  } = useMapStore()

  // ── Init map ──────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: userLocation ?? MEDELLIN_CENTER,
      zoom: 14,
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

    map.current.on('click', (e) => {
      const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
      if (onMapClick) onMapClick(coords)
      else { setNewPinCoords(coords); setShowNewPinModal(true) }
    })
  }, [])

  // ── Autoenfoque cuando llega la ubicación del usuario ─────────
  useEffect(() => {
    if (!flyToUser || !map.current) return
    map.current.flyTo({
      center: flyToUser,
      zoom: 15,
      duration: 800,
    })
    setFlyToUser(null) // consumir — solo vuela una vez
  }, [flyToUser, setFlyToUser])

  // ── Marcadores de pines ───────────────────────────────────────
  const updatePinMarkers = useCallback(() => {
    if (!map.current) return
    const currentIds = new Set(pins.map(p => p.id))

    pinMarkers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); pinMarkers.current.delete(id) }
    })

    pins.forEach((pin) => {
      if (pinMarkers.current.has(pin.id)) return
      const meta = CATEGORY_META[pin.category]
      const isFull = (pin.member_count ?? 0) >= pin.max_members

      const el = document.createElement('div')
      el.innerHTML = `
        <div class="pmarker ${isFull ? 'pmarker--full' : ''}" style="--mc:${isFull ? '#9ca3af' : meta.color}">
          <div class="pmarker__pin">
            <span class="pmarker__emoji">${meta.emoji}</span>
          </div>
        </div>`
      el.addEventListener('click', (e) => { e.stopPropagation(); setSelectedPinId(pin.id) })

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!)
      pinMarkers.current.set(pin.id, marker)
    })
  }, [pins, setSelectedPinId])

  useEffect(() => {
    if (map.current?.isStyleLoaded()) updatePinMarkers()
    else map.current?.on('load', updatePinMarkers)
  }, [updatePinMarkers])

  // ── Marcadores de amigos ──────────────────────────────────────
  const updateFriendMarkers = useCallback(() => {
    if (!map.current) return
    const currentIds = new Set(friends.map(f => f.id))

    friendMarkers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); friendMarkers.current.delete(id) }
    })

    friends.forEach((friend) => {
      if (friend.lat == null || friend.lng == null) return

      const existing = friendMarkers.current.get(friend.id)
      if (existing) {
        // Solo actualizar posición si ya existe
        existing.setLngLat([friend.lng, friend.lat])
        return
      }

      const initials = friend.display_name?.slice(0, 2).toUpperCase() ?? '??'
      const avatar = friend.avatar_url

      const el = document.createElement('div')
      el.innerHTML = `
        <div class="fmarker" title="${friend.display_name}">
          ${avatar
            ? `<img src="${avatar}" class="fmarker__avatar" alt="${friend.display_name}" />`
            : `<div class="fmarker__initials">${initials}</div>`
          }
          <div class="fmarker__dot"></div>
        </div>`

      const popup = new maplibregl.Popup({ offset: 40, closeButton: false, className: 'fmarker-popup' })
        .setHTML(`
          <div style="display:flex;align-items:center;gap:8px;padding:4px 2px">
            ${avatar ? `<img src="${avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" />` : ''}
            <div>
              <div style="font-weight:600;font-size:13px;color:#18181b">${friend.display_name}</div>
              <div style="font-size:11px;color:#71717a">${friend.is_local ? '🏠 Local' : '✈️ Visitante'}</div>
            </div>
          </div>`)

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([friend.lng, friend.lat])
        .setPopup(popup)
        .addTo(map.current!)

      el.addEventListener('click', (e) => { e.stopPropagation(); marker.togglePopup() })
      friendMarkers.current.set(friend.id, marker)
    })
  }, [friends])

  useEffect(() => {
    if (map.current?.isStyleLoaded()) updateFriendMarkers()
    else map.current?.on('load', updateFriendMarkers)
  }, [updateFriendMarkers])

  // ── Volar al pin seleccionado ─────────────────────────────────
  useEffect(() => {
    if (!selectedPinId || !map.current) return
    const pin = pins.find(p => p.id === selectedPinId)
    if (pin) map.current.flyTo({ center: [pin.lng, pin.lat], zoom: 15, duration: 500, offset: [0, -100] })
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
        }
        .pmarker:hover .pmarker__pin {
          transform: rotate(-45deg) scale(1.18);
          box-shadow: 0 5px 18px rgba(0,0,0,0.3);
        }
        .pmarker--full .pmarker__pin { opacity: 0.6; }
        .pmarker__emoji { transform: rotate(45deg); font-size: 18px; line-height: 1; display: block; }

        .fmarker { cursor: pointer; position: relative; }
        .fmarker__avatar {
          width: 38px; height: 38px; border-radius: 50%;
          border: 3px solid #14b8a6;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          object-fit: cover;
          display: block;
        }
        .fmarker__initials {
          width: 38px; height: 38px; border-radius: 50%;
          background: #14b8a6; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: white;
        }
        .fmarker__dot {
          position: absolute; bottom: 0; right: 0;
          width: 10px; height: 10px; border-radius: 50%;
          background: #22c55e; border: 2px solid white;
        }
        .fmarker-popup .maplibregl-popup-content {
          border-radius: 12px; padding: 8px 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .maplibregl-ctrl-bottom-right { bottom: 180px !important; }
        .maplibregl-ctrl-attrib { font-size: 10px !important; }
      `}</style>
      <div ref={mapContainer} className="w-full h-full" />
    </>
  )
}
