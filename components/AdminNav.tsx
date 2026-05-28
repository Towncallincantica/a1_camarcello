'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',              label: 'Dashboard',    icon: '◈' },
  { href: '/admin/episodes',     label: 'Episodi',      icon: '◉' },
  { href: '/admin/items',        label: 'Oggetti',      icon: '◆' },
  { href: '/admin/combinations', label: 'Combinazioni', icon: '⬡' },
  { href: '/admin/markers',      label: 'Marker mappa', icon: '◎' },
  { href: '/admin/players',      label: 'Giocatori',    icon: '◐' },
  { href: '/admin/broadcast',    label: 'Broadcast',    icon: '▶' },
]

export default function AdminNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const linkStyle = (href: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.7rem 1.25rem',
    color: isActive(href) ? '#feeaa5' : 'rgba(255,255,255,0.55)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    background: isActive(href) ? 'rgba(254,234,165,0.06)' : 'transparent',
    borderLeft: isActive(href) ? '2px solid #feeaa5' : '2px solid transparent',
    transition: 'color 0.15s, background 0.15s',
  })

  const iconStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    opacity: 0.7,
    flexShrink: 0,
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav style={{
        width: '220px',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: '1.5rem 0',
        flexShrink: 0,
        display: 'none', // overridden by media query via className trick below
      }} className="admin-sidebar">
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.1em' }}>CA' MARCELLO</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.2rem' }}>Admin</div>
        </div>
        <ul style={{ listStyle: 'none', padding: '1rem 0', margin: 0 }}>
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <li key={href}>
              <a href={href} style={linkStyle(href)}>
                <span style={iconStyle}>{icon}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Mobile top bar ── */}
      <header style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '52px',
        background: '#0a0a0a',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        zIndex: 100,
      }} className="admin-topbar">
        <div style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
          CA' MARCELLO <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Georgia, serif' }}>Admin</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Apri menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#e8e4dc', padding: '0.5rem', lineHeight: 1,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="5"  width="18" height="1.8" rx="0.9" fill="currentColor"/>
            <rect x="2" y="10" width="18" height="1.8" rx="0.9" fill="currentColor"/>
            <rect x="2" y="15" width="18" height="1.8" rx="0.9" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {/* ── Drawer overlay ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 200,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: '260px',
        background: '#111',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        zIndex: 300,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }} className="admin-drawer">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div>
            <div style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.1em' }}>CA' MARCELLO</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.1rem' }}>Admin</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.3rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: '0.75rem 0', margin: 0, flex: 1, overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <li key={href}>
              <a
                href={href}
                onClick={() => setOpen(false)}
                style={{ ...linkStyle(href), padding: '0.9rem 1.25rem', fontSize: '1rem' }}
              >
                <span style={{ ...iconStyle, fontSize: '0.85rem' }}>{icon}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Media query styles ── */}
      <style>{`
        @media (min-width: 768px) {
          .admin-sidebar  { display: block !important; }
          .admin-topbar   { display: none !important; }
          .admin-drawer   { display: none !important; }
        }
        @media (max-width: 767px) {
          .admin-sidebar  { display: none !important; }
          .admin-topbar   { display: flex !important; }
        }
      `}</style>
    </>
  )
}