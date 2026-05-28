import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from '@/components/AdminNav'

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
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#e8e4dc',
      fontFamily: 'Georgia, serif',
    }}>
      <AdminNav />

      {/* Main — top padding on mobile to clear fixed top bar */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }} className="admin-main">
        {children}
      </main>

      <style>{`
        @media (max-width: 767px) {
          .admin-main {
            padding-top: calc(52px + 1.25rem) !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}