'use client'

import { useEffect } from 'react'

export const FONT_SIZE_KEY = 'player_font_size'

export type FontSizeOption = 'S' | 'M' | 'L' | 'XL'

export const FONT_SIZE_MAP: Record<FontSizeOption, string> = {
  S: '14px',
  M: '16px',
  L: '18px',
  XL: '20px',
}

export function applyFontSize(size: FontSizeOption) {
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size]
  localStorage.setItem(FONT_SIZE_KEY, size)
}

export default function FontSizeApplier() {
  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY) as FontSizeOption | null
    if (saved && FONT_SIZE_MAP[saved]) {
      document.documentElement.style.fontSize = FONT_SIZE_MAP[saved]
    }
  }, [])

  return null
}