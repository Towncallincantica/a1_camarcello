// lib/proximity/useProximityTrigger.ts
'use client'

import { useEffect, useRef } from 'react'
import { dispatchOnEnter, type OnEnterAction, type OnEnterHandlers } from './onEnterDispatcher'

export interface ProximityMarker {
  marker_id: string
  lat: number
  lng: number
  proximity_radius_m: number | null
  on_enter_actions: OnEnterAction[] | null
}

interface UseProximityTriggerArgs {
  // Current player position (null while GPS not yet available)
  position: { lat: number; lng: number } | null
  // Only markers with proximity_radius_m != null should be passed (use the partial index query)
  markers: ProximityMarker[]
  handlers: OnEnterHandlers
  // Optional: pause triggering (e.g. while a modal is open)
  enabled?: boolean
}

// Haversine distance in meters
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function useProximityTrigger({
  position,
  markers,
  handlers,
  enabled = true,
}: UseProximityTriggerArgs) {
  // Markers currently INSIDE radius — debounce so on_enter fires once per entry.
  const insideRef = useRef<Set<string>>(new Set())
  // Keep latest handlers without re-running the proximity effect on every render.
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!enabled || !position) return

    const inside = insideRef.current

    for (const m of markers) {
      if (m.proximity_radius_m == null) continue

      const d = distanceMeters(position.lat, position.lng, m.lat, m.lng)
      const isInside = d <= m.proximity_radius_m
      const wasInside = inside.has(m.marker_id)

      if (isInside && !wasInside) {
        // Edge: outside -> inside. Fire once.
        inside.add(m.marker_id)
        void dispatchOnEnter(m.marker_id, m.on_enter_actions, handlersRef.current)
      } else if (!isInside && wasInside) {
        // Left the radius: allow re-trigger on a future re-entry.
        inside.delete(m.marker_id)
      }
    }
  }, [position, markers, enabled])
}