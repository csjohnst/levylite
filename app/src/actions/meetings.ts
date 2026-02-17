'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { seedStandardAgenda } from './agenda-items'

// --- Auth helper ---

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

// --- Meeting Actions ---

/**
 * List meetings with optional filters. Includes scheme name via join.
 */
export async function listMeetings(
  schemeId?: string,
  filters?: {
    meeting_type?: string
    status?: string
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  let query = supabase
    .from('meetings')
    .select('*, schemes:scheme_id(id, name)')
    .order('meeting_date', { ascending: false })

  if (schemeId) {
    query = query.eq('scheme_id', schemeId)
  }

  if (filters?.meeting_type) {
    query = query.eq('meeting_type', filters.meeting_type)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data: meetings, error } = await query

  if (error) return { error: error.message }
  return { data: meetings }
}

/**
 * Get a single meeting with related counts and scheme info.
 */
export async function getMeeting(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: meeting, error } = await supabase
    .from('meetings')
    .select(`
      *,
      schemes:scheme_id(id, name),
      agenda_items(count),
      attendees(count),
      resolutions(count),
      minutes(id, status)
    `)
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: meeting }
}

/**
 * Create a new meeting with auto-calculated notice period and quorum.
 * For AGM meetings, auto-seeds standard agenda items.
 */
export async function createMeeting(
  schemeId: string,
  data: {
    meeting_type: string
    meeting_date: string
    location?: string | null
    location_virtual?: string | null
    notes?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Validate meeting_type
  if (!['agm', 'sgm', 'committee'].includes(data.meeting_type)) {
    return { error: 'Invalid meeting type. Must be agm, sgm, or committee.' }
  }

  if (!data.meeting_date) {
    return { error: 'Meeting date is required.' }
  }

  // Auto-set notice_period_days based on meeting type
  const noticePeriodMap: Record<string, number> = {
    agm: 21,
    sgm: 14,
    committee: 7,
  }
  const notice_period_days = noticePeriodMap[data.meeting_type]

  // Auto-calculate quorum_required: 30% of lot count, rounded up, minimum 2
  const { count: lotCount, error: lotError } = await supabase
    .from('lots')
    .select('id', { count: 'exact', head: true })
    .eq('scheme_id', schemeId)

  if (lotError) return { error: `Failed to query lots: ${lotError.message}` }

  const quorum_required = Math.max(2, Math.ceil((lotCount ?? 0) * 0.3))

  const { data: meeting, error: insertError } = await supabase
    .from('meetings')
    .insert({
      scheme_id: schemeId,
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date,
      location: data.location || null,
      location_virtual: data.location_virtual || null,
      notes: data.notes || null,
      notice_period_days,
      quorum_required,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Auto-seed standard agenda items for AGM
  if (data.meeting_type === 'agm') {
    await seedStandardAgenda(meeting.id, 'agm')
  }

  revalidatePath(`/schemes/${schemeId}/meetings`)
  return { data: meeting }
}

/**
 * Update meeting fields including status transitions.
 */
export async function updateMeeting(
  id: string,
  data: {
    meeting_type?: string
    meeting_date?: string
    location?: string | null
    location_virtual?: string | null
    notes?: string | null
    status?: string
    quorum_met?: boolean
    is_adjourned?: boolean
    adjourned_from_meeting_id?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (data.meeting_type && !['agm', 'sgm', 'committee'].includes(data.meeting_type)) {
    return { error: 'Invalid meeting type. Must be agm, sgm, or committee.' }
  }

  if (data.status && !['draft', 'scheduled', 'notice_sent', 'in_progress', 'completed', 'adjourned', 'cancelled'].includes(data.status)) {
    return { error: 'Invalid meeting status.' }
  }

  // Build update payload (only include provided fields)
  const updatePayload: Record<string, unknown> = {}
  if (data.meeting_type !== undefined) updatePayload.meeting_type = data.meeting_type
  if (data.meeting_date !== undefined) updatePayload.meeting_date = data.meeting_date
  if (data.location !== undefined) updatePayload.location = data.location
  if (data.location_virtual !== undefined) updatePayload.location_virtual = data.location_virtual
  if (data.notes !== undefined) updatePayload.notes = data.notes
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.quorum_met !== undefined) updatePayload.quorum_met = data.quorum_met
  if (data.is_adjourned !== undefined) updatePayload.is_adjourned = data.is_adjourned
  if (data.adjourned_from_meeting_id !== undefined) updatePayload.adjourned_from_meeting_id = data.adjourned_from_meeting_id

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update(updatePayload)
    .eq('id', id)
    .select('*, schemes:scheme_id(id, name)')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  return { data: meeting }
}

/**
 * Delete a meeting. Only allowed if status is 'draft'.
 */
export async function deleteMeeting(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check current status
  const { data: current, error: fetchError } = await supabase
    .from('meetings')
    .select('status, scheme_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  if (current.status !== 'draft') {
    return { error: `Cannot delete a meeting with status "${current.status}". Only draft meetings can be deleted.` }
  }

  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/schemes/${current.scheme_id}/meetings`)
  return { data: true }
}
