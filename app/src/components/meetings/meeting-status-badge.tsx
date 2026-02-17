import { Badge } from '@/components/ui/badge'

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  draft: { className: 'bg-gray-100 text-gray-800', label: 'Draft' },
  scheduled: { className: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
  notice_sent: { className: 'bg-amber-100 text-amber-800', label: 'Notice Sent' },
  in_progress: { className: 'bg-orange-100 text-orange-800', label: 'In Progress' },
  completed: { className: 'bg-green-100 text-green-800', label: 'Completed' },
  adjourned: { className: 'bg-red-100 text-red-800', label: 'Adjourned' },
  cancelled: { className: 'bg-slate-100 text-slate-800', label: 'Cancelled' },
}

interface MeetingStatusBadgeProps {
  status: string
}

export function MeetingStatusBadge({ status }: MeetingStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <Badge variant="secondary" className={style.className}>
      {style.label}
    </Badge>
  )
}
