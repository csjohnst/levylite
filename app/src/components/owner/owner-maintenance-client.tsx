'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface MaintenanceRequest {
  id: string
  title: string
  status: string
  priority: string
  created_at: string
  lot_id: string | null
  lots: { lot_number: string; unit_number: string | null } | null
}

interface OwnerMaintenanceClientProps {
  requests: MaintenanceRequest[]
}

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  new: { className: 'bg-gray-100 text-gray-800', label: 'New' },
  acknowledged: { className: 'bg-blue-100 text-blue-800', label: 'Acknowledged' },
  assigned: { className: 'bg-indigo-100 text-indigo-800', label: 'Assigned' },
  quoted: { className: 'bg-yellow-100 text-yellow-800', label: 'Quoted' },
  approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
  in_progress: { className: 'bg-orange-100 text-orange-800', label: 'In Progress' },
  completed: { className: 'bg-emerald-100 text-emerald-800', label: 'Completed' },
  closed: { className: 'bg-slate-100 text-slate-800', label: 'Closed' },
}

const PRIORITY_BADGES: Record<string, { className: string; label: string }> = {
  emergency: { className: 'bg-red-100 text-red-800', label: 'Emergency' },
  urgent: { className: 'bg-amber-100 text-amber-800', label: 'Urgent' },
  routine: { className: 'bg-blue-100 text-blue-800', label: 'Routine' },
  cosmetic: { className: 'bg-gray-100 text-gray-800', label: 'Cosmetic' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export function OwnerMaintenanceClient({ requests }: OwnerMaintenanceClientProps) {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = requests.filter((req) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'open') {
      return !['completed', 'closed'].includes(req.status)
    }
    if (statusFilter === 'completed') {
      return ['completed', 'closed'].includes(req.status)
    }
    return req.status === statusFilter
  })

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((req) => {
            const statusBadge = STATUS_BADGES[req.status] ?? STATUS_BADGES.new
            const priorityBadge = PRIORITY_BADGES[req.priority] ?? PRIORITY_BADGES.routine

            return (
              <Link key={req.id} href={`/owner/maintenance/${req.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{req.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </span>
                        {req.lots && (
                          <span className="text-xs text-muted-foreground">
                            Lot {req.lots.lot_number}
                            {req.lots.unit_number ? ` (Unit ${req.lots.unit_number})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Badge variant="secondary" className={priorityBadge.className}>
                        {priorityBadge.label}
                      </Badge>
                      <Badge variant="secondary" className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No requests found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No maintenance requests match the selected filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
