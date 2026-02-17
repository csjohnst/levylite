'use server'

import { createClient } from '@/lib/supabase/server'

async function getOwnerAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: owner, error } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email, portal_user_id')
    .eq('portal_user_id', user.id)
    .single()

  if (error || !owner) return { error: 'Not an owner' as const }
  return { user, owner, supabase }
}

/**
 * Get meetings for the owner's schemes.
 * Only shows meetings with status: scheduled, notice_sent, in_progress, or completed.
 * Upcoming meetings (future) sorted ascending, past meetings sorted descending.
 */
export async function getOwnerMeetings() {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Get owner's scheme IDs
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lots(scheme_id)')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const schemeIds = [
    ...new Set(
      ownerships
        ?.map(o => {
          const lot = o.lots as unknown as { scheme_id: string }
          return lot?.scheme_id
        })
        .filter(Boolean) ?? []
    ),
  ]

  if (schemeIds.length === 0) return { data: { upcoming: [], past: [] } }

  // RLS owner_select policy enforces status IN ('scheduled', 'notice_sent', 'in_progress', 'completed')
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, meeting_type, meeting_date, location, location_virtual, status, schemes:scheme_id(id, scheme_name)')
    .in('scheme_id', schemeIds)
    .in('status', ['scheduled', 'notice_sent', 'in_progress', 'completed'])
    .order('meeting_date', { ascending: false })

  if (error) return { error: error.message }

  const now = new Date().toISOString()
  const upcoming = (meetings ?? [])
    .filter(m => m.meeting_date >= now)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))

  const past = (meetings ?? [])
    .filter(m => m.meeting_date < now)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))

  return { data: { upcoming, past } }
}

/**
 * Get detailed meeting information including agenda, resolutions, and published minutes.
 * Verifies the meeting is in one of the owner's schemes.
 */
export async function getOwnerMeetingDetail(meetingId: string) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // RLS enforces access, but we also verify explicitly
  const { data: meeting, error } = await supabase
    .from('meetings')
    .select(`
      id, meeting_type, meeting_date, location, location_virtual,
      status, notice_period_days, quorum_required, quorum_met, notes,
      schemes:scheme_id(id, scheme_name)
    `)
    .eq('id', meetingId)
    .single()

  if (error) return { error: 'Meeting not found or access denied' }

  // Verify the meeting is in one of the owner's schemes
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lots(scheme_id)')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const ownerSchemeIds = new Set(
    ownerships?.map(o => {
      const lot = o.lots as unknown as { scheme_id: string }
      return lot?.scheme_id
    }).filter(Boolean) ?? []
  )

  const meetingSchemeId = (meeting.schemes as unknown as { id: string })?.id
  if (!meetingSchemeId || !ownerSchemeIds.has(meetingSchemeId)) {
    return { error: 'Access denied' }
  }

  // Get agenda items
  const { data: agendaItems } = await supabase
    .from('agenda_items')
    .select('id, item_number, title, description, item_type, motion_type, estimated_cost')
    .eq('meeting_id', meetingId)
    .order('item_number', { ascending: true })

  // Get resolutions (for completed meetings)
  const { data: resolutions } = await supabase
    .from('resolutions')
    .select(`
      id, resolution_number, motion_text, resolution_type,
      moved_by, seconded_by, votes_for, votes_against, votes_abstain,
      result, result_percentage, discussion_notes
    `)
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })

  // Get published minutes only
  const { data: minutes } = await supabase
    .from('minutes')
    .select('id, content, status, published_at')
    .eq('meeting_id', meetingId)
    .eq('status', 'published')
    .maybeSingle()

  return {
    data: {
      ...meeting,
      agenda_items: agendaItems ?? [],
      resolutions: resolutions ?? [],
      minutes: minutes ?? null,
    },
  }
}
