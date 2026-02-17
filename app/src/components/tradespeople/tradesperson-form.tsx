'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { createTradesperson, updateTradesperson } from '@/actions/tradespeople'

interface TradespersonData {
  id?: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  abn: string | null
  trade_type: string | null
  insurance_expiry: string | null
  license_number: string | null
  notes: string | null
}

interface TradespersonFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tradesperson?: TradespersonData | null
}

const TRADE_TYPE_OPTIONS = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'painter', label: 'Painter' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'builder', label: 'Builder' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'glazier', label: 'Glazier' },
  { value: 'hvac', label: 'HVAC / Air Conditioning' },
  { value: 'general', label: 'General Maintenance' },
  { value: 'other', label: 'Other' },
]

export function TradespersonForm({ open, onOpenChange, tradesperson }: TradespersonFormProps) {
  const router = useRouter()
  const isEditing = !!tradesperson?.id
  const [loading, setLoading] = useState(false)

  const [businessName, setBusinessName] = useState(tradesperson?.business_name ?? '')
  const [contactName, setContactName] = useState(tradesperson?.contact_name ?? '')
  const [email, setEmail] = useState(tradesperson?.email ?? '')
  const [phone, setPhone] = useState(tradesperson?.phone ?? '')
  const [abn, setAbn] = useState(tradesperson?.abn ?? '')
  const [tradeType, setTradeType] = useState(tradesperson?.trade_type ?? 'none')
  const [insuranceExpiry, setInsuranceExpiry] = useState(tradesperson?.insurance_expiry ?? '')
  const [licenseNumber, setLicenseNumber] = useState(tradesperson?.license_number ?? '')
  const [notes, setNotes] = useState(tradesperson?.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessName.trim()) {
      toast.error('Business name is required')
      return
    }

    setLoading(true)
    const formData = {
      business_name: businessName.trim(),
      contact_name: contactName.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      abn: abn.trim() || null,
      trade_type: tradeType === 'none' ? null : tradeType,
      insurance_expiry: insuranceExpiry || null,
      license_number: licenseNumber.trim() || null,
      notes: notes.trim() || null,
    }

    const result = isEditing
      ? await updateTradesperson(tradesperson!.id!, formData)
      : await createTradesperson(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isEditing ? 'Tradesperson updated' : 'Tradesperson added')
      onOpenChange(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Tradesperson' : 'Add Tradesperson'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the tradesperson details.' : 'Add a new tradesperson to your directory.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Smith Plumbing Pty Ltd"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_type">Trade Type</Label>
              <Select value={tradeType} onValueChange={setTradeType}>
                <SelectTrigger id="trade_type">
                  <SelectValue placeholder="Select trade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {TRADE_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@smithplumbing.com.au"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0412 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abn">ABN</Label>
              <Input
                id="abn"
                value={abn}
                onChange={(e) => setAbn(e.target.value)}
                placeholder="12345678901"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number</Label>
              <Input
                id="license_number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. PL1234"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
              <Input
                id="insurance_expiry"
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Tradesperson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
