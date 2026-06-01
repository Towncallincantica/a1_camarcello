'use client'
import { create } from 'zustand'

// Episodio attualmente giocato. Settato da [episodeId]/layout, letto da GPSUploader.
// null = il giocatore non è dentro nessun episodio (es. lista /play, profilo).
interface EpisodeState {
  currentEpisodeId: string | null
  setCurrentEpisodeId: (id: string | null) => void
}

export const useEpisodeStore = create<EpisodeState>((set) => ({
  currentEpisodeId: null,
  setCurrentEpisodeId: (id) => set({ currentEpisodeId: id }),
}))