'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── NODE ──────────────────────────────────────────────────────

export async function updateNode(
  episodeId: string,
  nodeId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('content_nodes')
    .update({
      name: formData.get('name') as string,
      node_category: formData.get('node_category') as string,
      content_html: formData.get('content_html') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('node_id', nodeId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}

export async function deleteNode(episodeId: string, nodeId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('content_nodes')
    .delete()
    .eq('node_id', nodeId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor`)
  redirect(`/admin/episodes/${episodeId}/editor`)
}

// ── CONDITIONS ────────────────────────────────────────────────

export async function createCondition(
  episodeId: string,
  nodeId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const type = formData.get('type') as string

  let payload: Record<string, unknown> = {}

  if (type === 'progress_item') {
    payload = { progress_item_id: formData.get('progress_item_id') }
  } else if (type === 'target_completed') {
    payload = { target_id: formData.get('target_id') }
  } else if (type === 'gps_location') {
    payload = {
      lat: parseFloat(formData.get('lat') as string),
      lng: parseFloat(formData.get('lng') as string),
      radius_meters: parseInt(formData.get('radius_meters') as string, 10),
    }
  }

  const { error } = await supabase.from('conditions').insert({
    node_id: nodeId,
    episode_id: episodeId,
    type,
    payload,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}

export async function deleteCondition(
  episodeId: string,
  nodeId: string,
  conditionId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('conditions')
    .delete()
    .eq('condition_id', conditionId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}

// ── TARGETS ───────────────────────────────────────────────────

export async function createTarget(
  episodeId: string,
  nodeId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const type = formData.get('type') as string

  let payload: Record<string, unknown> = {}

  if (type === 'qr_scan') {
    payload = { qr_code: formData.get('qr_code') }
  } else if (type === 'code_entry') {
    payload = { code: formData.get('code') }
  } else if (type === 'gps_location') {
    payload = {
      lat: parseFloat(formData.get('lat') as string),
      lng: parseFloat(formData.get('lng') as string),
      radius_meters: parseInt(formData.get('radius_meters') as string, 10),
    }
  } else if (type === 'claim_item') {
    payload = {
      item_id: formData.get('item_id'),
      quantity: parseInt(formData.get('quantity') as string, 10) || 1,
    }
  }

  const { error } = await supabase.from('targets').insert({
    node_id: nodeId,
    episode_id: episodeId,
    type,
    payload,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}

export async function deleteTarget(
  episodeId: string,
  nodeId: string,
  targetId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('targets')
    .delete()
    .eq('target_id', targetId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}

// ── EFFECTS ───────────────────────────────────────────────────

export async function createEffect(
  episodeId: string,
  nodeId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const type = formData.get('type') as string

  let payload: Record<string, unknown> = {}

  if (type === 'give_item') {
    payload = {
      item_id: formData.get('item_id'),
      quantity: parseInt(formData.get('quantity') as string, 10) || 1,
    }
  } else if (type === 'give_xp') {
    payload = { amount: parseInt(formData.get('amount') as string, 10) }
  } else if (type === 'give_status') {
    payload = {
      status_type: formData.get('status_type'),
      duration_minutes: parseInt(formData.get('duration_minutes') as string, 10) || null,
    }
  } else if (type === 'give_progress_item') {
    payload = { progress_item_id: formData.get('progress_item_id') }
  }

  const { error } = await supabase.from('effects').insert({
    node_id: nodeId,
    episode_id: episodeId,
    type,
    payload,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}

export async function deleteEffect(
  episodeId: string,
  nodeId: string,
  effectId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('effects')
    .delete()
    .eq('effect_id', effectId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/episodes/${episodeId}/editor/${nodeId}`)
}