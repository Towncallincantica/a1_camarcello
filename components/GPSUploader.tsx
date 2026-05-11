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

          await supabase.from('player_current_location').upsert({
            user_id: user.id,
            position: `POINT(${pos.coords.longitude} ${pos.coords.latitude})`,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        },
        (err) => console.warn('GPS error:', err),
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