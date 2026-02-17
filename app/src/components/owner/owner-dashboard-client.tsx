'use client'

import { Fragment } from 'react'
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PaymentStatus {
  lot_id: string
  balance: number
  status: 'up_to_date' | 'overdue' | 'partial'
}

interface Lot {
  lot_id: string
  lots: {
    id: string
    lot_number: string
    unit_number: string | null
    schemes: {
      id: string
      scheme_name: string
    }
  }
}

interface OwnerDashboardClientProps {
  lots: Lot[]
  paymentStatusByLot: PaymentStatus[]
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_CONFIG = {
  up_to_date: {
    label: 'Up to Date',
    className: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-800',
    icon: AlertTriangle,
  },
  partial: {
    label: 'Payment Due',
    className: 'bg-amber-100 text-amber-800',
    icon: Clock,
  },
}

export function OwnerDashboardClient({ lots, paymentStatusByLot }: OwnerDashboardClientProps) {
  const statusMap = new Map(paymentStatusByLot.map((s) => [s.lot_id, s]))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Lots</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lots.map((ownership) => {
            const lot = ownership.lots as unknown as {
              id: string
              lot_number: string
              unit_number: string | null
              schemes: { id: string; scheme_name: string }
            }
            const status = statusMap.get(ownership.lot_id)
            const config = status ? STATUS_CONFIG[status.status] : STATUS_CONFIG.up_to_date
            const Icon = config.icon

            return (
              <div
                key={ownership.lot_id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {lot.schemes?.scheme_name ?? 'Unknown Scheme'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lot {lot.lot_number}
                    {lot.unit_number ? ` (Unit ${lot.unit_number})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-sm font-medium">
                    {formatCurrency(status?.balance ?? 0)}
                  </span>
                  <Badge variant="secondary" className={config.className}>
                    <Icon className="mr-1 size-3" />
                    {config.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
