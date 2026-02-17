'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

export interface IncomeStatementCategory {
  category_id: string
  code: string
  name: string
  fund_type: string | null
  total: number
}

export interface IncomeStatementFund {
  income: IncomeStatementCategory[]
  expenses: IncomeStatementCategory[]
  total_income: number
  total_expenses: number
  net: number
}

export interface IncomeStatement {
  admin: IncomeStatementFund
  capital_works: IncomeStatementFund
  combined: {
    total_income: number
    total_expenses: number
    net: number
  }
}

interface IncomeStatementTableProps {
  statement: IncomeStatement
}

const FUND_LABELS: Record<string, string> = {
  admin: 'Admin Fund',
  capital_works: 'Capital Works Fund',
}

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function FundSection({ label, fund }: { label: string; fund: IncomeStatementFund }) {
  const hasActivity = fund.income.length > 0 || fund.expenses.length > 0

  if (!hasActivity) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Income section */}
        {fund.income.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Income</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fund.income.map(cat => (
                    <TableRow key={cat.category_id}>
                      <TableCell className="font-mono text-sm">{cat.code}</TableCell>
                      <TableCell>{cat.name}</TableCell>
                      <TableCell className="text-right font-mono text-green-700">{formatCurrency(cat.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Total Income</TableCell>
                    <TableCell className="text-right font-mono text-green-700">{formatCurrency(fund.total_income)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        )}

        {/* Expense section */}
        {fund.expenses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Expenses</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fund.expenses.map(cat => (
                    <TableRow key={cat.category_id}>
                      <TableCell className="font-mono text-sm">{cat.code}</TableCell>
                      <TableCell>{cat.name}</TableCell>
                      <TableCell className="text-right font-mono text-red-700">{formatCurrency(cat.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2}>Total Expenses</TableCell>
                    <TableCell className="text-right font-mono text-red-700">{formatCurrency(fund.total_expenses)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between px-1">
          <span className="text-base font-bold">
            Net {fund.net >= 0 ? 'Surplus' : 'Deficit'}
          </span>
          <span className={`font-mono text-lg font-bold ${fund.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {fund.net < 0 && '-'}{formatCurrency(fund.net)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function IncomeStatementTable({ statement }: IncomeStatementTableProps) {
  return (
    <div className="space-y-6">
      <FundSection label={FUND_LABELS.admin} fund={statement.admin} />
      <FundSection label={FUND_LABELS.capital_works} fund={statement.capital_works} />

      {/* Combined totals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Combined Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Income</span>
            <span className="font-mono font-medium text-green-700">{formatCurrency(statement.combined.total_income)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Expenses</span>
            <span className="font-mono font-medium text-red-700">{formatCurrency(statement.combined.total_expenses)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">
              Net {statement.combined.net >= 0 ? 'Surplus' : 'Deficit'}
            </span>
            <Badge
              variant={statement.combined.net >= 0 ? 'default' : 'destructive'}
              className="text-base px-3 py-1 font-mono"
            >
              {statement.combined.net < 0 && '-'}{formatCurrency(statement.combined.net)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
