'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createResolution } from '@/actions/resolutions'

interface AgendaItem {
  id: string
  item_number: number
  title: string
}

interface ResolutionFormProps {
  meetingId: string
  agendaItems: AgendaItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function calculateResult(
  type: string,
  votesFor: number,
  votesAgainst: number
): { result: string; percentage: number } {
  const total = votesFor + votesAgainst
  if (total === 0) return { result: 'defeated', percentage: 0 }

  const percentage = (votesFor / total) * 100

  let result: string
  if (type === 'ordinary') {
    result = percentage > 50 ? 'carried' : 'defeated'
  } else if (type === 'special') {
    result = percentage >= 75 ? 'carried' : 'defeated'
  } else if (type === 'unanimous') {
    result = percentage === 100 ? 'carried' : 'defeated'
  } else {
    result = percentage > 50 ? 'carried' : 'defeated'
  }

  return { result, percentage }
}

const THRESHOLDS: Record<string, string> = {
  ordinary: '>50%',
  special: '75%+',
  unanimous: '100%',
}

export function ResolutionForm({
  meetingId,
  agendaItems,
  open,
  onOpenChange,
}: ResolutionFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [agendaItemId, setAgendaItemId] = useState('')
  const [motionText, setMotionText] = useState('')
  const [resolutionType, setResolutionType] = useState('ordinary')
  const [movedBy, setMovedBy] = useState('')
  const [secondedBy, setSecondedBy] = useState('')
  const [votesFor, setVotesFor] = useState('')
  const [votesAgainst, setVotesAgainst] = useState('')
  const [votesAbstain, setVotesAbstain] = useState('')

  const forNum = parseInt(votesFor) || 0
  const againstNum = parseInt(votesAgainst) || 0
  const abstainNum = parseInt(votesAbstain) || 0

  const preview = forNum + againstNum > 0
    ? calculateResult(resolutionType, forNum, againstNum)
    : null

  function resetForm() {
    setAgendaItemId('')
    setMotionText('')
    setResolutionType('ordinary')
    setMovedBy('')
    setSecondedBy('')
    setVotesFor('')
    setVotesAgainst('')
    setVotesAbstain('')
  }

  async function handleSubmit() {
    if (!motionText.trim()) {
      toast.error('Motion text is required')
      return
    }
    if (forNum + againstNum === 0) {
      toast.error('Please enter vote counts')
      return
    }

    setSubmitting(true)

    const res = await createResolution(meetingId, {
      agenda_item_id: agendaItemId && agendaItemId !== 'none' ? agendaItemId : null,
      motion_text: motionText.trim(),
      resolution_type: resolutionType,
      moved_by: movedBy.trim() || null,
      seconded_by: secondedBy.trim() || null,
      votes_for: forNum,
      votes_against: againstNum,
      votes_abstain: abstainNum,
    })

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Resolution recorded')
      resetForm()
      onOpenChange(false)
      router.refresh()
    }

    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Resolution</DialogTitle>
          <DialogDescription>
            Record the outcome of a motion voted on during the meeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {agendaItems.length > 0 && (
            <div className="space-y-2">
              <Label>Agenda Item (optional)</Label>
              <Select value={agendaItemId} onValueChange={setAgendaItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to agenda item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {agendaItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.item_number}. {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Motion Text</Label>
            <Textarea
              value={motionText}
              onChange={(e) => setMotionText(e.target.value)}
              placeholder="That the strata company approves..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Resolution Type</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordinary">Ordinary Resolution (&gt;50%)</SelectItem>
                <SelectItem value="special">Special Resolution (75%+)</SelectItem>
                <SelectItem value="unanimous">Unanimous Resolution (100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Moved By</Label>
              <Input
                value={movedBy}
                onChange={(e) => setMovedBy(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Seconded By</Label>
              <Input
                value={secondedBy}
                onChange={(e) => setSecondedBy(e.target.value)}
                placeholder="Name"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>For</Label>
              <Input
                type="number"
                min="0"
                value={votesFor}
                onChange={(e) => setVotesFor(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Against</Label>
              <Input
                type="number"
                min="0"
                value={votesAgainst}
                onChange={(e) => setVotesAgainst(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Abstain</Label>
              <Input
                type="number"
                min="0"
                value={votesAbstain}
                onChange={(e) => setVotesAbstain(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Result preview */}
          {preview && (
            <div className="rounded-md border p-3 flex items-center justify-between">
              <span className="text-sm">
                {forNum}/{forNum + againstNum} = {preview.percentage.toFixed(1)}%
                {' '}(requires {THRESHOLDS[resolutionType] ?? '>50%'})
              </span>
              <Badge
                variant="secondary"
                className={
                  preview.result === 'carried'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {preview.result === 'carried' ? 'CARRIED' : 'DEFEATED'}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !motionText.trim()}
          >
            {submitting ? 'Recording...' : 'Record Resolution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
