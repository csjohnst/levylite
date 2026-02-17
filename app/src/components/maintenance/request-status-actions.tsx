'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateMaintenanceRequest } from '@/actions/maintenance-requests'

interface RequestStatusActionsProps {
  requestId: string
  currentStatus: string
  hasAssignedTradesperson: boolean
}

const STATUS_TRANSITIONS: Record<string, { label: string; nextStatus: string; variant?: 'default' | 'outline' | 'destructive' }[]> = {
  new: [
    { label: 'Acknowledge', nextStatus: 'acknowledged' },
  ],
  acknowledged: [],
  assigned: [
    { label: 'Start Work', nextStatus: 'in_progress' },
  ],
  quoted: [],
  approved: [
    { label: 'Start Work', nextStatus: 'in_progress' },
  ],
  in_progress: [
    { label: 'Mark Complete', nextStatus: 'completed' },
  ],
  completed: [
    { label: 'Close Request', nextStatus: 'closed', variant: 'outline' },
  ],
  closed: [],
}

export function RequestStatusActions({
  requestId,
  currentStatus,
  hasAssignedTradesperson,
}: RequestStatusActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const actions = STATUS_TRANSITIONS[currentStatus] ?? []

  async function handleStatusChange(nextStatus: string) {
    setLoading(nextStatus)
    const result = await updateMaintenanceRequest(requestId, { status: nextStatus })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`)
      router.refresh()
    }
    setLoading(null)
  }

  if (actions.length === 0 && currentStatus !== 'closed') return null

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => (
        <Button
          key={action.nextStatus}
          variant={action.variant ?? 'default'}
          size="sm"
          disabled={loading !== null}
          onClick={() => handleStatusChange(action.nextStatus)}
        >
          {loading === action.nextStatus ? 'Updating...' : action.label}
        </Button>
      ))}
    </div>
  )
}
