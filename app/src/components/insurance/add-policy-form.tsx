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
import { createInsurancePolicy } from '@/actions/insurance'

interface AddPolicyFormProps {
  schemeId: string
}

export function AddPolicyForm({ schemeId }: AddPolicyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [policyType, setPolicyType] = useState<string>('building')
  const [policyNumber, setPolicyNumber] = useState('')
  const [insurerName, setInsurerName] = useState('')
  const [brokerName, setBrokerName] = useState('')
  const [premiumAmount, setPremiumAmount] = useState('')
  const [sumInsured, setSumInsured] = useState('')
  const [excessAmount, setExcessAmount] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [coverageNotes, setCoverageNotes] = useState('')
  const [specialConditions, setSpecialConditions] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await createInsurancePolicy({
      schemeId,
      policyType: policyType as 'building' | 'public_liability' | 'office_bearers' | 'fidelity' | 'workers_comp' | 'other',
      policyNumber,
      insurerName,
      brokerName: brokerName || null,
      premiumAmount: Number(premiumAmount) || 0,
      sumInsured: sumInsured ? Number(sumInsured) || 0 : null,
      excessAmount: excessAmount ? Number(excessAmount) || 0 : null,
      effectiveDate,
      expiryDate,
      coverageNotes: coverageNotes || null,
      specialConditions: specialConditions || null,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Insurance policy created')
      router.push(`/schemes/${schemeId}/insurance`)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="policy_type">Policy Type *</Label>
          <Select value={policyType} onValueChange={setPolicyType}>
            <SelectTrigger id="policy_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="building">Building Insurance</SelectItem>
              <SelectItem value="public_liability">Public Liability</SelectItem>
              <SelectItem value="office_bearers">Office Bearers</SelectItem>
              <SelectItem value="fidelity">Fidelity Guarantee</SelectItem>
              <SelectItem value="workers_comp">Workers Compensation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="policy_number">Policy Number *</Label>
          <Input
            id="policy_number"
            placeholder="POL123456"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="insurer_name">Insurer Name *</Label>
          <Input
            id="insurer_name"
            placeholder="e.g. QBE Insurance"
            value={insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="broker_name">Broker Name</Label>
          <Input
            id="broker_name"
            placeholder="e.g. Insurance Brokers Ltd"
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="premium_amount">Annual Premium * ($)</Label>
          <Input
            id="premium_amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="5000.00"
            value={premiumAmount}
            onChange={(e) => setPremiumAmount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sum_insured">Sum Insured ($)</Label>
          <Input
            id="sum_insured"
            type="number"
            step="0.01"
            min="0"
            placeholder="1000000.00"
            value={sumInsured}
            onChange={(e) => setSumInsured(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="excess_amount">Excess Amount ($)</Label>
          <Input
            id="excess_amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="500.00"
            value={excessAmount}
            onChange={(e) => setExcessAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="effective_date">Effective Date *</Label>
          <Input
            id="effective_date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiry_date">Expiry Date *</Label>
          <Input
            id="expiry_date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverage_notes">Coverage Notes</Label>
        <Textarea
          id="coverage_notes"
          placeholder="Brief description of what is covered"
          value={coverageNotes}
          onChange={(e) => setCoverageNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="special_conditions">Special Conditions</Label>
        <Textarea
          id="special_conditions"
          placeholder="Any special conditions or exclusions"
          value={specialConditions}
          onChange={(e) => setSpecialConditions(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Policy'}
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
