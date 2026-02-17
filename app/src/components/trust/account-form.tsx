'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { createAccount, updateAccount } from '@/actions/chart-of-accounts'
import type { Account } from '@/components/trust/chart-of-accounts-table'

interface AccountFormProps {
  schemeId: string
  account?: Account
  onSuccess?: () => void
}

export function AccountForm({ schemeId, account, onSuccess }: AccountFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState(account?.code ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [accountType, setAccountType] = useState(account?.account_type ?? 'expense')
  const [fundType, setFundType] = useState(account?.fund_type ?? 'none')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const data = {
      code,
      name,
      account_type: accountType as 'asset' | 'liability' | 'income' | 'expense' | 'equity',
      fund_type: fundType === 'none' ? null : (fundType as 'admin' | 'capital_works'),
    }

    const result = account
      ? await updateAccount(account.id, data)
      : await createAccount(schemeId, data)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(account ? 'Account updated' : 'Account created')
      router.refresh()
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Account Code</Label>
          <Input
            id="code"
            placeholder="e.g. 6800"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={4}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_type">Account Type</Label>
          <Select value={accountType} onValueChange={setAccountType}>
            <SelectTrigger id="account_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="liability">Liability</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          placeholder="e.g. Cleaning Expenses"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fund_type">Fund</Label>
        <Select value={fundType} onValueChange={setFundType}>
          <SelectTrigger id="fund_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific fund</SelectItem>
            <SelectItem value="admin">Admin Fund</SelectItem>
            <SelectItem value="capital_works">Capital Works Fund</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
        </Button>
      </div>
    </form>
  )
}
