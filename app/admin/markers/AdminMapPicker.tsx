'use client'

import { useEffect, useRef, useState } from 'react'

export type PickerShape = 'point' | 'circle' | 'polygon'

export interface PickerValue {
  shape: PickerShape
  lat: number
  lng: number
  radius_meters: number
  geometry: { lat: number; lng: number }[] | null
}

interface Props {
  value: PickerValue
  onChange: (v: PickerValue) => void
  /** Centro iniziale se non c'è ancora una posizione */
  defaultCenter?: [number, number]
}

const COLORS: Record<PickerShape, string> = {
  point:   '#feeaa5',
  circle:  '#e8af48',
  polygon: '#91d5c8',
}

export default function AdminMapPicker({ value, onChange, defaultCenter = [45.5, 12.0] }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInst     = useRef<unknown>(null)
  const markerInst  = useRef<unknown>(null)
  const circleInst  = useRef<unknown>(null)
  const polyInst    = useRef<unknown>(null)
  const tempMarkers = useRef<unknown[]>([])
  const polyPoints  = useRef<{ lat: number; lng: number }[]>([])
  const [shape, setShape] = useState<PickerShape>(value.shape ?? 'point')
  const [drawing, setDrawing] = useState(false)
  const shapeRef  = useRef(shape)
  const drawRef   = useRef(drawing)
  const valueRef  = useRef(value)

  // keep refs in sync
  useEffect(() => { shapeRef.current = shape }, [shape])
  useEffect(() => { drawRef.current = drawing }, [drawing])
  useEffect(() => { valueRef.current = value }, [value])

  // ── Init map ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    let map: ReturnType<typeof import('leaflet')['map']> | null = null

    import('leaflet').then((L) => {
      if (mapInst.current || !mapRef.current) return

      const hasPos = valueRef.current.lat !== 0 || valueRef.current.lng !== 0
      const center: [number, number] = hasPos
        ? [valueRef.current.lat, valueRef.current.lng]
        : defaultCenter

      map = L.map(mapRef.current, {
        center, zoom: 17,
        zoomControl: true,
        attributionControl: false,
      })
      mapInst.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Render existing value
      renderValue(L, map, valueRef.current)

      // Click handler
      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng
        const currentShape = shapeRef.current
        const isDrawing    = drawRef.current

        if (currentShape === 'polygon' && isDrawing) {
          // accumulate polygon points
          polyPoints.current.push({ lat, lng })
          renderPolyProgress(L, map!, polyPoints.current)
        } else if (currentShape !== 'polygon') {
          // place point/circle
          const next: PickerValue = {
            ...valueRef.current,
            shape: currentShape,
            lat, lng,
            geometry: null,
          }
          renderValue(L, map!, next)
          onChange(next)
        }
      })

      // Double-click closes polygon
      map.on('dblclick', (e: { latlng: { lat: number; lng: number }; originalEvent: Event }) => {
        e.originalEvent.preventDefault()
        if (shapeRef.current !== 'polygon' || !drawRef.current) return
        if (polyPoints.current.length < 3) return
        const pts = [...polyPoints.current]
        polyPoints.current = []
        setDrawing(false)
        // centroid
        const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length
        const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length
        const next: PickerValue = {
          ...valueRef.current,
          shape: 'polygon',
          lat, lng,
          geometry: pts,
        }
        clearTempMarkers(L, map!)
        renderValue(L, map!, next)
        onChange(next)
      })
    })

    return () => {
      if (mapInst.current) {
        try { (mapInst.current as { remove: () => void }).remove() } catch {}
        mapInst.current = null
        markerInst.current = null
        circleInst.current = null
        polyInst.current = null
        tempMarkers.current = []
        polyPoints.current = []
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-render when value changes externally ─────────────────
  useEffect(() => {
    const map = mapInst.current
    if (!map) return
    import('leaflet').then((L) => {
      renderValue(L, map as ReturnType<typeof L.map>, value)
    })
  }, [value.lat, value.lng, value.radius_meters, value.shape, value.geometry]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Shape switch ─────────────────────────────────────────────
  function switchShape(s: PickerShape) {
    setShape(s)
    shapeRef.current = s
    setDrawing(false)
    drawRef.current = false
    polyPoints.current = []
    const map = mapInst.current
    if (!map) return
    import('leaflet').then((L) => {
      clearTempMarkers(L, map as ReturnType<typeof L.map>)
      const next: PickerValue = {
        ...valueRef.current,
        shape: s,
        geometry: s !== 'polygon' ? null : valueRef.current.geometry,
      }
      renderValue(L, map as ReturnType<typeof L.map>, next)
      onChange(next)
    })
  }

  function startDraw() {
    polyPoints.current = []
    setDrawing(true)
    drawRef.current = true
    const map = mapInst.current
    if (!map) return
    import('leaflet').then((L) => {
      clearAll(L, map as ReturnType<typeof L.map>)
    })
  }

  function cancelDraw() {
    polyPoints.current = []
    setDrawing(false)
    drawRef.current = false
    const map = mapInst.current
    if (!map) return
    import('leaflet').then((L) => {
      clearTempMarkers(L, map as ReturnType<typeof L.map>)
      renderValue(L, map as ReturnType<typeof L.map>, valueRef.current)
    })
  }

  // ── Render helpers ───────────────────────────────────────────
  function clearAll(L: typeof import('leaflet'), map: ReturnType<typeof L.map>) {
    if (markerInst.current) { try { (markerInst.current as { remove: () => void }).remove() } catch {} markerInst.current = null }
    if (circleInst.current) { try { (circleInst.current as { remove: () => void }).remove() } catch {} circleInst.current = null }
    if (polyInst.current)   { try { (polyInst.current as { remove: () => void }).remove() } catch {} polyInst.current = null }
    clearTempMarkers(L, map)
  }

  function clearTempMarkers(L: typeof import('leaflet'), map: ReturnType<typeof L.map>) {
    for (const m of tempMarkers.current) {
      try { (m as { remove: () => void }).remove() } catch {}
    }
    tempMarkers.current = []
    void L; void map
  }

  function renderValue(L: typeof import('leaflet'), map: ReturnType<typeof L.map>, v: PickerValue) {
    clearAll(L, map)
    if (!v.lat && !v.lng && !v.geometry) return

    const color = COLORS[v.shape]

    if (v.shape === 'polygon' && v.geometry && v.geometry.length >= 3) {
      const latlngs = v.geometry.map(p => [p.lat, p.lng] as [number, number])
      const poly = L.polygon(latlngs, {
        color, fillColor: color, fillOpacity: 0.12,
        weight: 2, dashArray: '4 4',
      }).addTo(map)
      polyInst.current = poly
      // centroid dot
      const dot = L.circleMarker([v.lat, v.lng], {
        radius: 5, color, fillColor: color, fillOpacity: 0.8, weight: 1,
      }).addTo(map)
      markerInst.current = dot
      return
    }

    if (!v.lat && !v.lng) return

    if (v.shape === 'circle') {
      const circle = L.circle([v.lat, v.lng], {
        radius: v.radius_meters,
        color, fillColor: color, fillOpacity: 0.1, weight: 2, dashArray: '4 4',
      }).addTo(map)
      circleInst.current = circle
    }

    const dotColor = v.shape === 'point' ? '#feeaa5' : color
    const marker = L.circleMarker([v.lat, v.lng], {
      radius: 7, color: dotColor, fillColor: dotColor, fillOpacity: 1, weight: 2,
    }).addTo(map)
    markerInst.current = marker
  }

  function renderPolyProgress(L: typeof import('leaflet'), map: ReturnType<typeof L.map>, pts: { lat: number; lng: number }[]) {
    clearTempMarkers(L, map)
    const color = COLORS.polygon
    for (const p of pts) {
      const dot = L.circleMarker([p.lat, p.lng], {
        radius: 5, color, fillColor: color, fillOpacity: 0.9, weight: 1,
      }).addTo(map)
      tempMarkers.current.push(dot)
    }
    if (pts.length >= 2) {
      const line = L.polyline(pts.map(p => [p.lat, p.lng] as [number, number]), {
        color, weight: 2, dashArray: '4 4', opacity: 0.6,
      }).addTo(map)
      tempMarkers.current.push(line)
    }
  }

  // ── UI ───────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.75rem', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)', color: '#e8e4dc',
    letterSpacing: '0.03em',
  }
  const btnActive: React.CSSProperties = {
    ...btnBase, borderColor: 'rgba(254,234,165,0.5)',
    background: 'rgba(254,234,165,0.07)', color: '#feeaa5',
  }

  const hasPos = value.lat !== 0 || value.lng !== 0 || (value.geometry?.length ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={shape === 'point' ? btnActive : btnBase} onClick={() => switchShape('point')}>
          📍 Punto
        </button>
        <button style={shape === 'circle' ? btnActive : btnBase} onClick={() => switchShape('circle')}>
          ⭕ Cerchio
        </button>
        <button style={shape === 'polygon' ? btnActive : btnBase} onClick={() => switchShape('polygon')}>
          🔷 Poligono
        </button>

        {shape === 'polygon' && !drawing && (
          <button
            onClick={startDraw}
            style={{ ...btnBase, borderColor: 'rgba(145,213,200,0.5)', color: '#91d5c8', background: 'rgba(145,213,200,0.07)' }}
          >
            ✏️ Inizia a disegnare
          </button>
        )}
        {shape === 'polygon' && drawing && (
          <>
            <span style={{ fontSize: '0.72rem', color: 'rgba(145,213,200,0.7)', fontStyle: 'italic' }}>
              {polyPoints.current.length === 0
                ? 'Clicca sulla mappa per aggiungere vertici'
                : polyPoints.current.length < 3
                ? `${polyPoints.current.length} punto${polyPoints.current.length > 1 ? 'i' : ''} — aggiungi almeno ${3 - polyPoints.current.length} ancora`
                : 'Doppio clic per chiudere il poligono'}
            </span>
            <button onClick={cancelDraw} style={{ ...btnBase, color: 'rgba(255,100,100,0.7)', borderColor: 'rgba(255,100,100,0.2)' }}>
              Annulla
            </button>
          </>
        )}

        {shape === 'circle' && hasPos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>raggio</span>
            <input
              type="number"
              value={value.radius_meters}
              min={5}
              onChange={e => onChange({ ...value, radius_meters: parseInt(e.target.value) || 30 })}
              style={{
                width: '70px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px',
                padding: '0.25rem 0.4rem', color: '#e8e4dc', fontFamily: 'inherit',
                fontSize: '0.8rem', textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>m</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ position: 'relative' }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div
          ref={mapRef}
          style={{
            width: '100%', height: '300px', borderRadius: '8px',
            border: `1px solid ${drawing ? 'rgba(145,213,200,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: '#1a1a18',
            cursor: shape === 'polygon' && drawing ? 'crosshair' : 'pointer',
            transition: 'border-color 0.2s',
          }}
        />
        {!hasPos && !drawing && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', borderRadius: '8px',
          }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', background: 'rgba(9,8,7,0.7)', padding: '0.4rem 0.9rem', borderRadius: '6px' }}>
              {shape === 'polygon' ? 'Clicca "Inizia a disegnare"' : 'Clicca sulla mappa per posizionare'}
            </span>
          </div>
        )}
      </div>

      {/* Coords readout */}
      {hasPos && (
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono, monospace', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {value.shape !== 'polygon'
            ? <span>{value.lat.toFixed(6)}, {value.lng.toFixed(6)}{value.shape === 'circle' ? ` · r${value.radius_meters}m` : ''}</span>
            : <span>{value.geometry?.length} vertici · centroide {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>
          }
        </div>
      )}
    </div>
  )
}