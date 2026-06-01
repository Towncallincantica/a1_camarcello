import { createClient } from '@/lib/supabase/server'
import { createPlayerForUser } from '@/lib/player/createPlayer'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  }

  try {
    await createPlayerForUser(supabase, user.id, formData.get('display_name'))
  } catch {
    // Nome non valido → torna all'onboarding
    return NextResponse.redirect(new URL('/play', request.url), { status: 303 })
  }

  return NextResponse.redirect(new URL('/play', request.url), { status: 303 })
}