'use client'

import { useEffect, useRef } from 'react'

interface PlayerLocation {
  user_id: string
  display_name: string
  lat: number
  lng: number
}

interface Props {
  initialLocations: PlayerLocation[]
  currentUserId: string
  episodeId: string
}

export function MapView({ initialLocations, currentUserId, episodeId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const markersRef = useRef<Map<string, unknown>>(new Map())

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

      // Al mount le locations sono quasi sempre vuote — centro di default
      const self = initialLocations.find((l) => l.user_id === currentUserId)
      const center: [number, number] = self ? [self.lat, self.lng] : [45.5, 12.0]

      map = L.map(mapRef.current, { center, zoom: 17, zoomControl: false })
      mapInstanceRef.current = map

      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      for (const loc of initialLocations) {
        const isSelf = loc.user_id === currentUserId
        const marker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({
            className: '',
            html: markerHtml(loc.display_name, isSelf),
            iconAnchor: [16, 16],
          }),
        }).addTo(map)
        markersRef.current.set(loc.user_id, marker)
      }

      // Realtime rimosso: player_current_location usa PostGIS Geography,
      // payload Realtime non contiene lat/lng leggibili.
      // Aggiornamento posizioni → MapWrapper (RPC) → initialLocations prop.
    })

    return () => {
      if (mapInstanceRef.current) {
        const m = mapInstanceRef.current as { remove: () => void }
        try { m.remove() } catch {}
        mapInstanceRef.current = null
        markersRef.current.clear()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ricentra e aggiorna markers quando arrivano nuove posizioni
  useEffect(() => {
    console.log('[MapView] initialLocations changed:', initialLocations)
    console.log('[MapView] currentUserId:', currentUserId)

    const map = mapInstanceRef.current as {
      setView: (c: [number, number], z: number) => void
    } | null

    if (!map) {
      console.log('[MapView] map non ancora montata')
      return
    }
    if (initialLocations.length === 0) {
      console.log('[MapView] locations vuote, skip')
      return
    }

    import('leaflet').then((L) => {
      const self = initialLocations.find(l => l.user_id === currentUserId)
      console.log('[MapView] self:', self)

      if (self) {
        map.setView([self.lat, self.lng], 17)
      }

      for (const loc of initialLocations) {
        const isSelf = loc.user_id === currentUserId
        const existing = markersRef.current.get(loc.user_id) as
          | ReturnType<typeof L.marker> | undefined

        if (existing) {
          existing.setLatLng([loc.lat, loc.lng])
        } else {
          const marker = L.marker([loc.lat, loc.lng], {
            icon: L.divIcon({
              className: '',
              html: markerHtml(loc.display_name, isSelf),
              iconAnchor: [16, 16],
            }),
          }).addTo(map as unknown as ReturnType<typeof L.map>)
          markersRef.current.set(loc.user_id, marker)
        }
      }
    })
  }, [initialLocations, currentUserId])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          background: '#1a1a18',
        }}
      />
    </>
  )
}

function markerHtml(label: string, isSelf: boolean): string {
  const color = isSelf ? '#feeaa5' : '#e8e4dc'
  const bg = isSelf ? 'rgba(254,234,165,0.15)' : 'rgba(255,255,255,0.08)'
  const border = isSelf ? '#feeaa5' : 'rgba(255,255,255,0.3)'

  return `
    <div style="
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:3px;
      pointer-events:none;
    ">
      <div style="
        width:32px;
        height:32px;
        border-radius:50%;
        background:${bg};
        border:2px solid ${border};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:14px;
        color:${color};
        box-shadow:0 0 8px ${isSelf ? 'rgba(254,234,165,0.4)' : 'rgba(0,0,0,0.4)'};
      ">◈</div>
      <div style="
        background:rgba(9,8,7,0.85);
        border:1px solid ${border};
        padding:1px 6px;
        border-radius:999px;
        font-size:10px;
        color:${color};
        white-space:nowrap;
        letter-spacing:0.04em;
      ">${label}</div>
    </div>
  `
}