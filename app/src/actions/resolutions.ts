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

// --- Helper: calculate resolution result ---

function calculateResult(
  resolutionType: string,
  votesFor: number,
  votesAgainst: number,
  votesAbstain: number,
): { result: string; result_percentage: number | null } {
  const totalVotesCast = votesFor + votesAgainst
  const result_percentage =
    totalVotesCast > 0
      ? Math.round((votesFor / totalVotesCast) * 10000) / 100
      : null

  let result: string

  switch (resolutionType) {
    case 'ordinary':
      result = votesFor > votesAgainst ? 'carried' : 'defeated'
      break
    case 'special':
      result =
        totalVotesCast > 0 && votesFor / totalVotesCast >= 0.75
          ? 'carried'
          : 'defeated'
      break
    case 'unanimous':
      result =
        votesAgainst === 0 && votesAbstain === 0 && votesFor > 0
          ? 'carried'
          : 'defeated'
      break
    default:
      result = 'defeated'
  }

  return { result, result_percentage }
}

// --- Resolution Actions ---

/**
 * List resolutions for a meeting, including linked agenda item title.
 */
export async function listResolutions(meetingId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: resolutions, error } = await supabase
    .from('resolutions')
    .select('*, agenda_items:agenda_item_id(id, title)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { data: resolutions }
}

/**
 * Create a resolution with auto-calculated result and resolution_number.
 */
export async function createResolution(
  meetingId: string,
  data: {
    agenda_item_id?: string | null
    motion_text: string
    resolution_type: string
    moved_by?: string | null
    seconded_by?: string | null
    votes_for: number
    votes_against: number
    votes_abstain: number
    discussion_notes?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!data.motion_text || data.motion_text.trim().length === 0) {
    return { error: 'Motion text is required.' }
  }

  if (!['ordinary', 'special', 'unanimous'].includes(data.resolution_type)) {
    return { error: 'Invalid resolution type. Must be ordinary, special, or unanimous.' }
  }

  if (data.votes_for < 0 || data.votes_against < 0 || data.votes_abstain < 0) {
    return { error: 'Vote counts cannot be negative.' }
  }

  // Auto-calculate result
  const { result: calcResult, result_percentage } = calculateResult(
    data.resolution_type,
    data.votes_for,
    data.votes_against,
    data.votes_abstain,
  )

  // Auto-generate resolution_number: "{MEETING_TYPE}-{YEAR}-{SEQ}"
  // Get meeting type and year
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('meeting_type, meeting_date, scheme_id')
    .eq('id', meetingId)
    .single()

  if (meetingError) return { error: meetingError.message }

  const meetingYear = new Date(meeting.meeting_date).getFullYear()
  const typePrefix = meeting.meeting_type.toUpperCase()

  // Count existing resolutions for this meeting to get next sequence number
  const { count: existingCount, error: countError } = await supabase
    .from('resolutions')
    .select('id', { count: 'exact', head: true })
    .eq('meeting_id', meetingId)

  if (countError) return { error: countError.message }

  const seq = String((existingCount ?? 0) + 1).padStart(2, '0')
  const resolution_number = `${typePrefix}-${meetingYear}-${seq}`

  const { data: resolution, error: insertError } = await supabase
    .from('resolutions')
    .insert({
      meeting_id: meetingId,
      agenda_item_id: data.agenda_item_id || null,
      resolution_number,
      motion_text: data.motion_text.trim(),
      resolution_type: data.resolution_type,
      moved_by: data.moved_by || null,
      seconded_by: data.seconded_by || null,
      votes_for: data.votes_for,
      votes_against: data.votes_against,
      votes_abstain: data.votes_abstain,
      result: calcResult,
      result_percentage,
      discussion_notes: data.discussion_notes || null,
      created_by: user.id,
    })
    .select('*, agenda_items:agenda_item_id(id, title)')
    .single()

  if (insertError) return { error: insertError.message }

  revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  return { data: resolution }
}

/**
 * Update a resolution. Recalculates result if votes change.
 */
export async function updateResolution(
  id: string,
  data: {
    agenda_item_id?: string | null
    motion_text?: string
    resolution_type?: string
    moved_by?: string | null
    seconded_by?: string | null
    votes_for?: number
    votes_against?: number
    votes_abstain?: number
    discussion_notes?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (data.motion_text !== undefined && data.motion_text.trim().length === 0) {
    return { error: 'Motion text cannot be empty.' }
  }

  if (data.resolution_type && !['ordinary', 'special', 'unanimous'].includes(data.resolution_type)) {
    return { error: 'Invalid resolution type.' }
  }

  // Get current resolution to merge vote values for recalculation
  const { data: current, error: fetchError } = await supabase
    .from('resolutions')
    .select('*, meetings:meeting_id(scheme_id)')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  const updatePayload: Record<string, unknown> = {}
  if (data.agenda_item_id !== undefined) updatePayload.agenda_item_id = data.agenda_item_id
  if (data.motion_text !== undefined) updatePayload.motion_text = data.motion_text.trim()
  if (data.resolution_type !== undefined) updatePayload.resolution_type = data.resolution_type
  if (data.moved_by !== undefined) updatePayload.moved_by = data.moved_by
  if (data.seconded_by !== undefined) updatePayload.seconded_by = data.seconded_by
  if (data.votes_for !== undefined) updatePayload.votes_for = data.votes_for
  if (data.votes_against !== undefined) updatePayload.votes_against = data.votes_against
  if (data.votes_abstain !== undefined) updatePayload.votes_abstain = data.votes_abstain
  if (data.discussion_notes !== undefined) updatePayload.discussion_notes = data.discussion_notes

  // If any vote or type changed, recalculate result
  const votesChanged =
    data.votes_for !== undefined ||
    data.votes_against !== undefined ||
    data.votes_abstain !== undefined ||
    data.resolution_type !== undefined

  if (votesChanged) {
    const finalType = data.resolution_type ?? current.resolution_type
    const finalFor = data.votes_for ?? current.votes_for
    const finalAgainst = data.votes_against ?? current.votes_against
    const finalAbstain = data.votes_abstain ?? current.votes_abstain

    const { result: calcResult, result_percentage } = calculateResult(
      finalType,
      finalFor,
      finalAgainst,
      finalAbstain,
    )

    updatePayload.result = calcResult
    updatePayload.result_percentage = result_percentage
  }

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: resolution, error } = await supabase
    .from('resolutions')
    .update(updatePayload)
    .eq('id', id)
    .select('*, agenda_items:agenda_item_id(id, title)')
    .single()

  if (error) return { error: error.message }

  const schemeId = (current.meetings as { scheme_id: string } | null)?.scheme_id
  if (schemeId) {
    revalidatePath(`/schemes/${schemeId}/meetings`)
  }

  return { data: resolution }
}

/**
 * Delete a resolution.
 */
export async function deleteResolution(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get meeting_id for revalidation
  const { data: resolution, error: fetchError } = await supabase
    .from('resolutions')
    .select('meeting_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  const { error } = await supabase
    .from('resolutions')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', resolution.meeting_id)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: true }
}
