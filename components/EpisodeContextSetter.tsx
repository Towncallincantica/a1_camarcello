'use client'
import { useEffect } from 'react'
import { useEpisodeStore } from '@/lib/stores/episodeStore'

// Montato in [episodeId]/layout.tsx. Comunica all'uploader (montato più in alto,
// in play/layout.tsx) quale episodio scrivere su player_current_location.episode_id.
// All'uscita dall'episodio azzera → l'uploader torna a scrivere null.
export default function EpisodeContextSetter({ episodeId }: { episodeId: string }) {
  const setCurrentEpisodeId = useEpisodeStore((s) => s.setCurrentEpisodeId)

  useEffect(() => {
    setCurrentEpisodeId(episodeId)
    return () => setCurrentEpisodeId(null)
  }, [episodeId, setCurrentEpisodeId])

  return null
}