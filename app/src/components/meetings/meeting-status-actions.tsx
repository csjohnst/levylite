'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { updateMeeting } from '@/actions/meetings'

interface MeetingStatusActionsProps {
  meetingId: string
  status: string
}

const STATUS_TRANSITIONS: Record<string, { target: string; label: string; confirm?: string }[]> = {
  draft: [
    { target: 'scheduled', label: 'Mark Scheduled' },
    { target: 'cancelled', label: 'Cancel', confirm: 'Are you sure you want to cancel this meeting?' },
  ],
  scheduled: [
    { target: 'notice_sent', label: 'Mark Notice Sent' },
    { target: 'cancelled', label: 'Cancel', confirm: 'Are you sure you want to cancel this meeting?' },
  ],
  notice_sent: [
    { target: 'in_progress', label: 'Start Meeting' },
    { target: 'cancelled', label: 'Cancel', confirm: 'Are you sure you want to cancel this meeting?' },
  ],
  in_progress: [
    { target: 'completed', label: 'Complete Meeting' },
    { target: 'adjourned', label: 'Adjourn', confirm: 'Are you sure you want to adjourn this meeting? An adjourned meeting is typically reconvened 7 days later.' },
  ],
}

export function MeetingStatusActions({ meetingId, status }: MeetingStatusActionsProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ target: string; label: string; confirm: string } | null>(null)

  const transitions = STATUS_TRANSITIONS[status] ?? []

  if (transitions.length === 0) return null

  async function handleTransition(target: string) {
    setUpdating(true)
    const result = await updateMeeting(meetingId, { status: target })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Meeting status updated`)
      router.refresh()
    }
    setUpdating(false)
    setConfirmAction(null)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {transitions.map(t => (
          <Button
            key={t.target}
            variant={t.target === 'cancelled' || t.target === 'adjourned' ? 'outline' : 'default'}
            size="sm"
            disabled={updating}
            onClick={() => {
              if (t.confirm) {
                setConfirmAction({ ...t, confirm: t.confirm })
              } else {
                handleTransition(t.target)
              }
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.label}</DialogTitle>
            <DialogDescription>
              {confirmAction?.confirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => confirmAction && handleTransition(confirmAction.target)}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
