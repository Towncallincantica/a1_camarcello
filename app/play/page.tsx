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
    .select('episode_id, name, start_datetime, physical_location')
    .eq('adventure_id', ADVENTURE_ID)
    .eq('is_active', true)
    .eq('is_published', true)
    .order('start_datetime', { ascending: true })

  return (
    <main style={{
      minHeight: '100vh',
      background: '#090807',
      color: '#e8e4dc',
      padding: '2rem',
      fontFamily: 'serif',
    }}>
      {!player ? (
        <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '4rem' }}>
          <h1 style={{ color: '#feeaa5', marginBottom: '0.5rem' }}>Ca&apos; Marcello</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
            Scegli il tuo nome nell&apos;avventura.
          </p>
          <form action={createPlayer}>
            <input
              type="text"
              name="display_name"
              placeholder="Il tuo nome"
              required
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#e8e4dc',
                padding: '0.75rem',
                fontSize: '1rem',
                marginBottom: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <button type="submit" style={{
              width: '100%',
              background: 'rgba(254,234,165,0.1)',
              border: '1px solid #feeaa5',
              color: '#feeaa5',
              padding: '0.75rem',
              fontSize: '1rem',
              cursor: 'pointer',
            }}>
              Entra
            </button>
          </form>
        </div>
      ) : (
        <div>
          <h1 style={{ color: '#feeaa5', marginBottom: '0.5rem' }}>
            Benvenuto, {player.display_name}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
            Livello {player.level} · {player.experience_points} XP
          </p>
          <h2 style={{ color: '#feeaa5', fontSize: '1rem', letterSpacing: '0.1em' }}>
            EPISODI
          </h2>
          {episodes && episodes.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
              {episodes.map((ep) => (
                <li key={ep.episode_id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  padding: '1rem',
                  marginBottom: '0.75rem',
                }}>
                  <a href={`/play/${ep.episode_id}`} style={{ color: '#feeaa5', textDecoration: 'none' }}>
                    {ep.name}
                  </a>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                    {ep.physical_location} · {ep.start_datetime ? new Date(ep.start_datetime).toLocaleDateString('it-IT') : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Nessun episodio disponibile.</p>
          )}
        </div>
      )}
    </main>
  )
}