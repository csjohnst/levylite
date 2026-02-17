'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { markAttendance } from '@/actions/meeting-attendance'

interface Lot {
  id: string
  lot_number: string
  owner_name: string | null
}

interface Attendee {
  id: string
  lot_id: string | null
  owner_name: string
  attendance_type: string
  represented_by: string | null
}

interface AttendanceTrackerProps {
  meetingId: string
  lots: Lot[]
  attendees: Attendee[]
  quorumRequired: number | null
  isEditable: boolean
}

export function AttendanceTracker({
  meetingId,
  lots,
  attendees,
  quorumRequired,
  isEditable,
}: AttendanceTrackerProps) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [proxyNames, setProxyNames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const a of attendees) {
      if (a.lot_id && a.represented_by) {
        map[a.lot_id] = a.represented_by
      }
    }
    return map
  })

  // Build attendance map: lot_id -> attendance_type
  const attendanceMap: Record<string, string> = {}
  for (const a of attendees) {
    if (a.lot_id) {
      attendanceMap[a.lot_id] = a.attendance_type
    }
  }

  // Quorum calculation
  const presentCount = attendees.filter(
    a => a.attendance_type === 'present' || a.attendance_type === 'virtual' || a.attendance_type === 'proxy'
  ).length
  const totalLots = lots.length
  const quorum = quorumRequired ?? Math.ceil(totalLots * 0.3)
  const quorumMet = presentCount >= quorum
  const quorumPercentage = totalLots > 0 ? Math.round((presentCount / totalLots) * 100) : 0
  const progressWidth = quorum > 0 ? Math.min(100, Math.round((presentCount / quorum) * 100)) : 0

  async function handleAttendanceChange(lot: Lot, attendanceType: string) {
    setSaving(lot.id)

    const result = await markAttendance(meetingId, {
      lot_id: lot.id,
      owner_name: lot.owner_name || `Lot ${lot.lot_number}`,
      attendance_type: attendanceType,
      represented_by: attendanceType === 'proxy' ? (proxyNames[lot.id] || null) : null,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      router.refresh()
    }
    setSaving(null)
  }

  function handleProxyNameChange(lotId: string, name: string) {
    setProxyNames(prev => ({ ...prev, [lotId]: name }))
  }

  return (
    <div className="space-y-4">
      {/* Quorum bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quorum Status</CardTitle>
            <Badge
              variant="secondary"
              className={quorumMet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            >
              {quorumMet ? 'QUORUM MET' : 'QUORUM NOT MET'}
            </Badge>
          </div>
          <CardDescription>
            {presentCount}/{totalLots} owners ({quorumPercentage}%) &mdash; {quorum} required ({quorumRequired ? `${Math.round((quorum / totalLots) * 100)}%` : '30%'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${quorumMet ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lot list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance Roll</CardTitle>
          <CardDescription>Mark attendance for each lot owner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lots.map(lot => {
              const currentType = attendanceMap[lot.id] || 'none'
              const isProxy = currentType === 'proxy'

              return (
                <div
                  key={lot.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Lot {lot.lot_number}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {lot.owner_name || 'No owner'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isEditable ? (
                      <>
                        <Select
                          value={currentType}
                          onValueChange={(v) => handleAttendanceChange(lot, v)}
                          disabled={saving === lot.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Not marked" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not marked</SelectItem>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                            <SelectItem value="proxy">Proxy</SelectItem>
                            <SelectItem value="apology">Apology</SelectItem>
                          </SelectContent>
                        </Select>

                        {isProxy && (
                          <Input
                            placeholder="Represented by"
                            value={proxyNames[lot.id] || ''}
                            onChange={(e) => handleProxyNameChange(lot.id, e.target.value)}
                            onBlur={() => {
                              if (proxyNames[lot.id]) {
                                handleAttendanceChange(lot, 'proxy')
                              }
                            }}
                            className="w-[160px]"
                          />
                        )}
                      </>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={
                          currentType === 'present' || currentType === 'virtual'
                            ? 'bg-green-100 text-green-800'
                            : currentType === 'proxy'
                            ? 'bg-blue-100 text-blue-800'
                            : currentType === 'apology'
                            ? 'bg-gray-100 text-gray-800'
                            : ''
                        }
                      >
                        {currentType === 'none' ? 'Not marked' : currentType}
                        {isProxy && proxyNames[lot.id] ? ` (${proxyNames[lot.id]})` : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
