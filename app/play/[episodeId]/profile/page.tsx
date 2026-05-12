import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ADVENTURE_ID } from '@/lib/constants'
import { PlayerQRCode } from '@/components/PlayerQRCode'

const rarityColors: Record<string, string> = {
  common: 'rgba(255,255,255,0.5)',
  uncommon: '#64d278',
  rare: '#5b9bd5',
  epic: '#b57bee',
  legendary: '#feeaa5',
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

  const { data: player } = await supabase
    .from('player')
    .select('player_id, display_name, level, experience_points, created_at')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()
  if (!player) redirect('/play')

  const [
    { data: inventory },
    { data: statusEffects },
    { data: achievements },
    { data: steps },
  ] = await Promise.all([
    supabase
      .from('player_episode_inventory')
      .select('quantity, items ( item_id, name, description, rarity, category, is_consumable )')
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

        {/* Stats */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div>
              <h1 style={{ color: '#feeaa5', fontSize: '1.3rem', letterSpacing: '0.05em', margin: 0 }}>
                {player.display_name}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                Dal {new Date(player.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#feeaa5', fontSize: '1.4rem', fontWeight: 'bold' }}>
                Lv {player.level}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                {player.experience_points} XP
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div style={{
            height: '3px',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (player.experience_points % 1000) / 10)}%`,
              background: '#feeaa5',
              borderRadius: '999px',
              transition: 'width 0.4s',
            }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginTop: '1rem',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {inventory.map((inv) => {
                const item = inv.items as unknown as {
                  item_id: string
                  name: string
                  description: string | null
                  rarity: string
                  category: string | null
                  is_consumable: boolean
                }
                if (!item) return null
                const color = rarityColors[item.rarity] ?? rarityColors.common
                return (
                  <div key={item.item_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${color}22`,
                  }}>
                    <div>
                      <span style={{ color, fontSize: '0.9rem' }}>{item.name}</span>
                      {item.category && (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginLeft: '0.5rem' }}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      ×{inv.quantity}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>
              Nessun oggetto ancora.
            </p>
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
                const ach = pa.achievements as unknown as {
                  name: string
                  description: string | null
                  achievement_type: string
                }
                if (!ach) return null
                return (
                  <div key={pa.unlocked_at} style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <span style={{ color: '#feeaa5', fontSize: '0.85rem' }}>{ach.name}</span>
                      {ach.description && (
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>
                          {ach.description}
                        </p>
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
          <PlayerQRCode
            playerId={player.player_id}
            displayName={player.display_name}
          />
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