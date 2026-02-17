'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'

export interface TrialBalanceRow {
  account_id: string
  code: string
  name: string
  account_type: string
  fund_type: string | null
  total_debits: number
  total_credits: number
  balance: number
}

interface TrialBalanceTableProps {
  rows: TrialBalanceRow[]
  totalDebits: number
  totalCredits: number
  isBalanced: boolean
}

const ACCOUNT_TYPE_ORDER = ['asset', 'liability', 'equity', 'income', 'expense'] as const
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TrialBalanceTable({ rows, totalDebits, totalCredits, isBalanced }: TrialBalanceTableProps) {
  const grouped = ACCOUNT_TYPE_ORDER.map(type => ({
    type,
    label: ACCOUNT_TYPE_LABELS[type],
    rows: rows.filter(r => r.account_type === type),
  })).filter(g => g.rows.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-sm px-3 py-1">
          {isBalanced ? 'Balanced' : `UNBALANCED (difference: ${formatCurrency(totalDebits - totalCredits)})`}
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(group => (
              <>
                <TableRow key={group.type} className="bg-muted/50">
                  <TableCell colSpan={5} className="font-semibold text-sm uppercase tracking-wide">
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.rows.map(row => (
                  <TableRow key={row.account_id}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.total_debits > 0 ? formatCurrency(row.total_debits) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.total_credits > 0 ? formatCurrency(row.total_credits) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-medium ${row.balance >= 0 ? '' : 'text-red-600'}`}>
                      {row.balance !== 0 ? (row.balance < 0 ? `(${formatCurrency(row.balance)})` : formatCurrency(row.balance)) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold">
              <TableCell colSpan={2}>Totals</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalDebits)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalCredits)}</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(totalDebits - totalCredits)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
