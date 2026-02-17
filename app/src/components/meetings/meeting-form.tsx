'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createMeeting } from '@/actions/meetings'

const NOTICE_PERIODS: Record<string, { days: number; label: string }> = {
  agm: { days: 21, label: '21 days (AGM requirement)' },
  sgm: { days: 14, label: '14 days (SGM requirement)' },
  committee: { days: 7, label: '7 days (best practice)' },
}

interface MeetingFormProps {
  schemeId: string
}

export function MeetingForm({ schemeId }: MeetingFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [meetingType, setMeetingType] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [location, setLocation] = useState('')
  const [locationVirtual, setLocationVirtual] = useState('')
  const [notes, setNotes] = useState('')

  const noticePeriod = meetingType ? NOTICE_PERIODS[meetingType] : null

  // Calculate notice deadline
  let noticeDeadline: string | null = null
  if (meetingDate && noticePeriod) {
    const date = new Date(meetingDate)
    date.setDate(date.getDate() - noticePeriod.days)
    noticeDeadline = date.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meetingType) {
      toast.error('Please select a meeting type')
      return
    }
    if (!meetingDate) {
      toast.error('Please select a date and time')
      return
    }
    if (!location && !locationVirtual) {
      toast.error('Please provide a location or virtual meeting link')
      return
    }

    setLoading(true)
    const result = await createMeeting(schemeId, {
      meeting_type: meetingType,
      meeting_date: new Date(meetingDate).toISOString(),
      location: location || null,
      location_virtual: locationVirtual || null,
      notes: notes || null,
    })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success('Meeting created')
    router.push(`/schemes/${schemeId}/meetings`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Type</CardTitle>
          <CardDescription>Select the type of meeting to schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting_type">Type</Label>
            <Select value={meetingType} onValueChange={setMeetingType}>
              <SelectTrigger id="meeting_type">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agm">Annual General Meeting (AGM)</SelectItem>
                <SelectItem value="sgm">Special General Meeting (SGM)</SelectItem>
                <SelectItem value="committee">Committee Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {noticePeriod && (
            <p className="text-sm text-muted-foreground">
              Notice period: {noticePeriod.label}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
          <CardDescription>When will the meeting be held?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting_date">Date and Time</Label>
            <Input
              id="meeting_date"
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
            />
          </div>
          {noticeDeadline && (
            <p className="text-sm text-muted-foreground">
              Notices must be sent by: <strong>{noticeDeadline}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Where will the meeting be held? Provide a physical address, virtual link, or both.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Physical Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Community Room, 123 Sunset Blvd"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location_virtual">Virtual Meeting Link</Label>
            <Input
              id="location_virtual"
              value={locationVirtual}
              onChange={(e) => setLocationVirtual(e.target.value)}
              placeholder="e.g. https://zoom.us/j/123456789"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Optional notes about this meeting</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Special agenda items to discuss, catering arrangements"
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !meetingType || !meetingDate}>
          {loading ? 'Creating...' : 'Create Meeting'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
