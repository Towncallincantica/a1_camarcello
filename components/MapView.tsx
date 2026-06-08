'use client'

import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlayerLocation {
  user_id: string
  display_name: string
  lat: number
  lng: number
  team_id?: string | null
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
  item_id?: string
  progress_item_id?: string
  feedback?: string
}

interface Props {
  initialLocations: PlayerLocation[]
  currentUserId: string
  episodeId: string
  mapMarkers?: MapMarker[]
  onClaimItem?: (itemId: string) => void
  onTalk?: (progressItemId: string, feedback?: string) => void
}

// Etichette + colore per tipo di marker (coerenti con poiMarkerHtml)
const MARKER_TYPE_META: Record<string, { label: string; color: string }> = {
  location:      { label: 'Luoghi',           color: 'rgba(254,234,165,0.8)' },
  clue:          { label: 'Indizi',           color: 'rgba(91,155,213,0.8)' },
  npc:           { label: 'Personaggi',       color: 'rgba(181,123,238,0.8)' },
  entrance:      { label: 'Ingressi',         color: 'rgba(100,210,120,0.8)' },
  secret:        { label: 'Segreti',          color: 'rgba(254,234,165,0.5)' },
  danger:        { label: 'Pericoli',         color: 'rgba(255,100,80,0.8)' },
  meeting_point: { label: "Punti d'incontro", color: 'rgba(232,175,72,0.8)' },
}

function typeLabel(t: string): string {
  return MARKER_TYPE_META[t]?.label ?? t
}
function typeColor(t: string): string {
  return MARKER_TYPE_META[t]?.color ?? 'rgba(255,255,255,0.6)'
}

// ── Costanti ────────────────────────────────────────────────────
const MIN_ZOOM = 16
const MAX_ZOOM = 19
const DEFAULT_ZOOM = 17

