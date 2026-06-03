'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEpisodeStore } from '@/lib/stores/episodeStore'

// Intervallo minimo tra due upsert sul DB (ms). Il watchPosition fa fire molto
// più spesso: throttliamo le scritture per non saturare DB e Realtime fan-out.
const UPLOAD_INTERVAL_MS = 6000

export default function GPSUploader() {
  // Letto in modo reattivo: se cambia episodio, l'uploader inizia a scrivere il nuovo id.
  const currentEpisodeId = useEpisodeStore((s) => s.currentEpisodeId)

  // Ref per leggere l'episodio corrente DENTRO il callback di watchPosition
  // senza dover ri-registrare il watch a ogni cambio.
  const episodeIdRef = useRef<string | null>(currentEpisodeId)
  useEffect(() => {
    episodeIdRef.current = currentEpisodeId
  }, [currentEpisodeId])

  useEffect(() => {
    if (!navigator.geolocation) return

    const supabase = createClient()
    let watchId: number
    let userId: string | null = null
    let lastUpload = 0
    let cancelled = false

    const start = async () => {
      // getUser() UNA volta sola, non a ogni fix.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      userId = user.id

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          if (!userId) return

          // SubBar reattiva a ogni fix valido, indipendentemente dal throttle DB.
          window.dispatchEvent(new CustomEvent('gps:ok', {
            detail: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          }))

          // Throttle delle scritture.
          const now = Date.now()
          if (now - lastUpload < UPLOAD_INTERVAL_MS) return
          lastUpload = now

          const { error } = await supabase.from('player_current_location').upsert(
            {
              user_id: userId,
              episode_id: episodeIdRef.current, // null fuori da un episodio
              position: `POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )

          if (error) {
            // Permette un nuovo tentativo al prossimo fix (non blocca per 6s)
            lastUpload = 0
            window.dispatchEvent(new CustomEvent('gps:error'))
          }
        },
        (err) => {
          console.warn('GPS error:', err)
          window.dispatchEvent(new CustomEvent('gps:error'))
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      )
    }

    start()
    return () => {
      cancelled = true
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
    }
  }, []) // un solo watch per tutta la vita del layout play

  return null
}