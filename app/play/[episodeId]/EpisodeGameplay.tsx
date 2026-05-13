'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { TeamChat } from './team/TeamChat'

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
}

type ChatMessage = {
  message_id: string
  content: string
  created_at: string
  player_id: string
  player: { display_name: string } | null
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
  }
  teamId: string | null
  teamName: string | null
  initialMessages: ChatMessage[]
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

const SHEET_DEFAULT = 220
const SHEET_EXPANDED = 480

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
  nodes,
  completedTargets,
  hasJoined,
  onJoin,
  inventoryItems = [],
}: Props) {
  const [sheetHeight, setSheetHeight] = useState(SHEET_DEFAULT)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('missioni')
  const [joining, setJoining] = useState(false)
  const [containerH, setContainerH] = useState(700)
  const [qrError, setQrError] = useState<string | null>(null)

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [gpsBlink, setGpsBlink] = useState(false)

  const dragStartY = useRef(0)
  const dragStartH = useRef(0)
  const qrCleanupRef = useRef<(() => void) | null>(null)

  // ── Container height ───────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setContainerH(window.innerHeight)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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

  // ── Drag / snap ────────────────────────────────────────────────────────────
  const snapSheet = useCallback((h: number) => {
    const mid = (SHEET_DEFAULT + SHEET_EXPANDED) / 2
    setSheetHeight(h > mid ? SHEET_EXPANDED : SHEET_DEFAULT)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    dragStartY.current = e.clientY
    dragStartH.current = sheetHeight
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const delta = dragStartY.current - e.clientY
    const next = Math.max(SHEET_DEFAULT, Math.min(SHEET_EXPANDED, dragStartH.current + delta))
    setSheetHeight(next)
  }
  const onPointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    snapSheet(sheetHeight)
  }

  const isExpanded = sheetHeight > SHEET_DEFAULT + 20
  const mapH = containerH - sheetHeight

  // ── Tab click ──────────────────────────────────────────────────────────────
  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab)
    if (!isExpanded) setSheetHeight(SHEET_EXPANDED)
  }

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
          (decodedText) => {
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
    { id: 'missioni', icon: '◈', label: 'MISSIONI' },
    { id: 'qr',       icon: '⊡', label: 'SCAN QR' },
    { id: 'borsa',    icon: '⊛', label: 'BORSA' },
    { id: 'squadra',  icon: '◉', label: 'SQUADRA' },
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
        flex: 'none',
        height: mapH,
        position: 'relative',
        transition: isDragging ? 'none' : 'height 0.32s cubic-bezier(0.32,0.72,0,1)',
        overflow: 'hidden',
      }}>
        <MapWrapper episodeId={episodeId} currentUserId={currentUserId} />

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

          {/* Destra: player badge con GPS + team */}
          <div style={{
            pointerEvents: 'auto',
            background: 'rgba(12,11,10,0.88)',
            border: `1px solid ${C.borderGold}`,
            borderRadius: 8,
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
            minWidth: 110,
          }}>
            {/* Nome + XP */}
            <div style={{
              fontFamily: C.fontCinzel,
              fontSize: '0.58rem',
              letterSpacing: '0.06em',
              color: C.gold,
              lineHeight: 1,
            }}>
              {player.display_name}
              <span style={{ color: C.muted, marginLeft: 5 }}>
                · {player.experience_points} xp
              </span>
            </div>

            {/* GPS + team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* GPS dot */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 5, height: 5,
                  borderRadius: '50%',
                  background: gpsDotColor,
                  boxShadow: gpsGlow,
                  transition: 'background 0.15s, box-shadow 0.15s',
                  display: 'inline-block',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: C.fontCinzel,
                  fontSize: '0.46rem',
                  letterSpacing: '0.1em',
                  color: gpsStatus === 'ok'
                    ? 'rgba(100,210,120,0.7)'
                    : gpsStatus === 'error'
                    ? 'rgba(232,85,85,0.7)'
                    : C.muted2,
                  transition: 'color 0.3s',
                }}>
                  GPS
                </span>
              </span>

              {/* Team */}
              {teamName && (
                <>
                  <span style={{ color: C.muted2, fontSize: '0.5rem' }}>·</span>
                  <span style={{
                    fontFamily: C.fontCinzel,
                    fontSize: '0.46rem',
                    letterSpacing: '0.08em',
                    color: 'rgba(254,234,165,0.55)',
                  }}>
                    {teamName}
                  </span>
                </>
              )}
            </div>
          </div>
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

      {/* ══ BOTTOM SHEET ═══════════════════════════════════════════════════ */}
      <div style={{
        flex: 'none',
        height: sheetHeight,
        background: C.surface,
        borderTop: '1px solid rgba(254,234,165,0.1)',
        transition: isDragging ? 'none' : 'height 0.32s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Handle */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 22,
            cursor: 'grab',
            touchAction: 'none',
            userSelect: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.muted2 }} />
        </div>

        {/* ── 4 TAB BUTTONS ─────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          gap: 7,
          padding: '0 14px 10px',
        }}>
          {tabs.map(({ id, icon, label }) => {
            const active = activeTab === id && isExpanded
            return (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                style={{
                  flex: 1,
                  height: 52,
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
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</span>
                <span style={{
                  fontFamily: C.fontCinzel,
                  fontSize: '0.42rem',
                  letterSpacing: '0.1em',
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── MISSIONE ATTIVA (solo collassato) ─────────────────────────── */}
        {!isExpanded && hasJoined && (
          <button
            onClick={() => handleTabClick('missioni')}
            style={{
              margin: '0 14px',
              padding: '9px 13px',
              borderRadius: 8,
              background: '#181410',
              border: `1px solid rgba(232,175,72,0.38)`,
              borderLeft: `4px solid ${C.goldAction}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              cursor: 'pointer',
              textAlign: 'left',
              width: 'calc(100% - 28px)',
            }}
          >
            <span style={{
              fontFamily: C.fontCinzel,
              fontSize: '0.46rem',
              letterSpacing: '0.12em',
              color: C.goldAction,
              background: 'rgba(232,175,72,0.1)',
              borderRadius: 999,
              padding: '2px 8px',
              alignSelf: 'flex-start',
            }}>
              {activeMission ? 'MISSIONE ATTIVA' : 'COMPLETATO'}
            </span>
            <p style={{ fontFamily: C.fontGaramond, fontSize: '0.93rem', color: C.text, margin: 0 }}>
              {activeMission ? activeMission.name : 'Tutte le missioni completate'}
            </p>
            {activeMission && (
              <p style={{ fontFamily: 'sans-serif', fontSize: '0.66rem', color: C.muted, margin: 0 }}>
                {activeMission.targets.filter(t => completedTargets.has(t.target_id)).length}
                /{activeMission.targets.length} obiettivi · tocca per dettagli →
              </p>
            )}
          </button>
        )}

        {!isExpanded && !hasJoined && (
          <JoinPrompt joining={joining} onJoin={handleJoin} compact />
        )}

        {/* ── CONTENUTO ESPANSO ─────────────────────────────────────────── */}
        {isExpanded && (
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
                <p style={{
                  fontFamily: C.fontCinzel,
                  fontSize: '0.55rem',
                  letterSpacing: '0.16em',
                  color: C.muted,
                }}>
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
                    width: '100%',
                    maxWidth: 270,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${C.borderGold}`,
                    background: '#000',
                    position: 'relative',
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
                  fontFamily: C.fontCinzel,
                  fontSize: '0.52rem',
                  letterSpacing: '0.1em',
                  color: C.muted,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}>
                  Inserisci codice manualmente
                </a>
              </div>
            )}

            {/* TAB: BORSA */}
            {activeTab === 'borsa' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px' }}>
                {inventoryItems.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '0.9rem', paddingTop: 8 }}>
                    La borsa è vuota.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
                    {inventoryItems.map(item => (
                      <a
                        key={item.item_id}
                        href={`/play/${episodeId}/combine`}
                        style={{
                          background: C.surface2,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: '9px 7px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 5,
                          textDecoration: 'none',
                          position: 'relative',
                        }}
                      >
                        <div style={{
                          width: 46, height: 46,
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image_url} alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.1rem', color: C.muted2 }}>◈</span>
                          )}
                        </div>
                        <p style={{
                          fontFamily: C.fontCinzel,
                          fontSize: '0.48rem',
                          letterSpacing: '0.06em',
                          color: C.text,
                          textAlign: 'center',
                          lineHeight: 1.3,
                          margin: 0,
                        }}>
                          {item.name}
                        </p>
                        {item.quantity > 1 && (
                          <div style={{
                            position: 'absolute', top: 5, right: 5,
                            background: C.goldAction, color: '#080706',
                            borderRadius: 999, width: 15, height: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.46rem', fontFamily: C.fontCinzel, fontWeight: 700,
                          }}>
                            {item.quantity}
                          </div>
                        )}
                      </a>
                    ))}
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
                  <TeamChat
                    teamId={teamId}
                    episodeId={episodeId}
                    playerId={player.player_id}
                    displayName={player.display_name}
                    initialMessages={initialMessages}
                  />
                )}
              </div>
            )}

          </div>
        )}

      </div>
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