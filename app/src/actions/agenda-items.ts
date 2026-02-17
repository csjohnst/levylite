'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Auth helper ---

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

// --- Agenda Item Actions ---

/**
 * List agenda items for a meeting, ordered by item_number.
 */
export async function listAgendaItems(meetingId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: items, error } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_number', { ascending: true })

  if (error) return { error: error.message }
  return { data: items }
}

/**
 * Create a single agenda item for a meeting.
 */
export async function createAgendaItem(
  meetingId: string,
  data: {
    title: string
    description?: string | null
    item_type: string
    motion_type?: string | null
    estimated_cost?: number | null
    is_required?: boolean
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!data.title || data.title.trim().length === 0) {
    return { error: 'Title is required.' }
  }

  if (!['procedural', 'standard', 'motion', 'discussion'].includes(data.item_type)) {
    return { error: 'Invalid item type. Must be procedural, standard, motion, or discussion.' }
  }

  if (data.motion_type && !['ordinary', 'special', 'unanimous'].includes(data.motion_type)) {
    return { error: 'Invalid motion type. Must be ordinary, special, or unanimous.' }
  }

  // Get next item_number
  const { data: existing, error: countError } = await supabase
    .from('agenda_items')
    .select('item_number')
    .eq('meeting_id', meetingId)
    .order('item_number', { ascending: false })
    .limit(1)

  if (countError) return { error: countError.message }

  const nextNumber = existing && existing.length > 0 ? existing[0].item_number + 1 : 1

  const { data: item, error: insertError } = await supabase
    .from('agenda_items')
    .insert({
      meeting_id: meetingId,
      item_number: nextNumber,
      title: data.title.trim(),
      description: data.description || null,
      item_type: data.item_type,
      motion_type: data.motion_type || null,
      estimated_cost: data.estimated_cost ?? null,
      is_required: data.is_required ?? false,
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Get scheme_id from meeting for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', meetingId)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: item }
}

/**
 * Update an agenda item's details.
 */
export async function updateAgendaItem(
  id: string,
  data: {
    title?: string
    description?: string | null
    item_type?: string
    motion_type?: string | null
    estimated_cost?: number | null
    is_required?: boolean
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (data.title !== undefined && data.title.trim().length === 0) {
    return { error: 'Title cannot be empty.' }
  }

  if (data.item_type && !['procedural', 'standard', 'motion', 'discussion'].includes(data.item_type)) {
    return { error: 'Invalid item type.' }
  }

  if (data.motion_type && !['ordinary', 'special', 'unanimous'].includes(data.motion_type)) {
    return { error: 'Invalid motion type.' }
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.title !== undefined) updatePayload.title = data.title.trim()
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.item_type !== undefined) updatePayload.item_type = data.item_type
  if (data.motion_type !== undefined) updatePayload.motion_type = data.motion_type
  if (data.estimated_cost !== undefined) updatePayload.estimated_cost = data.estimated_cost
  if (data.is_required !== undefined) updatePayload.is_required = data.is_required

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: item, error } = await supabase
    .from('agenda_items')
    .update(updatePayload)
    .eq('id', id)
    .select('*, meetings:meeting_id(scheme_id)')
    .single()

  if (error) return { error: error.message }

  const schemeId = (item.meetings as { scheme_id: string } | null)?.scheme_id
  if (schemeId) {
    revalidatePath(`/schemes/${schemeId}/meetings`)
  }

  return { data: item }
}

/**
 * Delete an agenda item. Returns error if the item is required.
 */
export async function deleteAgendaItem(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check if required
  const { data: item, error: fetchError } = await supabase
    .from('agenda_items')
    .select('is_required, meeting_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  if (item.is_required) {
    return { error: 'Cannot delete a required agenda item.' }
  }

  const { error } = await supabase
    .from('agenda_items')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', item.meeting_id)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: true }
}

/**
 * Bulk reorder agenda items by updating their item_numbers.
 */
export async function reorderAgendaItems(
  meetingId: string,
  items: { id: string; item_number: number }[],
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (!items || items.length === 0) {
    return { error: 'No items to reorder.' }
  }

  // Update each item's item_number
  for (const item of items) {
    const { error } = await supabase
      .from('agenda_items')
      .update({ item_number: item.item_number })
      .eq('id', item.id)
      .eq('meeting_id', meetingId)

    if (error) return { error: `Failed to reorder item: ${error.message}` }
  }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', meetingId)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: true }
}

/**
 * Seed standard agenda items for a meeting based on meeting type.
 * AGM: 8 items (Welcome, Quorum, Previous Minutes, Correspondence, Financial Reports, Budget Setting, Election of Council, General Business)
 * SGM: 3 items (Welcome, Quorum, Previous Minutes)
 * Committee: 2 items (Welcome, Quorum)
 */
export async function seedStandardAgenda(meetingId: string, meetingType: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  type AgendaTemplate = {
    item_number: number
    title: string
    item_type: string
    is_required: boolean
  }

  const agmItems: AgendaTemplate[] = [
    { item_number: 1, title: 'Welcome and Apologies', item_type: 'procedural', is_required: true },
    { item_number: 2, title: 'Confirmation of Quorum', item_type: 'procedural', is_required: true },
    { item_number: 3, title: 'Confirmation of Previous Minutes', item_type: 'procedural', is_required: true },
    { item_number: 4, title: 'Correspondence', item_type: 'procedural', is_required: false },
    { item_number: 5, title: 'Financial Reports', item_type: 'standard', is_required: true },
    { item_number: 6, title: 'Budget Setting', item_type: 'standard', is_required: true },
    { item_number: 7, title: 'Election of Council', item_type: 'standard', is_required: true },
    { item_number: 8, title: 'General Business', item_type: 'discussion', is_required: false },
  ]

  const sgmItems: AgendaTemplate[] = agmItems.slice(0, 3) // Welcome, Quorum, Previous Minutes
  const committeeItems: AgendaTemplate[] = agmItems.slice(0, 2) // Welcome, Quorum

  let templates: AgendaTemplate[]
  switch (meetingType) {
    case 'agm':
      templates = agmItems
      break
    case 'sgm':
      templates = sgmItems
      break
    case 'committee':
      templates = committeeItems
      break
    default:
      return { error: `Invalid meeting type: ${meetingType}` }
  }

  const rows = templates.map((t) => ({
    meeting_id: meetingId,
    item_number: t.item_number,
    title: t.title,
    item_type: t.item_type,
    is_required: t.is_required,
    created_by: user.id,
  }))

  const { data: items, error } = await supabase
    .from('agenda_items')
    .insert(rows)
    .select()

  if (error) return { error: error.message }
  return { data: items }
}
