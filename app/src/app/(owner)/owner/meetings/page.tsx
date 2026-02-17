import { CalendarDays, MapPin } from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getOwnerMeetings } from '@/actions/owner-meetings'
import { OwnerMeetingActions } from '@/components/owner/owner-meeting-actions'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
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

const MEETING_TYPE_LABELS: Record<string, string> = {
  agm: 'AGM',
  sgm: 'SGM',
  committee: 'Committee',
}

const MEETING_TYPE_COLORS: Record<string, string> = {
  agm: 'bg-purple-100 text-purple-800',
  sgm: 'bg-blue-100 text-blue-800',
  committee: 'bg-gray-100 text-gray-800',
}

export default async function OwnerMeetingsPage() {
  const result = await getOwnerMeetings()

  if ('error' in result && !('data' in result)) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
          <p className="text-muted-foreground">Unable to load meetings</p>
        </div>
      </div>
    )
  }

  const { upcoming, past } = result.data!

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Meetings</h2>
        <p className="text-muted-foreground">
          Upcoming and past meetings for your schemes
        </p>
      </div>

      {/* Upcoming Meetings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming</h3>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((meeting) => {
              const scheme = meeting.schemes as unknown as { id: string; scheme_name: string } | null
              const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type
              const typeColor = MEETING_TYPE_COLORS[meeting.meeting_type] ?? 'bg-gray-100 text-gray-800'

              return (
                <Card key={meeting.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={typeColor}>
                            {typeLabel}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {scheme?.scheme_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3.5 text-muted-foreground" />
                            {formatDate(meeting.meeting_date)} at {formatTime(meeting.meeting_date)}
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="size-3.5" />
                              {meeting.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <OwnerMeetingActions meeting={meeting} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="size-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming meetings scheduled</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past Meetings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Past Meetings</h3>
        {past.length > 0 ? (
          <div className="space-y-3">
            {past.map((meeting) => {
              const scheme = meeting.schemes as unknown as { id: string; scheme_name: string } | null
              const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type
              const typeColor = MEETING_TYPE_COLORS[meeting.meeting_type] ?? 'bg-gray-100 text-gray-800'

              return (
                <Card key={meeting.id} className="opacity-80">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={typeColor}>
                            {typeLabel}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {scheme?.scheme_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3.5" />
                            {formatDate(meeting.meeting_date)}
                          </span>
                          {meeting.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3.5" />
                              {meeting.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {meeting.status === 'completed' && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No past meetings</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
