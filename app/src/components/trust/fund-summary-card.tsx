'use client'

import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export interface FundBalance {
  fund_type: 'admin' | 'capital_works'
  opening_balance: number
  total_receipts: number
  total_payments: number
  closing_balance: number
}

interface FundSummaryCardProps {
  fund: FundBalance
}

const FUND_LABELS: Record<string, string> = {
  admin: 'Admin Fund',
  capital_works: 'Capital Works Fund',
}

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function FundSummaryCard({ fund }: FundSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <CardTitle className="text-lg">{FUND_LABELS[fund.fund_type]}</CardTitle>
        </div>
        <CardDescription>Fund balance summary for the selected period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Opening Balance</span>
          <span className="font-mono font-medium">{formatCurrency(fund.opening_balance)}</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-sm flex items-center gap-1.5">
            <ArrowUpRight className="size-4 text-green-600" />
            Receipts
          </span>
          <span className="font-mono font-medium text-green-700">+{formatCurrency(fund.total_receipts)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm flex items-center gap-1.5">
            <ArrowDownRight className="size-4 text-red-600" />
            Payments
          </span>
          <span className="font-mono font-medium text-red-700">-{formatCurrency(fund.total_payments)}</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Closing Balance</span>
          <span className={`font-mono text-lg font-bold ${fund.closing_balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fund.closing_balance < 0 && '-'}{formatCurrency(fund.closing_balance)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
