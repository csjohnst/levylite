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

// --- Attendance Actions ---

/**
 * List attendees for a meeting, including lot info.
 */
export async function listAttendees(meetingId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: attendees, error } = await supabase
    .from('attendees')
    .select('*, lots:lot_id(id, lot_number)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { data: attendees }
}

/**
 * Mark attendance for a single lot/owner. Uses upsert (unique on meeting_id + lot_id).
 */
export async function markAttendance(
  meetingId: string,
  attendeeData: {
    lot_id: string
    owner_name: string
    attendance_type: string
    represented_by?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!attendeeData.owner_name || attendeeData.owner_name.trim().length === 0) {
    return { error: 'Owner name is required.' }
  }

  if (!['present', 'virtual', 'proxy', 'apology'].includes(attendeeData.attendance_type)) {
    return { error: 'Invalid attendance type. Must be present, virtual, proxy, or apology.' }
  }

  const { data: attendee, error } = await supabase
    .from('attendees')
    .upsert(
      {
        meeting_id: meetingId,
        lot_id: attendeeData.lot_id,
        owner_name: attendeeData.owner_name.trim(),
        attendance_type: attendeeData.attendance_type,
        represented_by: attendeeData.represented_by || null,
        checked_in_at: ['present', 'virtual'].includes(attendeeData.attendance_type)
          ? new Date().toISOString()
          : null,
        created_by: user.id,
      },
      { onConflict: 'meeting_id,lot_id' },
    )
    .select('*, lots:lot_id(id, lot_number)')
    .single()

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', meetingId)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: attendee }
}

/**
 * Bulk mark attendance for multiple lots/owners.
 */
export async function bulkMarkAttendance(
  meetingId: string,
  attendees: {
    lot_id: string
    owner_name: string
    attendance_type: string
    represented_by?: string | null
  }[],
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!attendees || attendees.length === 0) {
    return { error: 'No attendees to mark.' }
  }

  // Validate all entries
  for (const a of attendees) {
    if (!a.owner_name || a.owner_name.trim().length === 0) {
      return { error: 'Owner name is required for all attendees.' }
    }
    if (!['present', 'virtual', 'proxy', 'apology'].includes(a.attendance_type)) {
      return { error: `Invalid attendance type "${a.attendance_type}".` }
    }
  }

  const rows = attendees.map((a) => ({
    meeting_id: meetingId,
    lot_id: a.lot_id,
    owner_name: a.owner_name.trim(),
    attendance_type: a.attendance_type,
    represented_by: a.represented_by || null,
    checked_in_at: ['present', 'virtual'].includes(a.attendance_type)
      ? new Date().toISOString()
      : null,
    created_by: user.id,
  }))

  const { data: inserted, error } = await supabase
    .from('attendees')
    .upsert(rows, { onConflict: 'meeting_id,lot_id' })
    .select('*, lots:lot_id(id, lot_number)')

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', meetingId)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: inserted }
}

/**
 * Remove an attendee record.
 */
export async function removeAttendee(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get meeting_id before deleting
  const { data: attendee, error: fetchError } = await supabase
    .from('attendees')
    .select('meeting_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  const { error } = await supabase
    .from('attendees')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheme_id')
    .eq('id', attendee.meeting_id)
    .single()

  if (meeting) {
    revalidatePath(`/schemes/${meeting.scheme_id}/meetings`)
  }

  return { data: true }
}

/**
 * Get quorum status for a meeting.
 * Returns required count, present count, proxy count, total, and whether quorum is met.
 */
export async function getQuorumStatus(meetingId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get meeting's quorum_required
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('quorum_required')
    .eq('id', meetingId)
    .single()

  if (meetingError) return { error: meetingError.message }

  // Count attendees by type
  const { data: attendees, error: attendeesError } = await supabase
    .from('attendees')
    .select('attendance_type')
    .eq('meeting_id', meetingId)

  if (attendeesError) return { error: attendeesError.message }

  const present = (attendees ?? []).filter(
    (a) => a.attendance_type === 'present' || a.attendance_type === 'virtual',
  ).length
  const proxies = (attendees ?? []).filter(
    (a) => a.attendance_type === 'proxy',
  ).length
  const total = present + proxies
  const required = meeting.quorum_required ?? 0

  return {
    data: {
      required,
      present,
      proxies,
      total,
      met: total >= required,
    },
  }
}
