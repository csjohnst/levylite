import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MeetingTypeBadge } from '@/components/meetings/meeting-type-badge'
import { MeetingStatusBadge } from '@/components/meetings/meeting-status-badge'
import { AgendaBuilder } from '@/components/meetings/agenda-builder'
import { AttendanceTracker } from '@/components/meetings/attendance-tracker'
import { ResolutionList } from '@/components/meetings/resolution-list'
import { ResolutionFormWrapper } from '@/components/meetings/resolution-form-wrapper'
import { MinutesViewer } from '@/components/meetings/minutes-viewer'
import { MeetingStatusActions } from '@/components/meetings/meeting-status-actions'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>
}) {
  const { id, meetingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (!meeting) notFound()

  // Fetch all related data in parallel
  const [
    { data: agendaItems },
    { data: attendees },
    { data: resolutions },
    { data: minutes },
    { data: lots },
  ] = await Promise.all([
    supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('item_number'),
    supabase
      .from('attendees')
      .select('*')
      .eq('meeting_id', meetingId),
    supabase
      .from('resolutions')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at'),
    supabase
      .from('minutes')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('lots')
      .select('id, lot_number, unit_entitlement')
      .eq('scheme_id', id)
      .eq('status', 'active')
      .order('lot_number'),
  ])

  // Get owner names for lots via lot_ownerships
  const lotIds = (lots ?? []).map(l => l.id)
  const lotOwnerMap: Record<string, string> = {}
  if (lotIds.length > 0) {
    const { data: ownerships } = await supabase
      .from('lot_ownerships')
      .select('lot_id, owners(first_name, last_name)')
      .in('lot_id', lotIds)

    if (ownerships) {
      for (const o of ownerships) {
        const owner = o.owners as unknown as { first_name: string; last_name: string } | null
        if (owner && o.lot_id) {
          lotOwnerMap[o.lot_id] = `${owner.first_name} ${owner.last_name}`
        }
      }
    }
  }

  const lotsWithOwners = (lots ?? []).map(l => ({
    id: l.id,
    lot_number: l.lot_number,
    owner_name: lotOwnerMap[l.id] || null,
  }))

  const isEditable = ['draft', 'scheduled', 'notice_sent', 'in_progress'].includes(meeting.status)
  const latestMinutes = minutes && minutes.length > 0 ? minutes[0] : null

  const typedAgendaItems = (agendaItems ?? []) as Array<{
    id: string
    item_number: number
    title: string
    description: string | null
    item_type: string
    motion_type: string | null
    estimated_cost: number | null
    is_required: boolean
  }>

  const typedAttendees = (attendees ?? []) as Array<{
    id: string
    lot_id: string | null
    owner_name: string
    attendance_type: string
    represented_by: string | null
  }>

  const typedResolutions = (resolutions ?? []) as Array<{
    id: string
    resolution_number: string | null
    motion_text: string
    resolution_type: string
    moved_by: string | null
    seconded_by: string | null
    votes_for: number
    votes_against: number
    votes_abstain: number
    result: string
    result_percentage: number | null
    discussion_notes: string | null
    agenda_item_id: string | null
  }>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {meeting.meeting_type === 'agm' ? 'Annual General Meeting'
                : meeting.meeting_type === 'sgm' ? 'Special General Meeting'
                : 'Committee Meeting'}
            </h2>
            <MeetingTypeBadge type={meeting.meeting_type} />
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/meetings`} className="hover:underline">Meetings</Link>
            {' '}&mdash; {formatDate(meeting.meeting_date)} at {formatTime(meeting.meeting_date)}
          </p>
          {meeting.location && (
            <p className="text-sm text-muted-foreground mt-1">{meeting.location}</p>
          )}
          {meeting.location_virtual && (
            <p className="text-sm text-muted-foreground">{meeting.location_virtual}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MeetingStatusActions meetingId={meetingId} status={meeting.status} />
          <Button asChild variant="outline">
            <Link href={`/schemes/${id}/meetings`}>
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">
            Agenda ({typedAgendaItems.length})
          </TabsTrigger>
          <TabsTrigger value="attendance">
            Attendance ({typedAttendees.length})
          </TabsTrigger>
          <TabsTrigger value="resolutions">
            Resolutions ({typedResolutions.length})
          </TabsTrigger>
          <TabsTrigger value="minutes">
            Minutes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <AgendaBuilder
            meetingId={meetingId}
            items={typedAgendaItems}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceTracker
            meetingId={meetingId}
            lots={lotsWithOwners}
            attendees={typedAttendees}
            quorumRequired={meeting.quorum_required}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="resolutions" className="mt-4">
          <div className="space-y-4">
            {isEditable && (
              <ResolutionFormWrapper
                meetingId={meetingId}
                agendaItems={typedAgendaItems.map(a => ({
                  id: a.id,
                  item_number: a.item_number,
                  title: a.title,
                }))}
              />
            )}
            <ResolutionList resolutions={typedResolutions} />
          </div>
        </TabsContent>

        <TabsContent value="minutes" className="mt-4">
          <MinutesViewer
            meetingId={meetingId}
            minutes={latestMinutes}
            meetingType={meeting.meeting_type}
            meetingDate={meeting.meeting_date}
            location={meeting.location}
            attendees={typedAttendees}
            resolutions={typedResolutions}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
