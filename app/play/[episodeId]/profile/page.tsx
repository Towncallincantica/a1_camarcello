import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { PlayerQRCode } from '@/components/PlayerQRCode'
import { AvatarUpload } from './AvatarUpload'

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

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ episodeId: string }>
}) {
  const { episodeId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carica player + avatar_url dall'utente
  const [{ data: player }, { data: userData }] = await Promise.all([
    supabase
      .from('player')
      .select('player_id, display_name, level, experience_points, created_at')
      .eq('user_id', user.id)
      .eq('adventure_id', ADVENTURE_ID)
      .single(),
    supabase
      .from('users')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single(),
  ])
  if (!player) redirect('/play')

  const avatarUrl = userData?.avatar_url ?? null

  const [
    { data: inventory },
    { data: statusEffects },
    { data: achievements },
    { data: steps },
  ] = await Promise.all([
    supabase
      .from('player_episode_inventory')
      .select('quantity, items ( item_id, name, description, rarity, category, icon_url, is_consumable )')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
    supabase
      .from('player_status_effects')
      .select('status_effect_id, status_type, applied_at, expires_at')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
    supabase
      .from('player_achievements')
      .select('unlocked_at, achievements ( name, description, achievement_type )')
      .eq('player_id', player.player_id),
    supabase
      .from('player_steps')
      .select('progress_item_id')
      .eq('player_id', player.player_id)
      .eq('episode_id', episodeId),
  ])

  const activeEffects = (statusEffects ?? []).filter(
    (e) => !e.expires_at || new Date(e.expires_at) > new Date()
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
      paddingBottom: '6rem',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <a
          href={`/play/${episodeId}`}
          style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          ← Storia
        </a>
        <span style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.06em' }}>
          Profilo
        </span>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Avatar + Stats */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            marginBottom: '1.25rem',
          }}>
            {/* Avatar upload */}
            <AvatarUpload userId={user.id} currentAvatarUrl={avatarUrl} />

            {/* Nome + livello */}
            <div style={{ flex: 1 }}>
              <h1 style={{ color: '#feeaa5', fontSize: '1.2rem', letterSpacing: '0.05em', margin: 0 }}>
                {player.display_name}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: '0.2rem 0 0.6rem' }}>
                Dal {new Date(player.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ color: '#feeaa5', fontSize: '1.3rem', fontWeight: 'bold' }}>
                  Lv {player.level}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                  {player.experience_points} XP
                </span>
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div style={{
            height: '3px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '1rem',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (player.experience_points % 1000) / 10)}%`,
              background: '#feeaa5',
              borderRadius: '999px',
              transition: 'width 0.4s',
            }} />
          </div>

          {/* Contatori */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
          }}>
            {[
              { label: 'Nodi completati', value: steps?.length ?? 0 },
              { label: 'Oggetti', value: inventory?.length ?? 0 },
              { label: 'Achievement', value: achievements?.length ?? 0 },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '0.75rem',
                textAlign: 'center',
              }}>
                <div style={{ color: '#feeaa5', fontSize: '1.2rem' }}>{stat.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Status effects attivi */}
        {activeEffects.length > 0 && (
          <section>
            <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Effetti attivi
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {activeEffects.map((e) => (
                <span key={e.status_effect_id} style={{
                  padding: '0.25rem 0.75rem',
                  border: '1px solid rgba(254,234,165,0.2)',
                  borderRadius: '999px',
                  color: '#feeaa5',
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                }}>
                  {e.status_type}
                  {e.expires_at && (
                    <span style={{ color: 'rgba(254,234,165,0.45)', marginLeft: '0.4rem' }}>
                      {formatExpiry(e.expires_at)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Inventario */}
        <section>
          <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Inventario
          </h2>
          {inventory && inventory.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {inventory.map((inv) => {
                const item = inv.items as unknown as {
                  item_id: string; name: string; description: string | null
                  rarity: string; category: string | null; icon_url: string | null; is_consumable: boolean
                }
                if (!item) return null
                const color = rarityColors[item.rarity] ?? rarityColors.common
                return (
                  <div key={item.item_id} style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${color}33`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '0.75rem 0.5rem 0.6rem', gap: '0.5rem',
                  }}>
                    <div style={{
                      width: 56, height: 56,
                      background: `${color}11`, border: `1px solid ${color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {item.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.icon_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color, fontSize: '1.4rem', opacity: 0.5 }}>◈</span>
                      )}
                    </div>
                    <p style={{ color, fontSize: '0.72rem', lineHeight: 1.3, margin: 0, textAlign: 'center', wordBreak: 'break-word' }}>
                      {item.name}
                    </p>
                    {item.category && (
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem', margin: 0 }}>
                        {item.category}
                      </p>
                    )}
                    <span style={{ position: 'absolute', top: '0.3rem', right: '0.4rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
                      ×{inv.quantity}
                    </span>
                    <span style={{ position: 'absolute', bottom: '0.3rem', right: '0.4rem', width: 5, height: 5, borderRadius: '50%', background: color, opacity: 0.7 }} />
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Nessun oggetto ancora.</p>
          )}
        </section>

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <section>
            <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Achievement
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {achievements.map((pa) => {
                const ach = pa.achievements as unknown as { name: string; description: string | null; achievement_type: string }
                if (!ach) return null
                return (
                  <div key={pa.unlocked_at} style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <span style={{ color: '#feeaa5', fontSize: '0.85rem' }}>{ach.name}</span>
                      {ach.description && (
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{ach.description}</p>
                      )}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>
                      {new Date(pa.unlocked_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* QR Code */}
        <section>
          <h2 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Il tuo QR
          </h2>
          <PlayerQRCode playerId={player.player_id} displayName={player.display_name} />
        </section>

{/* Logout */}
        <section style={{ paddingTop: '0.5rem' }}>
          <form method="POST" action="/logout">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                border: '1px solid rgba(232,85,85,0.25)',
                color: 'rgba(232,85,85,0.6)',
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}
            >
              ESCI
            </button>
          </form>
        </section>

      </div>
    </main>
  )
}

function formatExpiry(expiresAt: string): string {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}