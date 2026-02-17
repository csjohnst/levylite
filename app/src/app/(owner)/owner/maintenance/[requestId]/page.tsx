import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getOwnerMaintenanceRequest } from '@/actions/owner-maintenance'
import { OwnerCommentForm } from '@/components/owner/owner-comment-form'

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  new: { className: 'bg-gray-100 text-gray-800', label: 'New' },
  acknowledged: { className: 'bg-blue-100 text-blue-800', label: 'Acknowledged' },
  assigned: { className: 'bg-indigo-100 text-indigo-800', label: 'Assigned' },
  quoted: { className: 'bg-yellow-100 text-yellow-800', label: 'Quoted' },
  approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
  in_progress: { className: 'bg-orange-100 text-orange-800', label: 'In Progress' },
  completed: { className: 'bg-emerald-100 text-emerald-800', label: 'Completed' },
  closed: { className: 'bg-slate-100 text-slate-800', label: 'Closed' },
}

const PRIORITY_BADGES: Record<string, { className: string; label: string }> = {
  emergency: { className: 'bg-red-100 text-red-800', label: 'Emergency' },
  urgent: { className: 'bg-amber-100 text-amber-800', label: 'Urgent' },
  routine: { className: 'bg-blue-100 text-blue-800', label: 'Routine' },
  cosmetic: { className: 'bg-gray-100 text-gray-800', label: 'Cosmetic' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function OwnerMaintenanceDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  const result = await getOwnerMaintenanceRequest(requestId)

  if ('error' in result) {
    notFound()
  }

  const request = result.data!
  const lot = request.lots as unknown as { id: string; lot_number: string; unit_number: string | null } | null
  const statusBadge = STATUS_BADGES[request.status] ?? STATUS_BADGES.new
  const priorityBadge = PRIORITY_BADGES[request.priority] ?? PRIORITY_BADGES.routine

  // Build timeline events
  const timelineEvents: Array<{ date: string; label: string; type: 'info' | 'success' }> = [
    { date: request.created_at, label: 'Request submitted', type: 'info' },
  ]
  if (request.acknowledged_at) {
    timelineEvents.push({ date: request.acknowledged_at, label: 'Acknowledged by manager', type: 'info' })
  }
  if (request.scheduled_date) {
    timelineEvents.push({ date: request.scheduled_date, label: 'Scheduled for work', type: 'info' })
  }
  if (request.completed_at) {
    timelineEvents.push({ date: request.completed_at, label: 'Work completed', type: 'success' })
  }
  if (request.closed_at) {
    timelineEvents.push({ date: request.closed_at, label: 'Request closed', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/owner/maintenance">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold tracking-tight truncate">{request.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
            <Badge variant="secondary" className={priorityBadge.className}>
              {priorityBadge.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{request.description}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <OwnerCommentForm requestId={requestId} comments={request.comments} />
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {/* Details card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm">{formatDate(request.created_at)}</p>
              </div>
              {lot && (
                <div>
                  <p className="text-xs text-muted-foreground">Lot</p>
                  <p className="text-sm">
                    Lot {lot.lot_number}
                    {lot.unit_number ? ` (Unit ${lot.unit_number})` : ''}
                  </p>
                </div>
              )}
              {request.location && (
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="size-3" />
                    {request.location}
                  </p>
                </div>
              )}
              {request.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm capitalize">{request.category.replace(/_/g, ' ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`mt-1 size-2 rounded-full shrink-0 ${
                        event.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
