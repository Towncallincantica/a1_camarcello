'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  episodeId: string
  playerId: string
  hasMap: boolean
  hasInventory: boolean
}

export function PlayerNavBar({ episodeId, hasMap, hasInventory }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/play/${episodeId}`

  const navItems = [
    { label: 'Storia',     icon: '📜', path: '' },
    ...(hasMap       ? [{ label: 'Mappa',      icon: '🗺️', path: '/map' }]     : []),
    ...(hasInventory ? [{ label: 'Inventario', icon: '🎒', path: '/combine' }] : []),
    { label: 'Profilo',    icon: '🪬', path: '/profile' },
  ]

  const navRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [ringStyle, setRingStyle] = useState<React.CSSProperties>({ opacity: 0 })

  const activeIndex = navItems.findIndex((item) =>
    item.path === ''
      ? pathname === base
      : pathname.startsWith(`${base}${item.path}`)
  )

  const updateRing = useCallback(() => {
    const activeEl = itemRefs.current[activeIndex]
    const navEl = navRef.current
    if (!activeEl || !navEl) return
    const navRect = navEl.getBoundingClientRect()
    const itemRect = activeEl.getBoundingClientRect()
    setRingStyle({
      left: itemRect.left - navRect.left,
      width: itemRect.width,
      height: itemRect.height,
      top: itemRect.top - navRect.top,
      opacity: 1,
    })
  }, [activeIndex])

  useEffect(() => {
    updateRing()
    const observer = new ResizeObserver(updateRing)
    if (navRef.current) observer.observe(navRef.current)
    window.addEventListener('resize', updateRing)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateRing)
    }
  }, [updateRing])

  useEffect(() => {
    const t1 = setTimeout(updateRing, 80)
    const t2 = setTimeout(updateRing, 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [updateRing])

  return (
    <>
      <style>{`
        .nav-ring {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          transition:
            left 0.38s cubic-bezier(0.34,1.2,0.64,1),
            width 0.38s cubic-bezier(0.34,1.2,0.64,1),
            top 0.38s cubic-bezier(0.34,1.2,0.64,1),
            opacity 0.2s;
          background: conic-gradient(
            from 180deg,
            rgba(254,234,165,0.22),
            rgba(232,175,72,0.35),
            rgba(254,234,165,0.12),
            rgba(196,151,70,0.28),
            rgba(254,234,165,0.22)
          );
          border: 1px solid rgba(254,234,165,0.28);
          box-shadow:
            0 0 14px rgba(254,234,165,0.14),
            inset 1px 0 rgba(254,234,165,0.12),
            inset 0 0 10px rgba(254,234,165,0.04);
        }
        .nav-ring::after {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            rgba(254,234,165,0.08) 0%,
            transparent 50%,
            rgba(254,234,165,0.04) 100%
          );
        }
        .nav-item {
          transition: transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-item:active { transform: scale(0.91); }
        .qr-btn:active { transform: scale(0.91); }
      `}</style>

      {/* Contenitore fisso che tiene navbar + bottone QR */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>

        {/* Bottone QR scanner */}
        <button
          className="qr-btn"
          onClick={() => router.push(`${base}/exchange/scan`)}
          style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '999px',
            border: '1px solid rgba(254,234,165,0.25)',
            background: 'rgba(9,8,7,0.93)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: 'rgba(254,234,165,0.7)',
            fontSize: '1.4rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 40px rgba(0,0,0,0.75)',
            flexShrink: 0,
            transition: 'transform 0.1s',
          }}
          title="Scansiona QR"
        >
          📷
        </button>

        {/* Navbar */}
        <nav
          ref={navRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.1rem',
            background: 'rgba(9,8,7,0.93)',
            border: '1px solid rgba(254,234,165,0.1)',
            borderRadius: '999px',
            padding: '0.45rem 0.55rem',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 0 0 1px rgba(254,234,165,0.04), 0 8px 40px rgba(0,0,0,0.75)',
            position: 'relative',
          }}
        >
          <div className="nav-ring" style={ringStyle} />

          {navItems.map((item, i) => {
            const href = `${base}${item.path}`
            const isActive = i === activeIndex

            return (
              <Link
                key={item.path}
                href={href}
                ref={(el) => { itemRefs.current[i] = el }}
                className="nav-item"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.16rem',
                  padding: '0.44rem 0.82rem',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  minWidth: '3.4rem',
                  zIndex: 1,
                }}
              >
                <span style={{
                  fontSize: '1.25rem',
                  color: isActive ? '#feeaa5' : 'rgba(255,255,255,0.28)',
                  lineHeight: 1,
                  transition: 'color 0.2s',
                }}>
                  {item.icon}
                </span>
                <span style={{
                  fontSize: '0.56rem',
                  letterSpacing: '0.08em',
                  color: isActive ? 'rgba(254,234,165,0.9)' : 'rgba(255,255,255,0.22)',
                  textTransform: 'uppercase',
                  transition: 'color 0.2s',
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontWeight: isActive ? 600 : 400,
                }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}