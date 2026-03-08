'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createInsurancePolicy, updateInsurancePolicy } from '@/actions/insurance'
import type { InsurancePolicy } from '@/lib/types'

interface InsurancePolicyFormProps {
  schemeId: string
  policy?: InsurancePolicy
}

const POLICY_TYPES = [
  { value: 'building', label: 'Building Insurance' },
  { value: 'public_liability', label: 'Public Liability' },
  { value: 'office_bearers', label: 'Office Bearers' },
  { value: 'fidelity', label: 'Fidelity Guarantee' },
  { value: 'workers_comp', label: 'Workers Compensation' },
  { value: 'other', label: 'Other' },
] as const

export function InsurancePolicyForm({ schemeId, policy }: InsurancePolicyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const toNumber = (val: string) => val === '' ? null : parseFloat(val)

    const data = {
      policy_type: formData.get('policy_type') as any,
      policy_number: formData.get('policy_number') as string || null,
      insurer: formData.get('insurer') as string,
      broker: formData.get('broker') as string || null,
      premium_amount: parseFloat(formData.get('premium_amount') as string),
      sum_insured: toNumber(formData.get('sum_insured') as string),
      policy_start_date: formData.get('policy_start_date') as string,
      policy_end_date: formData.get('policy_end_date') as string,
      renewal_date: formData.get('renewal_date') as string,
      last_valuation_date: formData.get('last_valuation_date') as string || null,
      last_valuation_amount: toNumber(formData.get('last_valuation_amount') as string),
      valuer_name: formData.get('valuer_name') as string || null,
      valuer_company: formData.get('valuer_company') as string || null,
      valuation_notes: formData.get('valuation_notes') as string || null,
      notes: formData.get('notes') as string || null,
      status: 'active' as const,
    }

    const result = policy
      ? await updateInsurancePolicy(policy.id, data)
      : await createInsurancePolicy(schemeId, data)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success(policy ? 'Policy updated' : 'Policy created')
    router.push(`/schemes/${schemeId}/insurance`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Policy Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="policy_type">Policy Type *</Label>
              <Select name="policy_type" defaultValue={policy?.policyType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="policy_number">Policy Number</Label>
              <Input name="policy_number" defaultValue={policy?.policyNumber || ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insurer">Insurer *</Label>
              <Input name="insurer" defaultValue={policy?.insurer || ''} required />
            </div>
            <div>
              <Label htmlFor="broker">Broker</Label>
              <Input name="broker" defaultValue={policy?.broker || ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="premium_amount">Annual Premium (AUD) *</Label>
              <Input name="premium_amount" type="number" step="0.01" defaultValue={policy?.premiumAmount || ''} required />
            </div>
            <div>
              <Label htmlFor="sum_insured">Sum Insured (AUD)</Label>
              <Input name="sum_insured" type="number" step="0.01" defaultValue={policy?.sumInsured || ''} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="policy_start_date">Start Date *</Label>
              <Input name="policy_start_date" type="date" defaultValue={policy?.policyStartDate || ''} required />
            </div>
            <div>
              <Label htmlFor="policy_end_date">End Date *</Label>
              <Input name="policy_end_date" type="date" defaultValue={policy?.policyEndDate || ''} required />
            </div>
            <div>
              <Label htmlFor="renewal_date">Renewal Date *</Label>
              <Input name="renewal_date" type="date" defaultValue={policy?.renewalDate || ''} required />
            </div>
          </div>

          <hr className="my-6" />

          <h3 className="text-lg font-semibold">Valuation Details (Optional)</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="last_valuation_date">Last Valuation Date</Label>
              <Input name="last_valuation_date" type="date" defaultValue={policy?.lastValuationDate || ''} />
            </div>
            <div>
              <Label htmlFor="last_valuation_amount">Valuation Amount (AUD)</Label>
              <Input name="last_valuation_amount" type="number" step="0.01" defaultValue={policy?.lastValuationAmount || ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valuer_name">Valuer Name</Label>
              <Input name="valuer_name" defaultValue={policy?.valuerName || ''} />
            </div>
            <div>
              <Label htmlFor="valuer_company">Valuer Company</Label>
              <Input name="valuer_company" defaultValue={policy?.valuerCompany || ''} />
            </div>
          </div>

          <div>
            <Label htmlFor="valuation_notes">Valuation Notes</Label>
            <Textarea name="valuation_notes" defaultValue={policy?.valuationNotes || ''} rows={2} />
          </div>

          <hr className="my-6" />

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea name="notes" defaultValue={policy?.notes || ''} rows={3} />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
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
        </CardContent>
      </Card>
    </form>
  )
}
