'use client'

import { useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlayerLocation {
  user_id: string
  display_name: string
  lat: number
  lng: number
}

export interface MapMarker {
  marker_id: string
  name: string
  description: string
  content_html: string
  lat: number
  lng: number
  radius_meters: number
  marker_type: string
  interaction_type: string
  icon: string
}

interface Props {
  initialLocations: PlayerLocation[]
  currentUserId: string
  episodeId: string
  mapMarkers?: MapMarker[]
}

export function MapView({ initialLocations, currentUserId, episodeId, mapMarkers = [] }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const playerMarkersRef = useRef<Map<string, unknown>>(new Map())
  const poiMarkersRef = useRef<Map<string, unknown>>(new Map())
  const hasInitialCentered = useRef(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) return

    let map: ReturnType<typeof import('leaflet')['map']> | null = null

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) return
      if (!mapRef.current) return

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const self = initialLocations.find((l) => l.user_id === currentUserId)
      const center: [number, number] = self ? [self.lat, self.lng] : [45.5, 12.0]

      map = L.map(mapRef.current, { center, zoom: 17, zoomControl: false, attributionControl: false })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; incantica',
      }).addTo(map)

      // Player markers
      for (const loc of initialLocations) {
        const isSelf = loc.user_id === currentUserId
        const marker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({
            className: '',
            html: playerMarkerHtml(loc.display_name, isSelf),
            iconAnchor: [16, 16],
          }),
          zIndexOffset: 1000,
        }).addTo(map)
        playerMarkersRef.current.set(loc.user_id, marker)
      }

      // POI markers
      for (const poi of mapMarkers) {
        addPoiMarker(L, map, poi)
      }

      // Realtime player locations
      const channel = supabase
        .channel(`map:${episodeId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'player_current_location' },
          (payload) => {
            const raw = payload.new as { user_id: string; lat?: number; lng?: number }
            if (!raw.user_id || raw.lat == null || raw.lng == null) return

            const isSelf = raw.user_id === currentUserId
            const existing = playerMarkersRef.current.get(raw.user_id) as
              | ReturnType<typeof L.marker> | undefined

            if (existing) {
              existing.setLatLng([raw.lat, raw.lng])
            } else {
              const displayName = initialLocations.find(
                (l) => l.user_id === raw.user_id
              )?.display_name ?? '?'
              const marker = L.marker([raw.lat, raw.lng], {
                icon: L.divIcon({
                  className: '',
                  html: playerMarkerHtml(displayName, isSelf),
                  iconAnchor: [16, 16],
                }),
                zIndexOffset: 1000,
              }).addTo(map!)
              playerMarkersRef.current.set(raw.user_id, marker)
            }
          }
        )
        .subscribe()

      ;(mapInstanceRef.current as unknown as { _channel: unknown })._channel = channel
    })

    return () => {
      if (mapInstanceRef.current) {
        const m = mapInstanceRef.current as {
          remove: () => void
          _channel?: { unsubscribe: () => void }
        }
        try {
          supabase.removeChannel(
            (m as unknown as { _channel: Parameters<typeof supabase.removeChannel>[0] })._channel
          )
        } catch {}
        try { m.remove() } catch {}
        mapInstanceRef.current = null
        playerMarkersRef.current.clear()
        poiMarkersRef.current.clear()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Centra sulla posizione del player corrente (chiamato dal pulsante)
  const centerOnSelf = () => {
    const map = mapInstanceRef.current as { setView: (c: [number, number], z: number) => void } | null
    if (!map) return
    const self = initialLocations.find(l => l.user_id === currentUserId)
    if (self) map.setView([self.lat, self.lng], 17)
  }

  // Aggiorna player markers quando cambiano le locations (senza auto-center)
  useEffect(() => {
    const map = mapInstanceRef.current as {
      setView: (c: [number, number], z: number) => void
    } | null
    if (!map) return
    if (initialLocations.length === 0) return

    import('leaflet').then((L) => {
      if (!hasInitialCentered.current) {
        const self = initialLocations.find(l => l.user_id === currentUserId)
        if (self) {
          ;(map as unknown as { setView: (c: [number, number], z: number) => void })
            .setView([self.lat, self.lng], 17)
          hasInitialCentered.current = true
        }
      }

      for (const loc of initialLocations) {
        const isSelf = loc.user_id === currentUserId
        const existing = playerMarkersRef.current.get(loc.user_id) as
          | ReturnType<typeof L.marker> | undefined

        if (existing) {
          existing.setLatLng([loc.lat, loc.lng])
        } else {
          const marker = L.marker([loc.lat, loc.lng], {
            icon: L.divIcon({
              className: '',
              html: playerMarkerHtml(loc.display_name, isSelf),
              iconAnchor: [16, 16],
            }),
            zIndexOffset: 1000,
          }).addTo(map as unknown as ReturnType<typeof L.map>)
          playerMarkersRef.current.set(loc.user_id, marker)
        }
      }
    })
  }, [initialLocations, currentUserId])

  // Aggiorna POI markers quando cambiano
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    import('leaflet').then((L) => {
      // Rimuovi POI non più presenti
      const newIds = new Set(mapMarkers.map(m => m.marker_id))
      for (const [id, marker] of poiMarkersRef.current.entries()) {
        if (!newIds.has(id)) {
          ;(marker as ReturnType<typeof L.marker>).remove()
          poiMarkersRef.current.delete(id)
        }
      }
      // Aggiungi/aggiorna POI
      for (const poi of mapMarkers) {
        const existing = poiMarkersRef.current.get(poi.marker_id) as
          | ReturnType<typeof L.marker> | undefined
        if (existing) {
          existing.setLatLng([poi.lat, poi.lng])
        } else {
          addPoiMarker(L, map as ReturnType<typeof L.map>, poi)
        }
      }
    })
  }, [mapMarkers])

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .poi-popup .leaflet-popup-content-wrapper {
          background: rgba(9,8,7,0.95);
          border: 1px solid rgba(254,234,165,0.2);
          border-radius: 10px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.6);
          color: #e8e4dc;
          font-family: 'EB Garamond', Georgia, serif;
          padding: 0;
        }
        .poi-popup .leaflet-popup-content {
          margin: 0;
          width: auto !important;
        }
        .poi-popup .leaflet-popup-tip {
          background: rgba(254,234,165,0.2);
        }
        .poi-popup .leaflet-popup-close-button {
          color: rgba(255,255,255,0.4) !important;
          font-size: 18px !important;
          top: 8px !important;
          right: 10px !important;
        }
      `}</style>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          ref={mapRef}
          style={{ width: '100%', height: '100%', minHeight: '400px', background: '#1a1a18' }}
        />
        <button
          onClick={centerOnSelf}
          style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            zIndex: 1000,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(9,8,7,0.88)',
            border: '1px solid rgba(254,234,165,0.3)',
            color: '#feeaa5',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}
          title="Centrami"
        >
          ◎
        </button>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function addPoiMarker(
  L: typeof import('leaflet'),
  map: ReturnType<typeof L.map>,
  poi: MapMarker
) {
  const marker = L.marker([poi.lat, poi.lng], {
    icon: L.divIcon({
      className: '',
      html: poiMarkerHtml(poi.icon, poi.marker_type),
      iconAnchor: [20, 20],
    }),
    zIndexOffset: 500,
  })

  // Popup al click
  const popupContent = buildPopupHtml(poi)
  marker.bindPopup(popupContent, {
    className: 'poi-popup',
    maxWidth: 280,
    minWidth: 220,
  })

  marker.addTo(map)

  // Ref per aggiornamenti futuri
  const poiMarkersRefInternal = (map as unknown as { _poiMarkersRef?: Map<string, unknown> })._poiMarkersRef
  if (poiMarkersRefInternal) poiMarkersRefInternal.set(poi.marker_id, marker)

  return marker
}

