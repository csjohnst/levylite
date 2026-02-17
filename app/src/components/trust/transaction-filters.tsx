'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface TransactionFiltersProps {
  schemeId: string
}

export function TransactionFilters({ schemeId }: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/schemes/${schemeId}/trust?${params.toString()}`)
  }

  function clearFilters() {
    router.push(`/schemes/${schemeId}/trust`)
  }

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Date From</Label>
        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get('from') ?? ''}
          onChange={(e) => setFilter('from', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Date To</Label>
        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get('to') ?? ''}
          onChange={(e) => setFilter('to', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Type</Label>
        <Select
          value={searchParams.get('type') ?? 'all'}
          onValueChange={(v) => setFilter('type', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
            <SelectItem value="payment">Payment</SelectItem>
            <SelectItem value="journal">Journal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Fund</Label>
        <Select
          value={searchParams.get('fund') ?? 'all'}
          onValueChange={(v) => setFilter('fund', v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Funds</SelectItem>
            <SelectItem value="admin">Admin Fund</SelectItem>
            <SelectItem value="capital_works">Capital Works</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Reconciled</Label>
        <Select
          value={searchParams.get('reconciled') ?? 'all'}
          onValueChange={(v) => setFilter('reconciled', v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Reconciled</SelectItem>
            <SelectItem value="no">Unreconciled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 size-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
