import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'

async function createPlayer(formData: FormData) {
  'use server'
  const display_name = formData.get('display_name') as string
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('player').insert({
    user_id: user.id,
    adventure_id: ADVENTURE_ID,
    display_name: display_name.trim(),
  })

  redirect('/play')
}

export default async function PlayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('player')
    .select('player_id, display_name, level, experience_points')
    .eq('user_id', user.id)
    .eq('adventure_id', ADVENTURE_ID)
    .single()

  const { data: episodes } = await supabase
    .from('episodes')
    .select('episode_id, name, start_datetime, physical_location, description')
    .eq('adventure_id', ADVENTURE_ID)
    .eq('is_active', true)
    .eq('is_published', true)
    .order('start_datetime', { ascending: true })

  const styles = `
    .cm-grain {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
      background-repeat: repeat; opacity: 0.6;
    }
    .cm-ep-card {
      position: relative;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      padding: 2rem;
      text-decoration: none;
      color: inherit;
      display: block;
      transition: border-color 0.3s, background 0.3s;
    }
    .cm-ep-card:hover {
      border-color: rgba(254,234,165,0.2);
      background: rgba(254,234,165,0.03);
    }
    .cm-ep-card:hover .cm-ep-arrow {
      opacity: 1;
      transform: translateX(0);
    }
    .cm-ep-arrow {
      opacity: 0;
      transform: translateX(-6px);
      transition: opacity 0.3s, transform 0.3s;
    }
    .cm-input {
      width: 100%;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-bottom-color: rgba(254,234,165,0.3);
      color: #e8e4dc;
      padding: 0.85rem 0.75rem;
      font-family: 'EB Garamond', Georgia, serif;
      font-size: 1.1rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.3s;
    }
    .cm-input:focus {
      border-color: rgba(255,255,255,0.15);
      border-bottom-color: rgba(254,234,165,0.6);
    }
    .cm-input::placeholder { color: rgba(232,228,220,0.25); }
    .cm-submit {
      width: 100%;
      background: transparent;
      border: 1px solid rgba(254,234,165,0.3);
      color: #feeaa5;
      font-family: 'Cinzel', serif;
      font-size: 0.75rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      padding: 1rem;
      cursor: pointer;
      transition: background 0.3s, border-color 0.3s;
    }
    .cm-submit:hover {
      background: rgba(254,234,165,0.07);
      border-color: rgba(254,234,165,0.6);
    }
  `

  return (
    <main style={{ minHeight: '100vh', background: '#090807', color: '#e8e4dc', fontFamily: "'EB Garamond', Georgia, serif", position: 'relative' }}>
      <style>{styles}</style>
      <div className="cm-grain" />

      {/* Background image — faint */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url('https://www.camarcello.it/wp-content/uploads/2020/04/giardino_italiano_villa_veneta_matrimoni.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center 20%',
        filter: 'brightness(0.07) saturate(0.4)',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(9,8,7,0) 0%, #090807 65%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto', padding: '0 1.5rem' }}>

        {!player ? (
          /* ── ONBOARDING ── */
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: '4rem' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.35)', marginBottom: '1.2rem' }}>
                SOGLIA · Interfaccia di Rilevazione Ambientale
              </p>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 'clamp(2rem, 8vw, 3.5rem)', letterSpacing: '0.08em', color: '#feeaa5', marginBottom: '1rem' }}>
                Ca&apos; Marcello
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ height: '1px', width: '40px', background: 'rgba(254,234,165,0.2)' }} />
                <span style={{ color: 'rgba(254,234,165,0.3)', fontSize: '0.65rem' }}>✦</span>
                <div style={{ height: '1px', width: '40px', background: 'rgba(254,234,165,0.2)' }} />
              </div>
              <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '1.05rem', color: 'rgba(232,228,220,0.45)', lineHeight: 1.6 }}>
                Prima di procedere, dichiara la tua identità.<br />
                Gli spiriti della villa devono sapere chi sei.
              </p>
            </div>

            {/* Form */}
            <div style={{ position: 'relative', padding: '2.5rem 2rem', background: 'rgba(254,234,165,0.015)', border: '1px solid rgba(254,234,165,0.08)' }}>
              {/* Corner accents */}
              <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '14px', height: '14px', borderTop: '1px solid rgba(254,234,165,0.4)', borderLeft: '1px solid rgba(254,234,165,0.4)' }} />
              <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '14px', height: '14px', borderTop: '1px solid rgba(254,234,165,0.4)', borderRight: '1px solid rgba(254,234,165,0.4)' }} />
              <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '14px', height: '14px', borderBottom: '1px solid rgba(254,234,165,0.4)', borderLeft: '1px solid rgba(254,234,165,0.4)' }} />
              <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '14px', height: '14px', borderBottom: '1px solid rgba(254,234,165,0.4)', borderRight: '1px solid rgba(254,234,165,0.4)' }} />

              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.3)', marginBottom: '1.5rem', textAlign: 'center' }}>
                NOME DI RICONOSCIMENTO
              </p>

              <form action={createPlayer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  name="display_name"
                  placeholder="Come vuoi essere chiamato?"
                  required
                  autoComplete="off"
                  className="cm-input"
                />
                <button type="submit" className="cm-submit">
                  Dichiara la tua presenza
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', marginTop: '2rem', fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'rgba(232,228,220,0.18)' }}>
              &ldquo;Non fidarti di chi ti ha invitato.&rdquo;
            </p>
          </div>

        ) : (
          /* ── EPISODE LIST ── */
          <div style={{ paddingTop: '3.5rem', paddingBottom: '4rem' }}>

            {/* Player header */}
            <div style={{ marginBottom: '3.5rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.35)', marginBottom: '0.8rem' }}>
                SOGLIA · Interfaccia di Rilevazione Ambientale
              </p>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: '#feeaa5', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                {player.display_name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: 'rgba(254,234,165,0.4)', letterSpacing: '0.1em' }}>
                  LV {player.level}
                </span>
                <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.15)' }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: 'rgba(254,234,165,0.4)', letterSpacing: '0.1em' }}>
                  {player.experience_points} XP
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.25)', whiteSpace: 'nowrap' }}>
                Stagione I — Il Richiamo
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* Episodes */}
            {episodes && episodes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {episodes.map((ep, index) => {
                  const date = ep.start_datetime
                    ? new Date(ep.start_datetime).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
                    : null

                  return (
                    <a key={ep.episode_id} href={`/play/${ep.episode_id}`} className="cm-ep-card">
                      {/* Episode number */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.55rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.3)', marginBottom: '0.5rem' }}>
                            Episodio {String(index + 1).padStart(2, '0')}
                          </p>
                          <h2 style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 'clamp(1rem, 3vw, 1.25rem)', color: '#e8e4dc', letterSpacing: '0.04em', marginBottom: '0.6rem', lineHeight: 1.3 }}>
                            {ep.name}
                          </h2>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center' }}>
                            {ep.physical_location && (
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: 'rgba(232,228,220,0.35)', letterSpacing: '0.05em' }}>
                                ◎ {ep.physical_location}
                              </span>
                            )}
                            {date && (
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: 'rgba(232,228,220,0.35)', letterSpacing: '0.05em' }}>
                                ◷ {date}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="cm-ep-arrow" style={{ paddingTop: '0.2rem', flexShrink: 0 }}>
                          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', color: 'rgba(254,234,165,0.5)' }}>→</span>
                        </div>
                      </div>

                      {/* Gold bottom line on hover via border trick */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(to right, transparent, rgba(254,234,165,0.15), transparent)' }} />
                    </a>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(254,234,165,0.25)', marginBottom: '0.8rem' }}>
                  Nessuna trasmissione attiva
                </p>
                <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.95rem', color: 'rgba(232,228,220,0.3)' }}>
                  Gli spiriti non hanno ancora aperto la soglia.<br />Torna quando la caccia avrà inizio.
                </p>
              </div>
            )}

            {/* Footer note */}
            <p style={{ marginTop: '3rem', textAlign: 'center', fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'rgba(232,228,220,0.18)' }}>
              &ldquo;Sei osservato.&rdquo;
            </p>

          </div>
        )}
      </div>
    </main>
  )
}