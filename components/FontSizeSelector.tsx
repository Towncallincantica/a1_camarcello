'use client'

import { useState, useEffect } from 'react'
import { FONT_SIZE_KEY, FONT_SIZE_MAP, FontSizeOption, applyFontSize } from './FontSizeApplier'

const OPTIONS: FontSizeOption[] = ['S', 'M', 'L', 'XL']

export default function FontSizeSelector() {
  const [current, setCurrent] = useState<FontSizeOption>('M')

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY) as FontSizeOption | null
    if (saved && FONT_SIZE_MAP[saved]) setCurrent(saved)
  }, [])

  function handleSelect(size: FontSizeOption) {
    setCurrent(size)
    applyFontSize(size)
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <p style={{
        fontSize: '0.72rem',
        letterSpacing: '0.1em',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '0.75rem',
        textTransform: 'uppercase',
      }}>
        Dimensione testo
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {OPTIONS.map((size) => {
          const isActive = current === size
          return (
            <button
              key={size}
              onClick={() => handleSelect(size)}
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '8px',
                border: isActive
                  ? '1px solid #feeaa5'
                  : '1px solid rgba(255,255,255,0.1)',
                background: isActive
                  ? 'rgba(254,234,165,0.08)'
                  : 'rgba(255,255,255,0.03)',
                color: isActive ? '#feeaa5' : 'rgba(255,255,255,0.4)',
                fontSize: size === 'S' ? '0.8rem' : size === 'M' ? '1rem' : size === 'L' ? '1.2rem' : '1.4rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'Cinzel, serif',
              }}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}