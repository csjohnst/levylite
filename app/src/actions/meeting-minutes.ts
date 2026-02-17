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

// --- Minutes Actions ---

/**
 * Get the latest minutes record for a meeting.
 */
export async function getMinutes(meetingId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: minutes, error } = await supabase
    .from('minutes')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data: minutes }
}

/**
 * Auto-generate minutes from meeting data.
 * Pulls meeting details, attendance, agenda items, and resolutions
 * into a structured JSONB content field.
 */
export async function generateMinutes(meetingId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Pull meeting details
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*, schemes:scheme_id(id, scheme_name)')
    .eq('id', meetingId)
    .single()

  if (meetingError) return { error: meetingError.message }

  // Pull attendance list
  const { data: attendees, error: attendeesError } = await supabase
    .from('attendees')
    .select('*, lots:lot_id(id, lot_number)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  if (attendeesError) return { error: attendeesError.message }

  // Pull agenda items
  const { data: agendaItems, error: agendaError } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_number', { ascending: true })

  if (agendaError) return { error: agendaError.message }

  // Pull resolutions with vote counts
  const { data: resolutions, error: resolutionsError } = await supabase
    .from('resolutions')
    .select('*, agenda_items:agenda_item_id(id, title)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  if (resolutionsError) return { error: resolutionsError.message }

  // Count attendance types
  const present = (attendees ?? []).filter(
    (a) => a.attendance_type === 'present' || a.attendance_type === 'virtual',
  )
  const proxies = (attendees ?? []).filter((a) => a.attendance_type === 'proxy')
  const apologies = (attendees ?? []).filter((a) => a.attendance_type === 'apology')

  // Build structured JSONB content
  const content = {
    meeting: {
      id: meeting.id,
      scheme_name: (meeting.schemes as { scheme_name: string } | null)?.scheme_name ?? '',
      meeting_type: meeting.meeting_type,
      meeting_date: meeting.meeting_date,
      location: meeting.location,
      location_virtual: meeting.location_virtual,
      quorum_required: meeting.quorum_required,
      quorum_met: meeting.quorum_met,
    },
    attendance: {
      present: present.map((a) => ({
        owner_name: a.owner_name,
        lot_number: (a.lots as { lot_number: string } | null)?.lot_number ?? '',
        attendance_type: a.attendance_type,
      })),
      proxies: proxies.map((a) => ({
        owner_name: a.owner_name,
        lot_number: (a.lots as { lot_number: string } | null)?.lot_number ?? '',
        represented_by: a.represented_by,
      })),
      apologies: apologies.map((a) => ({
        owner_name: a.owner_name,
        lot_number: (a.lots as { lot_number: string } | null)?.lot_number ?? '',
      })),
      total_present: present.length,
      total_proxies: proxies.length,
      total: present.length + proxies.length,
    },
    agenda_items: (agendaItems ?? []).map((item) => ({
      item_number: item.item_number,
      title: item.title,
      description: item.description,
      item_type: item.item_type,
    })),
    resolutions: (resolutions ?? []).map((res) => ({
      resolution_number: res.resolution_number,
      motion_text: res.motion_text,
      resolution_type: res.resolution_type,
      moved_by: res.moved_by,
      seconded_by: res.seconded_by,
      votes_for: res.votes_for,
      votes_against: res.votes_against,
      votes_abstain: res.votes_abstain,
      result: res.result,
      result_percentage: res.result_percentage,
      discussion_notes: res.discussion_notes,
      agenda_item_title: (res.agenda_items as { title: string } | null)?.title ?? null,
    })),
  }

  // Create minutes record
  const { data: minutes, error: insertError } = await supabase
    .from('minutes')
    .insert({
      meeting_id: meetingId,
      content,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  return { data: minutes }
}

/**
 * Update minutes content and/or status.
 */
export async function updateMinutes(
  id: string,
  data: {
    content?: Record<string, unknown>
    status?: string
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (data.status && !['draft', 'manager_reviewed', 'approved', 'published'].includes(data.status)) {
    return { error: 'Invalid minutes status.' }
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.content !== undefined) updatePayload.content = data.content
  if (data.status !== undefined) updatePayload.status = data.status

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: minutes, error } = await supabase
    .from('minutes')
    .update(updatePayload)
    .eq('id', id)
    .select('*, meetings:meeting_id(scheme_id)')
    .single()

  if (error) return { error: error.message }

  const schemeId = (minutes.meetings as { scheme_id: string } | null)?.scheme_id
  if (schemeId) {
    revalidatePath(`/schemes/${schemeId}/meetings`)
  }

  return { data: minutes }
}

/**
 * Advance minutes through the review/approval workflow.
 * draft -> manager_reviewed -> approved -> published
 * Sets appropriate timestamps and user references.
 */
export async function advanceMinutesStatus(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Get current minutes
  const { data: current, error: fetchError } = await supabase
    .from('minutes')
    .select('status, meeting_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {}

  switch (current.status) {
    case 'draft':
      updatePayload.status = 'manager_reviewed'
      updatePayload.reviewed_by = user.id
      updatePayload.reviewed_at = now
      break
    case 'manager_reviewed':
      updatePayload.status = 'approved'
      updatePayload.approved_by = user.id
      updatePayload.approved_at = now
      break
    case 'approved':
      updatePayload.status = 'published'
      updatePayload.published_at = now
      break
    default:
      return { error: `Cannot advance minutes from status "${current.status}".` }
  }

  const { data: minutes, error } = await supabase
    .from('minutes')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', current.meeting_id)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: minutes }
}
