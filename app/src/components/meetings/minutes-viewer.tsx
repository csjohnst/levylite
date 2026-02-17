'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { generateMinutes, advanceMinutesStatus } from '@/actions/meeting-minutes'

interface Minutes {
  id: string
  content: Record<string, unknown> | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  approved_by: string | null
  approved_at: string | null
  published_at: string | null
  created_at: string
}

interface Attendee {
  owner_name: string
  attendance_type: string
  represented_by: string | null
}

interface Resolution {
  motion_text: string
  resolution_type: string
  moved_by: string | null
  seconded_by: string | null
  votes_for: number
  votes_against: number
  votes_abstain: number
  result: string
}

interface MinutesViewerProps {
  meetingId: string
  minutes: Minutes | null
  meetingType: string
  meetingDate: string
  location: string | null
  attendees: Attendee[]
  resolutions: Resolution[]
}

const STATUS_LABELS: Record<string, { className: string; label: string }> = {
  draft: { className: 'bg-gray-100 text-gray-800', label: 'Draft' },
  manager_reviewed: { className: 'bg-blue-100 text-blue-800', label: 'Manager Reviewed' },
  approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
  published: { className: 'bg-purple-100 text-purple-800', label: 'Published' },
}

const NEXT_STATUS: Record<string, { target: string; label: string }> = {
  draft: { target: 'manager_reviewed', label: 'Mark as Reviewed' },
  manager_reviewed: { target: 'approved', label: 'Approve Minutes' },
  approved: { target: 'published', label: 'Publish Minutes' },
}

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

export function MinutesViewer({
  meetingId,
  minutes,
  meetingType,
  meetingDate,
  location,
  attendees,
  resolutions,
}: MinutesViewerProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [advancing, setAdvancing] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    const result = await generateMinutes(meetingId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Minutes generated')
      router.refresh()
    }
    setGenerating(false)
  }

  async function handleAdvance() {
    if (!minutes) return
    const next = NEXT_STATUS[minutes.status]
    if (!next) return

    setAdvancing(true)
    const result = await advanceMinutesStatus(minutes.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Minutes status updated to ${next.target.replace('_', ' ')}`)
      router.refresh()
    }
    setAdvancing(false)
  }

  // No minutes yet
  if (!minutes) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No minutes generated</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate minutes from the meeting data including attendance, agenda, and resolutions.
          </p>
          <Button onClick={handleGenerate} disabled={generating} className="mt-4">
            {generating ? 'Generating...' : 'Generate Minutes'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusStyle = STATUS_LABELS[minutes.status] ?? STATUS_LABELS.draft
  const nextAction = NEXT_STATUS[minutes.status]

  // Categorise attendees
  const present = attendees.filter(a => a.attendance_type === 'present' || a.attendance_type === 'virtual')
  const proxies = attendees.filter(a => a.attendance_type === 'proxy')
  const apologies = attendees.filter(a => a.attendance_type === 'apology')

  const meetingTypeLabel = meetingType === 'agm' ? 'Annual General Meeting'
    : meetingType === 'sgm' ? 'Special General Meeting'
    : 'Committee Meeting'

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={statusStyle.className}>
            {statusStyle.label}
          </Badge>
          {minutes.published_at && (
            <span className="text-sm text-muted-foreground">
              Published {formatDate(minutes.published_at)}
            </span>
          )}
        </div>
        {nextAction && (
          <Button onClick={handleAdvance} disabled={advancing} size="sm">
            <CheckCircle className="mr-1 size-3" />
            {advancing ? 'Updating...' : nextAction.label}
          </Button>
        )}
      </div>

      {/* Minutes content */}
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle>Minutes of {meetingTypeLabel}</CardTitle>
          <CardDescription>
            {formatDate(meetingDate)} at {formatTime(meetingDate)}
            {location && ` | ${location}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Attendance */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Attendance
            </h4>
            <div className="space-y-1 text-sm">
              <p>Owners Present: {present.length}</p>
              <p>Proxies Held: {proxies.length}</p>
              <p>Total: {present.length + proxies.length}</p>
            </div>

            {present.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Present:</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {present.map((a, i) => (
                    <li key={i}>
                      {a.owner_name}
                      {a.attendance_type === 'virtual' ? ' (virtual)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {proxies.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Proxies:</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {proxies.map((a, i) => (
                    <li key={i}>
                      {a.owner_name}
                      {a.represented_by ? ` (proxy: ${a.represented_by})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {apologies.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Apologies:</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  {apologies.map((a, i) => (
                    <li key={i}>{a.owner_name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Resolutions */}
          {resolutions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Resolutions
              </h4>
              <div className="space-y-3">
                {resolutions.map((res, i) => {
                  const totalVotes = res.votes_for + res.votes_against
                  const pct = totalVotes > 0 ? ((res.votes_for / totalVotes) * 100).toFixed(1) : '0.0'

                  return (
                    <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                      <p className="font-medium">{res.motion_text}</p>
                      <div className="text-muted-foreground">
                        {res.moved_by && <span>Moved: {res.moved_by}</span>}
                        {res.moved_by && res.seconded_by && <span> | </span>}
                        {res.seconded_by && <span>Seconded: {res.seconded_by}</span>}
                      </div>
                      <p>
                        Result:{' '}
                        <span className={res.result === 'carried' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                          {res.result.toUpperCase()}
                        </span>
                        {' '}(For: {res.votes_for}, Against: {res.votes_against}, Abstain: {res.votes_abstain} &mdash; {pct}%)
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
