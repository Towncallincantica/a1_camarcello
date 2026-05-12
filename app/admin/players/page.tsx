import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'

export default async function PlayersPage() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('player')
    .select(`
      player_id,
      display_name,
      level,
      experience_points,
      created_at,
      users (
        email
      ),
      player_episode_stats (
        episode_id,
        created_at,
        episodes (
          name
        )
      )
    `)
    .eq('adventure_id', ADVENTURE_ID)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Players</h2>
        <span className="text-sm text-gray-400">{players?.length ?? 0} registered</span>
      </div>

      {players && players.length > 0 ? (
        <div className="space-y-3">
          {players.map((p) => {
            const episodes = p.player_episode_stats ?? []
            return (
              <div key={p.player_id} className="bg-gray-900 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <p className="font-medium text-white">{p.display_name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300">
                        Lv {p.level}
                      </span>
                      <span className="text-xs text-gray-500">{p.experience_points} xp</span>
                    </div>

                    {/* Email */}
                    {p.users && (
                      <p className="text-xs text-gray-500 mb-2">
                        {(p.users as unknown as { email: string }).email}
                      </p>
                    )}

                    {/* Episodes joined */}
                    {episodes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {episodes.map((stat) => (
                          <span
                            key={stat.episode_id}
                            className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                          >
                            {(stat.episodes as unknown as { name: string } | null)?.name ?? stat.episode_id}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Meta */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-600">
                      {new Date(p.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-700 font-mono mt-1 truncate max-w-[140px]">
                      {p.player_id}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl p-12 text-center">
          <p className="text-gray-400">No players yet.</p>
        </div>
      )}
    </div>
  )
}