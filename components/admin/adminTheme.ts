// components/admin/adminTheme.ts
// Token del design system admin (coerenti col frontend player gold/dark).
export const C = {
  bg: '#090807',
  surface: 'rgba(255,255,255,0.03)',
  surface2: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  gold: '#feeaa5',
  goldAction: '#e8af48',
  goldDark: '#c49746',
  text: '#e8e4dc',
  muted: 'rgba(255,255,255,0.45)',
  muted2: 'rgba(255,255,255,0.28)',
  danger: '#ff6060',
  success: '#64d278',
  cinzel: 'Cinzel, Georgia, serif',
  mono: 'Space Mono, monospace',
} as const

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  color: C.text,
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
}

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  color: C.muted,
  marginBottom: '0.3rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export const helpStyle: React.CSSProperties = {
  marginTop: '0.3rem',
  fontSize: '0.72rem',
  lineHeight: 1.4,
  color: C.muted2,
}

export function btnStyle(variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties {
  return {
    padding: '0.45rem 1rem',
    borderRadius: 6,
    border:
      variant === 'primary'
        ? 'none'
        : `1px solid ${variant === 'danger' ? 'rgba(255,80,80,0.4)' : C.border}`,
    background:
      variant === 'primary'
        ? C.goldAction
        : variant === 'danger'
        ? 'rgba(255,80,80,0.08)'
        : 'rgba(255,255,255,0.04)',
    color: variant === 'primary' ? C.bg : variant === 'danger' ? C.danger : C.text,
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    fontWeight: variant === 'primary' ? 600 : 400,
    cursor: 'pointer',
    letterSpacing: '0.03em',
  }
}