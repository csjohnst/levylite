import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarDays, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

export default async function MeetingsIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgUser } = await supabase
    .from('organisation_users')
    .select('organisation_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) redirect('/')

  // Get all schemes for this org
  const { data: schemes } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('organisation_id', orgUser.organisation_id)
    .eq('status', 'active')
    .order('scheme_name')

  const schemeIds = schemes?.map(s => s.id) ?? []
  const schemeMap: Record<string, { name: string; number: string }> = {}
  for (const s of schemes ?? []) {
    schemeMap[s.id] = { name: s.scheme_name, number: s.scheme_number }
  }

  // Get all meetings across schemes
  let meetings: Array<{
    id: string
    scheme_id: string
    meeting_type: string
    meeting_date: string
    location: string | null
    status: string
    quorum_met: boolean | null
  }> = []

  if (schemeIds.length > 0) {
    const { data } = await supabase
      .from('meetings')
      .select('id, scheme_id, meeting_type, meeting_date, location, status, quorum_met')
      .in('scheme_id', schemeIds)
      .order('meeting_date', { ascending: false })

    meetings = data ?? []
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
        <p className="text-muted-foreground">
          View and manage meetings across all your schemes
        </p>
      </div>

      {meetings.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scheme</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quorum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map(meeting => {
                const scheme = schemeMap[meeting.scheme_id]
                return (
                  <TableRow key={meeting.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/schemes/${meeting.scheme_id}/meetings/${meeting.id}`}
                        className="hover:underline"
                      >
                        {scheme?.name ?? 'Unknown'}
                      </Link>
                    </TableCell>
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
                      {meeting.location || '--'}
                    </TableCell>
                    <TableCell>
                      <MeetingStatusBadge status={meeting.status} />
                    </TableCell>
                    <TableCell>
                      {meeting.quorum_met === true && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Met</Badge>
                      )}
                      {meeting.quorum_met === false && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">Not Met</Badge>
                      )}
                      {meeting.quorum_met === null && (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No meetings</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {schemeIds.length > 0
                ? 'Schedule a meeting from a scheme page to get started.'
                : 'Create a scheme first before scheduling meetings.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