function poiMarkerHtml(icon: string, markerType: string): string {
  const colors: Record<string, string> = {
    location:      'rgba(254,234,165,0.8)',
    clue:          'rgba(91,155,213,0.8)',
    npc:           'rgba(181,123,238,0.8)',
    entrance:      'rgba(100,210,120,0.8)',
    secret:        'rgba(254,234,165,0.5)',
    danger:        'rgba(255,100,80,0.8)',
    meeting_point: 'rgba(232,175,72,0.8)',
  }
  const color = colors[markerType] ?? 'rgba(255,255,255,0.6)'
  const glowColor = color.replace('0.8', '0.3').replace('0.5', '0.2')

  return `
    <div style="
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: rgba(9,8,7,0.9);
      border: 2px solid ${color};
      box-shadow: 0 0 12px ${glowColor};
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 18px;
        line-height: 1;
        display: block;
      ">${icon}</span>
    </div>
  `
}

function buildPopupHtml(poi: MapMarker): string {
  const interactionLabel: Record<string, string> = {
    claim_item:  '🎒 Raccogli oggetto',
    narrative:   '📖 Leggi',
    npc_dialog:  '💬 Parla',
    zone_effect: '✨ Entra nella zona',
    team_unlock: '👥 Punto di incontro',
  }

  const hasInteraction = poi.interaction_type !== 'none'
  const interLabel = interactionLabel[poi.interaction_type] ?? ''

  return `
    <div style="padding: 1rem 1.25rem; min-width: 200px;">
      <div style="
        font-family: 'Cinzel', serif;
        font-size: 0.95rem;
        color: #feeaa5;
        margin-bottom: 0.4rem;
        padding-right: 1.5rem;
      ">${poi.icon} ${poi.name}</div>

      ${poi.description ? `
        <div style="
          font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: ${poi.content_html ? '0.75rem' : '0'};
          font-style: italic;
        ">${poi.description}</div>
      ` : ''}

      ${poi.content_html ? `
        <div style="
          font-size: 0.88rem;
          color: #e8e4dc;
          line-height: 1.5;
          margin-bottom: ${hasInteraction ? '0.75rem' : '0'};
        ">${poi.content_html}</div>
      ` : ''}

      ${hasInteraction ? `
        <div style="
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          font-size: 0.8rem;
          color: rgba(254,234,165,0.7);
          letter-spacing: 0.03em;
        ">${interLabel}</div>
      ` : ''}
    </div>
  `
}

function playerMarkerHtml(label: string, isSelf: boolean): string {
  const color = isSelf ? '#feeaa5' : '#e8e4dc'
  const bg = isSelf ? 'rgba(254,234,165,0.15)' : 'rgba(255,255,255,0.08)'
  const border = isSelf ? '#feeaa5' : 'rgba(255,255,255,0.3)'

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;">
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${bg};border:2px solid ${border};
        display:flex;align-items:center;justify-content:center;
        font-size:14px;color:${color};
        box-shadow:0 0 8px ${isSelf ? 'rgba(254,234,165,0.4)' : 'rgba(0,0,0,0.4)'};
      ">◈</div>
      <div style="
        background:rgba(9,8,7,0.85);border:1px solid ${border};
        padding:1px 6px;border-radius:999px;
        font-size:10px;color:${color};white-space:nowrap;letter-spacing:0.04em;
      ">${label}</div>
    </div>
  `
}