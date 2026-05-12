'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function GPSUploader() {
  useEffect(() => {
    const supabase = createClient()
    let watchId: number

    const startWatching = () => {
      if (!navigator.geolocation) return

      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { error } = await supabase.from('player_current_location').upsert({
            user_id: user.id,
            position: `POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          // Notifica la SubBar ad ogni fix riuscito
          if (!error) {
            window.dispatchEvent(new CustomEvent('gps:ok'))
          } else {
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

    startWatching()
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  return null
}