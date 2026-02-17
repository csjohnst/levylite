import { Badge } from '@/components/ui/badge'

const TYPE_STYLES: Record<string, { className: string; label: string }> = {
  agm: { className: 'bg-purple-100 text-purple-800', label: 'AGM' },
  sgm: { className: 'bg-blue-100 text-blue-800', label: 'SGM' },
  committee: { className: 'bg-gray-100 text-gray-800', label: 'Committee' },
}

interface MeetingTypeBadgeProps {
  type: string
}

export function MeetingTypeBadge({ type }: MeetingTypeBadgeProps) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.committee
  return (
    <Badge variant="secondary" className={style.className}>
      {style.label}
    </Badge>
  )
}