export function MapView({ initialLocations, currentUserId, episodeId, mapMarkers = [], onClaimItem, onTalk }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const playerMarkersRef = useRef<Map<string, unknown>>(new Map())
  const poiMarkersRef = useRef<Map<string, unknown>>(new Map())
  const hasInitialCentered = useRef(false)
  // Ref al marker del giocatore corrente per aggiornamenti diretti (heading)
  const selfMarkerRef = useRef<unknown>(null)
  // Heading corrente in gradi (0 = nord). Aggiornato da deviceorientation.
  const headingRef = useRef<number>(0)
  // Posizione GPS corrente (aggiornata da gps:ok)
  const selfPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  // ── Stato filtri ──────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false)
  const [showTeam, setShowTeam] = useState(true)
  const [showOthers, setShowOthers] = useState(true)
  const [showPoi, setShowPoi] = useState(true)
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set())
  const knownTypesRef = useRef<Set<string>>(new Set())

  // Team del giocatore corrente (per separare "squadra" da "altri")
  const myTeamId = useMemo(
    () => initialLocations.find((l) => l.user_id === currentUserId)?.team_id ?? null,
    [initialLocations, currentUserId]
  )

  // Tipi di marker presenti, ordinati per etichetta
  const availableTypes = useMemo(() => {
    const set = new Set(mapMarkers.map((m) => m.marker_type))
    return Array.from(set).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)))
  }, [mapMarkers])

  // Nuovi tipi → abilitati di default; toggle utente preservati
  useEffect(() => {
    let changed = false
    setEnabledTypes((prev) => {
      const next = new Set(prev)
      for (const t of availableTypes) {
        if (!knownTypesRef.current.has(t)) {
          next.add(t)
          knownTypesRef.current.add(t)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [availableTypes])

  // ── Applica visibilità a tutti i marker secondo i filtri ──────
  const applyVisibility = useCallback(() => {
    const map = mapInstanceRef.current as {
      addLayer: (l: unknown) => void
      removeLayer: (l: unknown) => void
      hasLayer: (l: unknown) => boolean
    } | null
    if (!map) return

    const setVisible = (marker: unknown, visible: boolean) => {
      if (visible) {
        if (!map.hasLayer(marker)) map.addLayer(marker)
      } else {
        if (map.hasLayer(marker)) map.removeLayer(marker)
      }
    }

    // Giocatori: io sempre visibile; squadra vs altri secondo i toggle
    const teamByUser = new Map(initialLocations.map((l) => [l.user_id, l.team_id ?? null]))
    for (const [userId, marker] of playerMarkersRef.current.entries()) {
      let visible: boolean
      if (userId === currentUserId) {
        visible = true
      } else {
        const teamId = teamByUser.get(userId) ?? null
        const sameTeam = !!myTeamId && teamId === myTeamId
        visible = sameTeam ? showTeam : showOthers
      }
      setVisible(marker, visible)
    }

    // POI: master toggle + sotto-filtro per tipo
    const typeById = new Map(mapMarkers.map((m) => [m.marker_id, m.marker_type]))
    for (const [id, marker] of poiMarkersRef.current.entries()) {
      const t = typeById.get(id)
      const visible = showPoi && (t ? enabledTypes.has(t) : true)
      setVisible(marker, visible)
    }
  }, [initialLocations, currentUserId, myTeamId, showTeam, showOthers, showPoi, enabledTypes, mapMarkers])

  // Ref sempre aggiornata, così callback async (realtime) usa i filtri correnti
  const applyVisibilityRef = useRef(applyVisibility)
  useEffect(() => {
    applyVisibilityRef.current = applyVisibility
  }, [applyVisibility])

  // Riapplica quando cambiano i filtri (o gli input)
  useEffect(() => {
    applyVisibility()
  }, [applyVisibility])

  // ── Init mappa ────────────────────────────────────────────────
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

      map = L.map(mapRef.current, {
        center,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomControl: false,
        attributionControl: false,
        // Mappa non spostabile a mano — il centro è sempre il giocatore
        dragging: false,
        doubleClickZoom: false,
        scrollWheelZoom: true,   // zoom rotella/pinch rimane attivo
        touchZoom: true,
        boxZoom: false,
        keyboard: false,
      })
      mapInstanceRef.current = map

      // Forza il centro zoom sempre sulla posizione del giocatore.
      // zoomstart scatta prima che Leaflet calcoli il nuovo viewport —
      // setView qui sovrascrive il centro prima del render.
      map.on('zoomstart', () => {
        const pos = selfPositionRef.current
        if (!pos) return
        const currentZoom = (map as ReturnType<typeof L.map>).getZoom()
        ;(map as ReturnType<typeof L.map>).setView(
          [pos.lat, pos.lng],
          currentZoom,
          { animate: false }
        )
      })

      L.tileLayer('https://tile.openstreetmap.bzh/ca/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: MAX_ZOOM,
      }).addTo(map)

      // Player markers
      for (const loc of initialLocations) {
        const isSelf = loc.user_id === currentUserId
        const marker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({
            className: '',
            html: isSelf
              ? selfMarkerHtml(loc.display_name, headingRef.current)
              : playerMarkerHtml(loc.display_name, false),
            iconAnchor: [20, 20],
          }),
          zIndexOffset: 1000,
        }).addTo(map)
        playerMarkersRef.current.set(loc.user_id, marker)
        if (isSelf) selfMarkerRef.current = marker
      }

      // POI markers
      for (const poi of mapMarkers) {
        const m = addPoiMarker(L, map, poi, onClaimItem, onTalk)
        poiMarkersRef.current.set(poi.marker_id, m)
      }

      // Applica i filtri iniziali
      applyVisibilityRef.current()

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
              // Se sono io, aggiorno anche la posizione ref (per auto-center)
              if (isSelf) {
                selfPositionRef.current = { lat: raw.lat, lng: raw.lng }
              }
            } else {
              const displayName = initialLocations.find(
                (l) => l.user_id === raw.user_id
              )?.display_name ?? '?'
              const marker = L.marker([raw.lat, raw.lng], {
                icon: L.divIcon({
                  className: '',
                  html: isSelf
                    ? selfMarkerHtml(displayName, headingRef.current)
                    : playerMarkerHtml(displayName, false),
                  iconAnchor: [20, 20],
                }),
                zIndexOffset: 1000,
              }).addTo(map!)
              playerMarkersRef.current.set(raw.user_id, marker)
              if (isSelf) selfMarkerRef.current = marker
              applyVisibilityRef.current()
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
        selfMarkerRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Blocca pull-to-refresh sul contenitore mappa ─────────────
  // Con dragging:false i touch events non vengono consumati da Leaflet
  // e risalgono al browser che li interpreta come pull-to-refresh.
  // { passive: false } è necessario per poter chiamare preventDefault().
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => { e.preventDefault() }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  // ── GPS: auto-center sulla posizione del giocatore ────────────
  useEffect(() => {
    const onGpsOk = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail
      if (!detail || typeof detail.lat !== 'number' || typeof detail.lng !== 'number') return

      selfPositionRef.current = { lat: detail.lat, lng: detail.lng }

      const map = mapInstanceRef.current as {
        panTo: (c: [number, number], opts?: unknown) => void
        setView: (c: [number, number], z: number, opts?: unknown) => void
      } | null
      if (!map) return

      // Centra silenziosamente sul giocatore a ogni fix GPS
      map.panTo([detail.lat, detail.lng], { animate: false, noMoveStart: true })
    }

    window.addEventListener('gps:ok', onGpsOk)
    return () => window.removeEventListener('gps:ok', onGpsOk)
  }, [])

  // ── Orientamento: freccia bussola sul marker self ─────────────
  useEffect(() => {
    // Funzione per aggiornare il DOM del marker self in modo diretto,
    // senza re-render React. Massima fluidità, zero overhead.
    const updateArrow = (heading: number) => {
      const marker = selfMarkerRef.current as { getElement?: () => HTMLElement | null } | null
      if (!marker?.getElement) return
      const el = marker.getElement()
      if (!el) return
      const arrow = el.querySelector<HTMLElement>('[data-compass-arrow]')
      if (arrow) {
        arrow.style.transform = `rotate(${heading}deg)`
      }
    }

    // Handler per iOS (richiede permesso) e Android
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading = 0

      // webkitCompassHeading: disponibile su iOS Safari e alcuni Android
      // È relativo al nord magnetico — quello che vogliamo.
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      if (webkit != null && !isNaN(webkit)) {
        heading = webkit
      } else if (e.alpha != null) {
        // Android standard: alpha va da 0 a 360 ma in senso anti-orario
        heading = (360 - e.alpha) % 360
      }

      headingRef.current = heading
      updateArrow(heading)
    }

    // iOS 13+ richiede permesso esplicito
    const DoE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }

    if (typeof DoE.requestPermission === 'function') {
      // iOS: aspetta il click utente (gestito dal pulsante bussola nella UI)
      // Qui registriamo solo l'handler — il permesso viene richiesto dal bottone
      window.addEventListener('deviceorientation', handleOrientation, true)
    } else {
      // Android e desktop: nessun permesso necessario
      window.addEventListener('deviceorientation', handleOrientation, true)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [])

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
            .setView([self.lat, self.lng], DEFAULT_ZOOM)
          hasInitialCentered.current = true
          selfPositionRef.current = { lat: self.lat, lng: self.lng }
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
              html: isSelf
                ? selfMarkerHtml(loc.display_name, headingRef.current)
                : playerMarkerHtml(loc.display_name, false),
              iconAnchor: [20, 20],
            }),
            zIndexOffset: 1000,
          }).addTo(map as unknown as ReturnType<typeof L.map>)
          playerMarkersRef.current.set(loc.user_id, marker)
          if (isSelf) selfMarkerRef.current = marker
        }
      }
      applyVisibilityRef.current()
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
          const m = addPoiMarker(L, map as ReturnType<typeof L.map>, poi, onClaimItem, onTalk)
          poiMarkersRef.current.set(poi.marker_id, m)
        }
      }
      applyVisibilityRef.current()
    })
  }, [mapMarkers]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handler permesso bussola iOS ─────────────────────────────
  const [compassPermission, setCompassPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')

  const requestCompassPermission = useCallback(async () => {
    const DoE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DoE.requestPermission !== 'function') {
      // Non iOS — non serve permesso
      setCompassPermission('granted')
      return
    }
    try {
      const result = await DoE.requestPermission()
      setCompassPermission(result === 'granted' ? 'granted' : 'denied')
    } catch {
      setCompassPermission('denied')
    }
  }, [])

  // Controlla al mount se siamo su iOS (per mostrare il bottone)
  const [isIos, setIsIos] = useState(false)
  useEffect(() => {
    const DoE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    setIsIos(typeof DoE.requestPermission === 'function')
  }, [])

  // ── Stili UI filtri ───────────────────────────────────────────
  const fabStyle: React.CSSProperties = {
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
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 0',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#e8e4dc',
  }

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
        .map-filter-check {
          accent-color: #e8af48;
          width: 15px;
          height: 15px;
          cursor: pointer;
          flex-shrink: 0;
        }
        /* Freccia bussola: transizione fluidissima */
        [data-compass-arrow] {
          transition: transform 0.15s ease-out;
          will-change: transform;
        }
      `}</style>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div
          ref={mapRef}
          style={{ width: '100%', height: '100%', minHeight: '400px', background: '#1a1a18' }}
        />

        {/* Pannello filtri */}
        {panelOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '7rem',
              right: '1rem',
              zIndex: 1001,
              width: '210px',
              maxHeight: '60%',
              overflowY: 'auto',
              background: 'rgba(9,8,7,0.95)',
              border: '1px solid rgba(254,234,165,0.2)',
              borderRadius: '10px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              padding: '0.85rem 1rem',
              fontFamily: "'EB Garamond', Georgia, serif",
            }}
          >
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              color: 'rgba(254,234,165,0.7)',
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}>
              Giocatori
            </div>
            <label style={rowStyle}>
              <input type="checkbox" className="map-filter-check"
                checked={showTeam} onChange={(e) => setShowTeam(e.target.checked)} />
              La mia squadra
            </label>
            <label style={rowStyle}>
              <input type="checkbox" className="map-filter-check"
                checked={showOthers} onChange={(e) => setShowOthers(e.target.checked)} />
              Altri giocatori
            </label>
            <div style={{
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.3)',
              fontStyle: 'italic',
              margin: '0.2rem 0 0.6rem',
            }}>
              Tu sei sempre visibile.
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.3rem 0 0.6rem' }} />

            <label style={{ ...rowStyle, fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.1em', color: 'rgba(254,234,165,0.7)', textTransform: 'uppercase' }}>
              <input type="checkbox" className="map-filter-check"
                checked={showPoi} onChange={(e) => setShowPoi(e.target.checked)} />
              Punti sulla mappa
            </label>

            {showPoi && availableTypes.length > 0 && (
              <div style={{ paddingLeft: '0.4rem', marginTop: '0.2rem' }}>
                {availableTypes.map((t) => (
                  <label key={t} style={rowStyle}>
                    <input type="checkbox" className="map-filter-check"
                      checked={enabledTypes.has(t)}
                      onChange={(e) => {
                        setEnabledTypes((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(t)
                          else next.delete(t)
                          return next
                        })
                      }} />
                    <span style={{
                      width: '9px', height: '9px', borderRadius: '50%',
                      background: typeColor(t), flexShrink: 0,
                      boxShadow: `0 0 5px ${typeColor(t)}`,
                    }} />
                    {typeLabel(t)}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pulsante filtri */}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          style={{ ...fabStyle, position: 'absolute', bottom: '4rem', right: '1rem', zIndex: 1000,
            background: panelOpen ? 'rgba(254,234,165,0.18)' : 'rgba(9,8,7,0.88)' }}
          title="Filtri"
          aria-label="Filtri mappa"
        >
          ⚑
        </button>

        {/* Pulsante bussola iOS — visibile solo se richiesto */}
        {isIos && compassPermission === 'unknown' && (
          <button
            onClick={requestCompassPermission}
            style={{
              ...fabStyle,
              position: 'absolute',
              bottom: '7.5rem',
              right: '1rem',
              zIndex: 1000,
              fontSize: '1.2rem',
            }}
            title="Attiva bussola"
            aria-label="Attiva orientamento bussola"
          >
            🧭
          </button>
        )}
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Marker del giocatore corrente con freccia bussola.
//
// Strategia: il wrapper [data-compass-arrow] è un quadrato 40×40 centrato
// esattamente sul cerchio. transform-origin è "center center" (default),
// quindi rotate() gira attorno al centro del cerchio. La freccia è un
// triangolo CSS posizionato nella metà superiore del wrapper, così quando
// il wrapper ruota la freccia orbita intorno al cerchio.
function selfMarkerHtml(label: string, heading: number): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;">
      <div style="position:relative;width:40px;height:40px;">

        <!-- Wrapper rotante — data-compass-arrow — ruota attorno al proprio
             centro che coincide con il centro del cerchio sotto.
             transform-origin default = "20px 20px" = center del quadrato 40×40. -->
        <div
          data-compass-arrow
          style="
            position:absolute;
            inset:0;
            transform:rotate(${heading}deg);
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:flex-start;
          "
        >
          <!-- Freccia: triangolo CSS a punta in alto, base a metà wrapper -->
          <div style="
            width:0;height:0;
            border-left:5px solid transparent;
            border-right:5px solid transparent;
            border-bottom:12px solid #feeaa5;
            opacity:0.95;
            margin-top:2px;
            filter:drop-shadow(0 0 4px rgba(254,234,165,0.7));
          "></div>
        </div>

        <!-- Cerchio centrale — sopra il wrapper rotante -->
        <div style="
          position:absolute;
          inset:0;
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="
            width:26px;height:26px;border-radius:50%;
            background:rgba(254,234,165,0.15);border:2px solid #feeaa5;
            display:flex;align-items:center;justify-content:center;
            font-size:12px;color:#feeaa5;
            box-shadow:0 0 10px rgba(254,234,165,0.5);
          ">◈</div>
        </div>

      </div>
      <div style="
        background:rgba(9,8,7,0.85);border:1px solid #feeaa5;
        padding:1px 6px;border-radius:999px;
        font-size:10px;color:#feeaa5;white-space:nowrap;letter-spacing:0.04em;
      ">${escapeHtml(label)}</div>
    </div>
  `
}

