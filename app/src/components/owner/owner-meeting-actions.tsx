'use client'

import { CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Meeting {
  id: string
  meeting_type: string
  meeting_date: string
  location: string | null
  location_virtual: string | null
  status: string
}

interface OwnerMeetingActionsProps {
  meeting: Meeting
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  agm: 'Annual General Meeting',
  sgm: 'Special General Meeting',
  committee: 'Committee Meeting',
}

function generateIcsFile(meeting: Meeting): string {
  const startDate = new Date(meeting.meeting_date)
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // Assume 2 hours

  const formatIcsDate = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  }

  const title = MEETING_TYPE_LABELS[meeting.meeting_type] ?? 'Meeting'
  const location = meeting.location || meeting.location_virtual || ''

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LevyLite//Owner Portal//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${title} for your strata scheme`,
    `UID:${meeting.id}@levylite.com.au`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function OwnerMeetingActions({ meeting }: OwnerMeetingActionsProps) {
  function handleAddToCalendar() {
    const icsContent = generateIcsFile(meeting)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `meeting-${meeting.meeting_type}-${meeting.meeting_date.split('T')[0]}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button variant="outline" size="sm" onClick={handleAddToCalendar}>
        <CalendarPlus className="mr-1 size-3.5" />
        Add to Calendar
      </Button>
    </div>
  )
}
