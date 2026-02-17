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
import { submitMaintenanceRequest } from '@/actions/owner-maintenance'

interface Lot {
  id: string
  lot_number: string
  unit_number: string | null
  scheme_name: string
}

interface OwnerMaintenanceFormProps {
  lots: Lot[]
}

const PRIORITY_OPTIONS = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'cosmetic', label: 'Cosmetic' },
]

export function OwnerMaintenanceForm({ lots }: OwnerMaintenanceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState('routine')
  const [lotId, setLotId] = useState(lots.length === 1 ? lots[0].id : '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!subject.trim()) {
      toast.error('Subject is required')
      return
    }
    if (!description.trim()) {
      toast.error('Description is required')
      return
    }
    if (!lotId) {
      toast.error('Please select a lot')
      return
    }

    setLoading(true)
    const result = await submitMaintenanceRequest({
      lot_id: lotId,
      subject: subject.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      priority,
    })

    if ('error' in result) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success('Request submitted')
    if (result.data?.id) {
      router.push(`/owner/maintenance/${result.data.id}`)
    } else {
      router.push('/owner/maintenance')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
          <CardDescription>Describe the maintenance issue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Leaking tap in common area bathroom"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the maintenance issue..."
              rows={5}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Ground floor common area bathroom"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot">Lot *</Label>
              {lots.length === 1 ? (
                <Input
                  id="lot"
                  value={`${lots[0].scheme_name} - Lot ${lots[0].lot_number}${lots[0].unit_number ? ` (Unit ${lots[0].unit_number})` : ''}`}
                  disabled
                />
              ) : (
                <Select value={lotId || 'none'} onValueChange={(v) => setLotId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="lot">
                    <SelectValue placeholder="Select a lot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a lot</SelectItem>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.scheme_name} - Lot {lot.lot_number}
                        {lot.unit_number ? ` (Unit ${lot.unit_number})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
