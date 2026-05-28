'use client'

import { useRef, useState, useEffect, useTransition, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { TeamChat } from './team/TeamChat'
import { deleteItem } from './actions'
import { claimItemByQR, type ClaimResult } from './qrActions'
import { createClient } from '@/lib/supabase/client'

const MapWrapper = dynamic(() => import('./MapWrapper'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

type Target = {
  target_id: string
  type: string
  payload: Record<string, unknown> | null
}

type ContentNode = {
  node_id: string
  name: string
  node_category: string
  content_html: string | null
  targets: Target[]
}

type InventoryItem = {
  item_id: string
  name: string
  description: string | null
  image_url: string | null
  quantity: number
  rarity?: string
  category?: string | null
  is_consumable?: boolean
  base_value?: number | null
}

type PopupMode = 'actions' | 'details'

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
}

const rarityLabels: Record<string, string> = {
  common: 'Comune',
  uncommon: 'Non comune',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Leggendario',
}

type ChatMessage = {
  message_id: string
  content: string
  created_at: string
  player_id: string
  player: { display_name: string } | null
}

type Announcement = {
  announcement_id: string
  content: string
  created_at: string
}

type ActiveTab = 'missioni' | 'qr' | 'borsa' | 'squadra'

type Props = {
  episodeId: string
  currentUserId: string
  episode: {
    name: string
    physical_location: string | null
    start_datetime: string | null
  }
  player: {
    player_id: string
    display_name: string
    level: number
    experience_points: number
    avatar_url: string | null
  }
  teamId: string | null
  teamName: string | null
  initialMessages: ChatMessage[]
  initialAnnouncements: Announcement[]
  nodes: ContentNode[]
  completedTargets: Set<string>
  hasJoined: boolean
  onJoin: () => Promise<void>
  inventoryItems?: InventoryItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  code_entry: 'Codice',
  qr_scan: 'QR Code',
  gps_location: 'Posizione GPS',
  claim_item: 'Raccogli oggetto',
}


const C = {
  bg: '#090807',
  surface: '#0f0e0d',
  surface2: '#181714',
  border: 'rgba(255,255,255,0.07)',
  borderGold: 'rgba(254,234,165,0.25)',
  gold: '#feeaa5',
  goldAction: '#e8af48',
  text: '#e8e4dc',
  muted: 'rgba(255,255,255,0.38)',
  muted2: 'rgba(255,255,255,0.18)',
  success: '#64d278',
  fontCinzel: "'Cinzel', Georgia, serif",
  fontGaramond: "'EB Garamond', Georgia, serif",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EpisodeGameplay({
  episodeId,
  currentUserId,
  episode,
  player,
  teamId,
  teamName,
  initialMessages,
  initialAnnouncements,
  nodes,
  completedTargets,
  hasJoined,
  onJoin,
  inventoryItems = [],
}: Props) {
  const [tabOpen, setTabOpen] = useState(false)
  const [tabClosing, setTabClosing] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('missioni')

  const closeTab = () => {
    setTabClosing(true)
    setTimeout(() => {
      setTabOpen(false)
      setTabClosing(false)
    }, 280)
  }
  const [joining, setJoining] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [claimedItem, setClaimedItem] = useState<Extract<ClaimResult, { success: true }>['item'] | null>(null)
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [popupMode, setPopupMode] = useState<PopupMode | null>(null)
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(inventoryItems)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [unreadCount, setUnreadCount] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [showAnnouncementsPopup, setShowAnnouncementsPopup] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const teamMemberIds = useMemo(() => teamId ? [teamId] : [], [teamId])
  const router = useRouter()

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [gpsBlink, setGpsBlink] = useState(false)

  const qrCleanupRef = useRef<(() => void) | null>(null)

  // ── Sync inventoryItems prop → localInventory ──────────────────────────────
  useEffect(() => {
    setLocalInventory(inventoryItems)
  }, [inventoryItems])

  // ── GPS events (da GPSUploader) ────────────────────────────────────────────
  useEffect(() => {
    const onOk = () => {
      setGpsStatus('ok')
      setGpsBlink(true)
      setTimeout(() => setGpsBlink(false), 200)
    }
    const onErr = () => setGpsStatus('error')
    window.addEventListener('gps:ok', onOk)
    window.addEventListener('gps:error', onErr)
    return () => {
      window.removeEventListener('gps:ok', onOk)
      window.removeEventListener('gps:error', onErr)
    }
  }, [])

  // ── Annunci Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(() => {
      channel = supabase
        .channel(`announcements:${episodeId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'episode_announcements',
          filter: `episode_id=eq.${episodeId}`,
        }, (payload) => {
          const a = payload.new as Announcement
          setAnnouncements(prev => [...prev, a])
        })
        .subscribe()
    })

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [supabase, episodeId])

  // ── Tab click ──────────────────────────────────────────────────────────────
  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab)
    if (tab === 'squadra') setUnreadCount(0)
    setTabOpen(true)
    setTabClosing(false)
  }

  const isExpanded = tabOpen

  // ── QR scanner ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'qr' || !isExpanded) {
      if (qrCleanupRef.current) {
        qrCleanupRef.current()
        qrCleanupRef.current = null
      }
      return
    }
    let cancelled = false
    setQrError(null)
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled) return
        const scanner = new Html5Qrcode('qr-reader')
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          async (decodedText) => {
            let parsed: { type?: string; player_id?: string; item_id?: string } | null = null
            try { parsed = JSON.parse(decodedText) } catch { /* non JSON */ }

            if (parsed?.type === 'item' && parsed.item_id) {
              try { if (scanner.isScanning) await scanner.stop(); scanner.clear() } catch {}
              qrCleanupRef.current = null
              const result = await claimItemByQR(episodeId, parsed.item_id)
              if (result.success) {
                setClaimedItem(result.item)
                if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
                popupTimerRef.current = setTimeout(() => setClaimedItem(null), 5000)
              } else {
                setQrError(result.error)
              }
              return
            }

            if (parsed?.type === 'player' && parsed.player_id) {
              window.location.href = `/play/${episodeId}/exchange/scan`
              return
            }

            window.location.href = `/play/${episodeId}/code?qr=${encodeURIComponent(decodedText)}`
          },
          () => {}
        )
        qrCleanupRef.current = async () => {
          try { if (scanner.isScanning) await scanner.stop(); scanner.clear() } catch {}
        }
      } catch {
        if (!cancelled) setQrError('Impossibile accedere alla fotocamera.')
      }
    }
    startScanner()
    return () => {
      cancelled = true
      if (qrCleanupRef.current) { qrCleanupRef.current(); qrCleanupRef.current = null }
    }
  }, [activeTab, isExpanded, episodeId])

  // ── Join ───────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    setJoining(true)
    await onJoin()
    setJoining(false)
  }

  // ── Inventory popup handlers ──────────────────────────────────────────────
  const openItemPopup = (item: InventoryItem) => {
    setSelectedItem(item)
    setPopupMode('actions')
  }

  const closeItemPopup = () => {
    setSelectedItem(null)
    setPopupMode(null)
  }

  const handleItemDelete = () => {
    if (!selectedItem) return
    const itemId = selectedItem.item_id
    startDeleteTransition(async () => {
      await deleteItem(episodeId, player.player_id, itemId)
      setLocalInventory(prev =>
        prev.map(i => i.item_id !== itemId ? i : { ...i, quantity: i.quantity - 1 })
           .filter(i => i.quantity > 0)
      )
      closeItemPopup()
    })
  }

  const handleItemCombine = () => {
    if (!selectedItem) return
    closeItemPopup()
    router.push(`/play/${episodeId}/combine?preselect=${selectedItem.item_id}`)
  }

  // ── Active mission ─────────────────────────────────────────────────────────
  const activeMission = nodes.find(n =>
    n.targets.length > 0 && !n.targets.every(t => completedTargets.has(t.target_id))
  ) ?? null

  // ── GPS dot color ──────────────────────────────────────────────────────────
  const gpsDotColor = gpsStatus === 'ok'
    ? (gpsBlink ? 'rgba(100,210,120,0.15)' : '#64d278')
    : gpsStatus === 'error' ? '#e85555' : 'rgba(255,255,255,0.2)'
  const gpsGlow = gpsStatus === 'ok' && !gpsBlink
    ? '0 0 5px rgba(100,210,120,0.5)' : 'none'

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; icon: string; label: string }[] = [
    { id: 'missioni', icon: '🗺️', label: '' },
    { id: 'borsa',    icon: '🎒', label: '' },
    { id: 'squadra',  icon: '👥', label: '' },
    { id: 'qr',       icon: '📷', label: '' },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: C.bg,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ══ MAPPA ══════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <MapWrapper
          episodeId={episodeId}
          currentUserId={currentUserId}
          playerId={player.player_id}
          playerLevel={player.level}
          teamMemberIds={teamMemberIds}
        />

        {/* Top bar sovrapposta */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 64,
          background: 'linear-gradient(to bottom, rgba(9,8,7,0.92) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '10px 14px 0',
          zIndex: 30,
          pointerEvents: 'none',
        }}>
          {/* Sinistra: back + titolo */}
          <div style={{ pointerEvents: 'auto' }}>
            <a href="/play" style={{
              fontFamily: C.fontCinzel,
              fontSize: '0.48rem',
              letterSpacing: '0.16em',
              color: C.muted,
              display: 'block',
              marginBottom: 3,
            }}>
              ← EPISODI
            </a>
            <p style={{
              fontFamily: C.fontCinzel,
              fontSize: '0.68rem',
              letterSpacing: '0.18em',
              color: C.gold,
              margin: 0,
            }}>
              {episode.name.toUpperCase()}
            </p>
          </div>

          {/* Destra: player badge clickable con avatar */}
          <a
            href={`/play/${episodeId}/profile`}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(12,11,10,0.88)',
              border: `1px solid ${C.borderGold}`,
              borderRadius: 8,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              minWidth: 110,
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              border: `1px solid rgba(254,234,165,0.3)`,
              background: 'rgba(255,255,255,0.05)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {player.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.avatar_url} alt={player.display_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '0.7rem', color: C.muted2 }}>◈</span>
              )}
            </div>

            {/* Testo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{
                fontFamily: C.fontCinzel, fontSize: '0.58rem',
                letterSpacing: '0.06em', color: C.gold, lineHeight: 1,
              }}>
                {player.display_name}
                <span style={{ color: C.muted, marginLeft: 5 }}>
                  · {player.experience_points} xp
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: gpsDotColor, boxShadow: gpsGlow,
                    transition: 'background 0.15s, box-shadow 0.15s',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: C.fontCinzel, fontSize: '0.46rem', letterSpacing: '0.1em',
                    color: gpsStatus === 'ok' ? 'rgba(100,210,120,0.7)' : gpsStatus === 'error' ? 'rgba(232,85,85,0.7)' : C.muted2,
                    transition: 'color 0.3s',
                  }}>GPS</span>
                </span>
                {teamName && (
                  <>
                    <span style={{ color: C.muted2, fontSize: '0.5rem' }}>·</span>
                    <span style={{ fontFamily: C.fontCinzel, fontSize: '0.46rem', letterSpacing: '0.08em', color: 'rgba(254,234,165,0.55)' }}>
                      {teamName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </a>
        </div>

        {/* Bottom fade */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 40,
          background: 'linear-gradient(to top, rgba(9,8,7,0.65) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }} />
      </div>

      {/* ══ BARRA ANNUNCI ══════════════════════════════════════════════════ */}
      {announcements.length > 0 && (() => {
        const last = announcements[announcements.length - 1]
        return (
          <button
            onClick={() => setShowAnnouncementsPopup(true)}
            style={{
              flexShrink: 0,
              width: '100%',
              background: 'rgba(254,234,165,0.06)',
              borderTop: '1px solid rgba(254,234,165,0.15)',
              borderBottom: '1px solid rgba(254,234,165,0.15)',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>📢</span>
            <span style={{
              fontFamily: C.fontGaramond,
              fontSize: '0.82rem',
              color: C.gold,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {last.content}
            </span>
            <span style={{ color: C.muted, fontSize: '0.65rem', flexShrink: 0 }}>
              {announcements.length > 1 ? `+${announcements.length - 1}` : ''}
            </span>
          </button>
        )
      })()}

      {/* ══ TAB BAR ════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        background: C.surface,
        borderTop: '1px solid rgba(254,234,165,0.1)',
        display: 'flex',
        gap: 7,
        padding: '10px 14px 10px',
      }}>
        {tabs.map(({ id, icon, label }) => {
          const active = activeTab === id && tabOpen
          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 9,
                background: active ? 'rgba(254,234,165,0.07)' : C.surface2,
                border: `1px solid ${active ? 'rgba(254,234,165,0.42)' : C.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                cursor: 'pointer',
                color: active ? C.gold : C.muted,
                padding: 0,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</span>
              <span style={{ fontFamily: C.fontCinzel, fontSize: '0.42rem', letterSpacing: '0.1em' }}>
                {label}
              </span>
              {id === 'squadra' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 8,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#e85555', color: '#fff',
                  fontSize: '0.58rem', fontFamily: C.fontCinzel, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', lineHeight: 1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ══ OVERLAY TAB CONTENUTO ══════════════════════════════════════════ */}
      {tabOpen && (
        <>
          <style>{`
            @keyframes tabSlideUp {
              from { transform: translateY(100%); opacity: 0; }
              to   { transform: translateY(0);    opacity: 1; }
            }
            @keyframes tabSlideDown {
              from { transform: translateY(0);    opacity: 1; }
              to   { transform: translateY(100%); opacity: 0; }
            }
          `}</style>
          <div style={{
            position: 'fixed', inset: 0,
            background: C.bg,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: tabClosing
              ? 'tabSlideDown 0.28s cubic-bezier(0.32,0.72,0,1) forwards'
              : 'tabSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) forwards',
          }}>
          {/* Contenuto tab */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* TAB: MISSIONI */}
            {activeTab === 'missioni' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px' }}>
                {!hasJoined ? (
                  <JoinPrompt joining={joining} onJoin={handleJoin} />
                ) : nodes.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.9rem', paddingTop: 8 }}>
                    Nessuna missione disponibile.
                  </p>
                ) : (
                  nodes.map(node => {
                    const done = node.targets.length > 0 &&
                      node.targets.every(t => completedTargets.has(t.target_id))
                    return (
                      <NodeCard
                        key={node.node_id}
                        node={node}
                        done={done}
                        completedTargets={completedTargets}
                        episodeId={episodeId}
                      />
                    )
                  })
                )}
              </div>
            )}

            {/* TAB: QR */}
            {activeTab === 'qr' && (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 14px 14px',
                gap: 12,
              }}>
                <p style={{ fontFamily: C.fontCinzel, fontSize: '0.55rem', letterSpacing: '0.16em', color: C.muted }}>
                  INQUADRA IL QR CODE
                </p>
                {qrError ? (
                  <div style={{ color: C.muted, fontSize: '0.85rem', textAlign: 'center', paddingTop: 16 }}>
                    <p style={{ marginBottom: 12 }}>{qrError}</p>
                    <a href={`/play/${episodeId}/code`} style={ctaStyle(C.goldAction, 'rgba(232,175,72,0.35)')}>
                      INSERISCI CODICE MANUALE
                    </a>
                  </div>
                ) : (
                  <div style={{
                    width: '100%', maxWidth: 270, borderRadius: 8,
                    overflow: 'hidden', border: `1px solid ${C.borderGold}`,
                    background: '#000', position: 'relative',
                  }}>
                    <div id="qr-reader" style={{ width: '100%' }} />
                    {[
                      { top: 12, left: 12, borderTop: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}` },
                      { top: 12, right: 12, borderTop: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}` },
                      { bottom: 12, left: 12, borderBottom: `2px solid ${C.gold}`, borderLeft: `2px solid ${C.gold}` },
                      { bottom: 12, right: 12, borderBottom: `2px solid ${C.gold}`, borderRight: `2px solid ${C.gold}` },
                    ].map((st, i) => (
                      <div key={i} style={{ position: 'absolute', width: 18, height: 18, opacity: 0.55, ...st }} />
                    ))}
                  </div>
                )}
                <a href={`/play/${episodeId}/code`} style={{
                  fontFamily: C.fontCinzel, fontSize: '0.52rem', letterSpacing: '0.1em',
                  color: C.muted, textDecoration: 'underline', textUnderlineOffset: 3,
                }}>
                  Inserisci codice manualmente
                </a>
              </div>
            )}

            {/* ── POPUP ITEM RACCOLTO ─────────────────────────────────────── */}
            {claimedItem && (() => {
              const rColor = rarityColors[claimedItem.rarity ?? 'common'] ?? C.muted
              return (
                <div style={{
                  position: 'fixed', inset: 0, zIndex: 300,
                  background: 'rgba(0,0,0,0.82)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                }} onClick={() => setClaimedItem(null)}>
                  <style>{`
                    @keyframes itemFadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                    @keyframes drainBar { from { width:100%; } to { width:0%; } }
                  `}</style>
                  <div onClick={e => e.stopPropagation()} style={{
                    background: '#111009', border: `1px solid ${rColor}55`,
                    boxShadow: `0 0 32px ${rColor}22`, borderRadius: 12,
                    padding: '2rem 1.5rem', width: '100%', maxWidth: 300,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                    animation: 'itemFadeIn 0.3s ease',
                  }}>
                    <div style={{
                      width: 110, height: 110,
                      border: `1px solid ${rColor}55`, boxShadow: `0 0 20px ${rColor}33`,
                      background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {claimedItem.image_url || claimedItem.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={claimedItem.image_url ?? claimedItem.icon_url ?? ''}
                          alt={claimedItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '2.5rem', color: rColor, opacity: 0.4 }}>◈</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: C.fontCinzel, fontSize: '0.55rem', letterSpacing: '0.14em', color: rColor, textTransform: 'uppercase' }}>
                        {claimedItem.rarity}
                      </span>
                      <span style={{ fontFamily: C.fontCinzel, fontSize: '1rem', color: C.gold }}>
                        {claimedItem.name}
                      </span>
                      {claimedItem.description && (
                        <span style={{ fontFamily: C.fontGaramond, fontSize: '0.85rem', color: C.muted, lineHeight: 1.5 }}>
                          {claimedItem.description}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: C.fontCinzel, fontSize: '0.48rem', letterSpacing: '0.12em', color: C.muted2 }}>
                      AGGIUNTO ALL'INVENTARIO
                    </span>
                    <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: rColor, animation: 'drainBar 5s linear forwards' }} />
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* TAB: BORSA */}
            {activeTab === 'borsa' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px' }}>
                {localInventory.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.9rem', paddingTop: 8 }}>
                    La borsa è vuota.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
                    {localInventory.map(item => {
                      const rColor = rarityColors[item.rarity ?? 'common'] ?? C.muted
                      return (
                        <button
                          key={item.item_id}
                          onClick={() => openItemPopup(item)}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${rColor}33`,
                            borderRadius: 8,
                            padding: '9px 7px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          <div style={{
                            width: 46, height: 46,
                            borderRadius: 6,
                            background: `${rColor}11`,
                            border: `1px solid ${rColor}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                          }}>
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image_url} alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '1.1rem', color: rColor, opacity: 0.6 }}>◈</span>
                            )}
                          </div>
                          <p style={{
                            fontFamily: C.fontCinzel,
                            fontSize: '0.48rem',
                            letterSpacing: '0.06em',
                            color: rColor,
                            textAlign: 'center',
                            lineHeight: 1.3,
                            margin: 0,
                          }}>
                            {item.name}
                          </p>
                          <span style={{
                            position: 'absolute', top: 4, right: 5,
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem',
                          }}>
                            ×{item.quantity}
                          </span>
                          <span style={{
                            position: 'absolute', bottom: 4, right: 5,
                            width: 5, height: 5, borderRadius: '50%',
                            background: rColor, opacity: 0.7,
                          }} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SQUADRA */}
            {activeTab === 'squadra' && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {!teamId ? (
                  <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                    <p style={{ color: C.muted, fontFamily: C.fontGaramond, fontSize: '0.95rem', marginBottom: 12 }}>
                      Non sei ancora in una squadra.
                    </p>
                    <a
                      href={`/play/${episodeId}/team`}
                      style={ctaStyle(C.gold, C.borderGold)}
                    >
                      UNISCITI A UNA SQUADRA
                    </a>
                  </div>
                ) : (
                  <>
                    <div style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontFamily: C.fontCinzel, fontSize: '0.6rem', letterSpacing: '0.1em', color: C.gold }}>
                        {teamName ?? 'Squadra'}
                      </span>
                      <a
                        href={`/play/${episodeId}/team`}
                        style={{
                          fontFamily: C.fontCinzel,
                          fontSize: '0.52rem',
                          letterSpacing: '0.06em',
                          color: 'rgba(232,85,85,0.6)',
                          border: '1px solid rgba(232,85,85,0.2)',
                          borderRadius: 3,
                          padding: '3px 8px',
                          textDecoration: 'none',
                        }}
                      >
                        Lascia
                      </a>
                    </div>
                    <TeamChat
                      teamId={teamId}
                      episodeId={episodeId}
                      playerId={player.player_id}
                      displayName={player.display_name}
                      initialMessages={initialMessages}
                      onNewMessage={() => {
                        if (activeTab !== 'squadra') setUnreadCount(c => c + 1)
                      }}
                    />
                  </>
                )}
              </div>
            )}

          </div>

          {/* Pulsante torna alla mappa */}
          <div style={{ flexShrink: 0, padding: '12px 14px 20px' }}>
            <button
              onClick={closeTab}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: 'rgba(254,234,165,0.05)',
                border: '1px solid rgba(254,234,165,0.2)',
                borderRadius: 9,
                color: C.gold,
                fontFamily: C.fontCinzel,
                fontSize: '0.65rem',
                letterSpacing: '0.14em',
                cursor: 'pointer',
              }}
            >
              ← TORNA ALLA MAPPA
            </button>
          </div>
        </div>
        </>
      )}

      {/* ══ ITEM POPUP ═══════════════════════════════════════════════════════ */}
      {popupMode && selectedItem && (
        <div
          onClick={closeItemPopup}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 200, padding: '0 0 5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111009',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px 12px 0 0',
              width: '100%', maxWidth: 420,
              padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: -4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Item header */}
            {(() => {
              const rColor = rarityColors[selectedItem.rarity ?? 'common'] ?? C.muted
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 48, height: 48, flexShrink: 0,
                    background: `${rColor}11`, border: `1px solid ${rColor}33`,
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {selectedItem.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedItem.image_url} alt={selectedItem.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: rColor, fontSize: '1.2rem', opacity: 0.5 }}>◈</span>
                    )}
                  </div>
                  <div>
                    <p style={{ color: rColor, fontSize: '0.95rem', margin: 0, fontFamily: C.fontGaramond }}>
                      {selectedItem.name}
                    </p>
                    <p style={{ color: C.muted, fontSize: '0.7rem', margin: '0.2rem 0 0', fontFamily: C.fontCinzel, letterSpacing: '0.06em' }}>
                      {rarityLabels[selectedItem.rarity ?? 'common'] ?? selectedItem.rarity ?? ''}
                      {selectedItem.category ? ` · ${selectedItem.category}` : ''}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* AZIONI */}
            {popupMode === 'actions' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Dettagli', emoji: '📖', action: () => setPopupMode('details'), enabled: true },
                  { label: 'Combina', emoji: '⚗️', action: handleItemCombine, enabled: true },
                  { label: 'Elimina', emoji: '🗑️', action: handleItemDelete, enabled: !isDeleting, danger: true },
                  { label: 'Usa', emoji: '✨', action: () => {}, enabled: false, soon: true },
                ].map(({ label, emoji, action, enabled, danger, soon }) => (
                  <button
                    key={label}
                    onClick={enabled ? action : undefined}
                    disabled={!enabled}
                    style={{
                      padding: '0.85rem 0.5rem',
                      background: danger ? 'rgba(232,85,85,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${danger ? 'rgba(232,85,85,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 8,
                      color: !enabled ? 'rgba(255,255,255,0.2)' : danger ? 'rgba(232,85,85,0.75)' : C.text,
                      fontFamily: C.fontGaramond,
                      fontSize: '0.9rem',
                      cursor: enabled ? 'pointer' : 'not-allowed',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{emoji}</span>
                    <span>{label}</span>
                    {soon && (
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontFamily: C.fontCinzel, letterSpacing: '0.06em' }}>
                        prossimamente
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* DETTAGLI */}
            {popupMode === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedItem.description && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0, fontFamily: C.fontGaramond }}>
                    {selectedItem.description}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'Rarità', value: rarityLabels[selectedItem.rarity ?? 'common'] ?? selectedItem.rarity },
                    selectedItem.category ? { label: 'Categoria', value: selectedItem.category } : null,
                    { label: 'Consumabile', value: selectedItem.is_consumable ? 'Sì' : 'No' },
                    selectedItem.base_value != null ? { label: 'Valore', value: String(selectedItem.base_value) } : null,
                  ].filter(Boolean).map(row => (
                    <div key={row!.label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      <span style={{ color: C.muted, fontSize: '0.78rem', fontFamily: C.fontCinzel, letterSpacing: '0.04em' }}>{row!.label}</span>
                      <span style={{ color: C.text, fontSize: '0.78rem' }}>{row!.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setPopupMode('actions')}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6, color: C.muted, padding: '0.55rem',
                    fontFamily: C.fontCinzel, fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >
                  ← Azioni
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ POPUP ANNUNCI ══════════════════════════════════════════════════ */}
      {showAnnouncementsPopup && (
        <div
          onClick={() => setShowAnnouncementsPopup(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 200, padding: '0 0 2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111009',
              border: '1px solid rgba(254,234,165,0.15)',
              borderRadius: '12px 12px 4px 4px',
              width: '100%',
              maxWidth: 480,
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header popup */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: C.fontCinzel, fontSize: '0.65rem', letterSpacing: '0.12em', color: C.gold }}>
                📢 ANNUNCI
              </span>
              <button
                onClick={() => setShowAnnouncementsPopup(false)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '1rem', padding: 0 }}
              >
                ✕
              </button>
            </div>
            {/* Lista annunci */}
            <div style={{ overflowY: 'auto', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...announcements].reverse().map(a => (
                <div key={a.announcement_id} style={{
                  padding: '0.75rem 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <p style={{ color: C.text, fontFamily: C.fontGaramond, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 0.3rem' }}>
                    {a.content}
                  </p>
                  <span style={{ color: C.muted, fontSize: '0.65rem', fontFamily: C.fontCinzel, letterSpacing: '0.06em' }}>
                    {new Date(a.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function JoinPrompt({ joining, onJoin, compact = false }: {
  joining: boolean; onJoin: () => void; compact?: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 12, padding: compact ? '8px 14px' : '24px 14px',
    }}>
      {!compact && (
        <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'EB Garamond', Georgia, serif", fontSize: '1rem', textAlign: 'center' }}>
          Vuoi partecipare a questo episodio?
        </p>
      )}
      <button onClick={onJoin} disabled={joining} style={{
        background: 'rgba(254,234,165,0.07)', border: '1px solid rgba(254,234,165,0.35)',
        color: '#feeaa5', padding: '9px 28px', fontSize: '0.72rem',
        cursor: joining ? 'default' : 'pointer',
        fontFamily: "'Cinzel', Georgia, serif", letterSpacing: '0.1em',
        borderRadius: 3, opacity: joining ? 0.6 : 1,
      }}>
        {joining ? 'Entrando…' : "Entra nell'episodio"}
      </button>
    </div>
  )
}

function NodeCard({ node, done, completedTargets, episodeId }: {
  node: ContentNode; done: boolean; completedTargets: Set<string>; episodeId: string
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${done ? 'rgba(100,210,120,0.22)' : 'rgba(255,255,255,0.07)'}`,
      borderLeft: `3px solid ${done ? '#64d278' : 'rgba(254,234,165,0.28)'}`,
      borderRadius: 7, padding: '10px 11px', marginBottom: 9,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{
          fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.63rem',
          letterSpacing: '0.1em', color: done ? '#64d278' : '#feeaa5', textTransform: 'uppercase',
        }}>
          {node.name}
        </span>
        {done && (
          <span style={{ fontFamily: "'Cinzel'", fontSize: '0.52rem', letterSpacing: '0.06em', color: '#64d278' }}>
            ✓ FATTO
          </span>
        )}
      </div>
      {node.content_html && (
        <div
          style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.48)', lineHeight: 1.55, marginBottom: 7 }}
          dangerouslySetInnerHTML={{ __html: node.content_html }}
        />
      )}
      {node.targets.map(target => {
        const completed = completedTargets.has(target.target_id)
        return (
          <div key={target.target_id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, padding: '5px 7px', marginTop: 4,
            background: 'rgba(255,255,255,0.02)', borderRadius: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: completed ? '#64d278' : 'rgba(255,255,255,0.2)', fontSize: '0.82rem' }}>
                {completed ? '✓' : '○'}
              </span>
              <span style={{
                fontFamily: "'Cinzel', Georgia, serif", fontSize: '0.6rem',
                letterSpacing: '0.04em', color: 'rgba(255,255,255,0.42)',
              }}>
                {TARGET_LABELS[target.type] ?? target.type}
              </span>
            </div>
            {!completed && target.type === 'gps_location' && (
              <a href={`/play/${episodeId}/map`} style={ctaStyle('#a5feb8', 'rgba(165,254,184,0.28)')}>Mappa</a>
            )}
            {!completed && (target.type === 'code_entry' || target.type === 'qr_scan') && (
              <a href={`/play/${episodeId}/code?targetId=${target.target_id}&nodeId=${node.node_id}`}
                style={ctaStyle('#e8af48', 'rgba(232,175,72,0.28)')}>
                {target.type === 'qr_scan' ? 'Scansiona' : 'Codice'}
              </a>
            )}
            {!completed && target.type === 'claim_item' && (
              <a href={`/play/${episodeId}/claim?targetId=${target.target_id}&nodeId=${node.node_id}`}
                style={ctaStyle('#feeaa5', 'rgba(254,234,165,0.28)')}>
                Raccogli
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ctaStyle(color: string, border: string): React.CSSProperties {
  return {
    fontFamily: "'Cinzel', Georgia, serif",
    fontSize: '0.58rem', letterSpacing: '0.06em',
    color, border: `1px solid ${border}`,
    borderRadius: 3, padding: '4px 10px',
    background: 'none', cursor: 'pointer',
    whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block',
  }
}