function addPoiMarker(
  L: typeof import('leaflet'),
  map: ReturnType<typeof L.map>,
  poi: MapMarker,
  onClaimItem?: (itemId: string) => void,
  onTalk?: (progressItemId: string, feedback?: string) => void
) {
  const marker = L.marker([poi.lat, poi.lng], {
    icon: L.divIcon({
      className: '',
      html: poiMarkerHtml(poi.icon, poi.marker_type),
      iconAnchor: [20, 20],
    }),
    zIndexOffset: 500,
  })

  const popupContent = buildPopupHtml(poi)
  marker.bindPopup(popupContent, {
    className: 'poi-popup',
    maxWidth: 280,
    minWidth: 220,
  })

  marker.on('popupopen', () => {
    const root = marker.getPopup()?.getElement()
    if (!root) return

    const claimBtn = root.querySelector<HTMLButtonElement>('[data-claim-item-id]')
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        const itemId = claimBtn.getAttribute('data-claim-item-id')
        if (itemId && onClaimItem) {
          marker.closePopup()
          onClaimItem(itemId)
        }
      })
    }

    const talkBtn = root.querySelector<HTMLButtonElement>('[data-talk-progress-id]')
    if (talkBtn) {
      talkBtn.addEventListener('click', () => {
        const progressItemId = talkBtn.getAttribute('data-talk-progress-id')
        if (progressItemId && onTalk) {
          marker.closePopup()
          onTalk(progressItemId, poi.feedback)
        }
      })
    }
  })

  marker.addTo(map)
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
      ">${escapeHtml(icon)}</span>
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

  const isTalk =
    (poi.interaction_type === 'narrative' || poi.interaction_type === 'npc_dialog') &&
    !!poi.progress_item_id

  const talkLabel = poi.interaction_type === 'narrative' ? '📖 Leggi' : '💬 Parla'

  const actionButtonStyle = `
    width: 100%;
    background: rgba(254,234,165,0.08);
    border: 1px solid rgba(254,234,165,0.3);
    border-radius: 6px;
    color: #feeaa5;
    font-family: 'Cinzel', serif;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    text-align: center;
  `

  let interactionBlock = ''
  if (poi.interaction_type === 'claim_item' && poi.item_id) {
    interactionBlock = `<button data-claim-item-id="${escapeHtml(poi.item_id)}" style="${actionButtonStyle}">🎒 Raccogli oggetto</button>`
  } else if (isTalk) {
    interactionBlock = `<button data-talk-progress-id="${escapeHtml(poi.progress_item_id!)}" style="${actionButtonStyle}">${talkLabel}</button>`
  } else {
    interactionBlock = `<div style="font-size:0.8rem;color:rgba(254,234,165,0.7);letter-spacing:0.03em;">${interLabel}</div>`
  }

  return `
    <div style="padding: 1rem 1.25rem; min-width: 200px;">
      <div style="
        font-family: 'Cinzel', serif;
        font-size: 0.95rem;
        color: #feeaa5;
        margin-bottom: 0.4rem;
        padding-right: 1.5rem;
      ">${escapeHtml(poi.icon)} ${escapeHtml(poi.name)}</div>

      ${poi.description ? `
        <div style="
          font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: ${poi.content_html ? '0.75rem' : '0'};
          font-style: italic;
        ">${escapeHtml(poi.description)}</div>
      ` : ''}

      ${poi.content_html ? `
        <!-- content_html: HTML voluto, autored da admin. Sanitizzare lato admin (vedi T12). -->
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
        ">
          ${interactionBlock}
        </div>
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
      ">${escapeHtml(label)}</div>
    </div>
  `
}