import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin, is_event_organizer')
    .eq('user_id', user.id)
    .single()

  if (!userData?.is_admin && !userData?.is_event_organizer) redirect('/play')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: '#e8e4dc', fontFamily: 'Georgia, serif' }}>
      {/* Sidebar */}
      <nav style={{
        width: '220px',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: '1.5rem 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#feeaa5', fontSize: '0.85rem', letterSpacing: '0.1em' }}>CA' MARCELLO</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.2rem' }}>Admin</div>
        </div>
        <ul style={{ listStyle: 'none', padding: '1rem 0', margin: 0 }}>
          {[
            { href: '/admin',              label: 'Dashboard' },
            { href: '/admin/episodes',     label: 'Episodi' },
            { href: '/admin/items',        label: 'Oggetti' },
            { href: '/admin/combinations', label: 'Combinazioni' },
            { href: '/admin/markers',      label: 'Marker mappa' },
            { href: '/admin/players',      label: 'Giocatori' },
            { href: '/admin/broadcast',    label: 'Broadcast' },
          ].map(({ href, label }) => (
            <li key={href}>
              <a href={href} style={{
                display: 'block',
                padding: '0.6rem 1.25rem',
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}