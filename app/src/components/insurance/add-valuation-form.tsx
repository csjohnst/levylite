'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createPropertyValuation } from '@/actions/insurance'

interface AddValuationFormProps {
  schemeId: string
}

export function AddValuationForm({ schemeId }: AddValuationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [valuationDate, setValuationDate] = useState('')
  const [valuationAmount, setValuationAmount] = useState('')
  const [valuationType, setValuationType] = useState<string>('insurance')
  const [valuerName, setValuerName] = useState('')
  const [valuerCompany, setValuerCompany] = useState('')
  const [valuerRegistrationNumber, setValuerRegistrationNumber] = useState('')
  const [reportReference, setReportReference] = useState('')
  const [notes, setNotes] = useState('')
  const [methodology, setMethodology] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await createPropertyValuation({
      schemeId,
      valuationDate,
      valuationAmount: parseFloat(valuationAmount),
      valuationType: valuationType as 'insurance' | 'market' | 'depreciated_replacement',
      valuerName,
      valuerCompany: valuerCompany || null,
      valuerRegistrationNumber: valuerRegistrationNumber || null,
      reportReference: reportReference || null,
      notes: notes || null,
      methodology: methodology || null,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Property valuation created')
      router.push(`/schemes/${schemeId}/insurance`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valuation_date">Valuation Date *</Label>
          <Input
            id="valuation_date"
            type="date"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valuation_amount">Valuation Amount * ($)</Label>
          <Input
            id="valuation_amount"
            type="number"
            step="0.01"
            min="1"
            placeholder="2500000.00"
            value={valuationAmount}
            onChange={(e) => setValuationAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="valuation_type">Valuation Type *</Label>
        <Select value={valuationType} onValueChange={setValuationType}>
          <SelectTrigger id="valuation_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="insurance">Insurance Valuation</SelectItem>
            <SelectItem value="market">Market Valuation</SelectItem>
            <SelectItem value="depreciated_replacement">Depreciated Replacement Cost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valuer_name">Valuer Name *</Label>
          <Input
            id="valuer_name"
            placeholder="e.g. John Smith"
            value={valuerName}
            onChange={(e) => setValuerName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valuer_company">Valuer Company</Label>
          <Input
            id="valuer_company"
            placeholder="e.g. Smith Valuers Pty Ltd"
            value={valuerCompany}
            onChange={(e) => setValuerCompany(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="valuer_registration_number">Valuer Registration Number</Label>
          <Input
            id="valuer_registration_number"
            placeholder="e.g. CPV12345"
            value={valuerRegistrationNumber}
            onChange={(e) => setValuerRegistrationNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="report_reference">Report Reference</Label>
          <Input
            id="report_reference"
            placeholder="e.g. VAL-2025-001"
            value={reportReference}
            onChange={(e) => setReportReference(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="methodology">Valuation Methodology</Label>
        <Textarea
          id="methodology"
          placeholder="Brief description of the methodology used"
          value={methodology}
          onChange={(e) => setMethodology(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes or observations"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Valuation'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
