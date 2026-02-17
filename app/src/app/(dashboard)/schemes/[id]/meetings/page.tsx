import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Plus, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MeetingTypeBadge } from '@/components/meetings/meeting-type-badge'
import { MeetingStatusBadge } from '@/components/meetings/meeting-status-badge'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function SchemeMeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, meeting_type, meeting_date, location, location_virtual, status, quorum_met')
    .eq('scheme_id', id)
    .order('meeting_date', { ascending: false })

  const allMeetings = meetings ?? []
  const now = new Date()
  const upcoming = allMeetings.filter(m => new Date(m.meeting_date) >= now || m.status === 'in_progress')
  const past = allMeetings.filter(m => new Date(m.meeting_date) < now && m.status !== 'in_progress')

  function renderTable(items: typeof allMeetings, label: string) {
    if (items.length === 0) return null

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(meeting => (
                <TableRow key={meeting.id}>
                  <TableCell>
                    <MeetingTypeBadge type={meeting.meeting_type} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(meeting.meeting_date)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(meeting.meeting_date)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {meeting.location || meeting.location_virtual || '--'}
                  </TableCell>
                  <TableCell>
                    <MeetingStatusBadge status={meeting.status} />
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/schemes/${id}/meetings/${meeting.id}`}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash; Meeting Management
          </p>
        </div>
        <Button asChild>
          <Link href={`/schemes/${id}/meetings/new`}>
            <Plus className="mr-2 size-4" />
            Create Meeting
          </Link>
        </Button>
      </div>

      {allMeetings.length > 0 ? (
        <div className="space-y-6">
          {renderTable(upcoming, 'Upcoming Meetings')}
          {renderTable(past, 'Past Meetings')}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No meetings yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule your first meeting to get started with meeting management.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/schemes/${id}/meetings/new`}>
                <Plus className="mr-2 size-4" />
                Create First Meeting
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
