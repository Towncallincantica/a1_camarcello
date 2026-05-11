import { createClient } from '@/lib/supabase/server'
import { ADVENTURE_ID } from '@/lib/constants'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const display_name = formData.get('display_name') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  await supabase.from('player').insert({
    user_id: user.id,
    adventure_id: ADVENTURE_ID,
    display_name: display_name.trim(),
  })

  return NextResponse.redirect(new URL('/play', request.url))
}