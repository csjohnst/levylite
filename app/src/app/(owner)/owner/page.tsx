import Link from 'next/link'
import {
  Receipt,
  Wrench,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getOwnerDashboard } from '@/actions/owner-dashboard'
import { OwnerDashboardClient } from '@/components/owner/owner-dashboard-client'

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function OwnerDashboardPage() {
  const result = await getOwnerDashboard()

  if ('error' in result && !('data' in result)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Unable to load dashboard</h3>
            <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data } = result as { data: NonNullable<Exclude<typeof result, { error: string }>['data']> }
  const {
    owner,
    lots,
    levyBalance,
    nextLevyDue,
    recentPayments,
    upcomingMeetings,
    openMaintenanceRequests,
    paymentStatusByLot,
  } = data

  const hasOverdue = levyBalance.overdue > 0
  const isMultiLot = lots.length > 1

  return (
    <div className="space-y-6">
      {/* Welcome heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome, {owner.first_name}
        </h2>
        <p className="text-muted-foreground">
          Your owner portal overview.
        </p>
      </div>

      {/* Hero Card - Levy Balance */}
      <Card className={hasOverdue ? 'border-red-200' : 'border-green-200'}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Levy Balance</p>
              <p className={`text-4xl font-bold ${hasOverdue ? 'text-red-600' : 'text-foreground'}`}>
                {formatCurrency(levyBalance.total)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {hasOverdue ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <AlertTriangle className="mr-1 size-3" />
                    Overdue
                  </Badge>
                ) : levyBalance.total === 0 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 size-3" />
                    Up to Date
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    <Clock className="mr-1 size-3" />
                    Payment Due
                  </Badge>
                )}
              </div>
            </div>
            {nextLevyDue && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next Levy Due</p>
                <p className="text-lg font-semibold">{formatCurrency(nextLevyDue.amount)}</p>
                <p className="text-sm text-muted-foreground">{formatDate(nextLevyDue.due_date)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Multi-lot breakdown */}
      {isMultiLot && (
        <OwnerDashboardClient lots={lots as unknown as Parameters<typeof OwnerDashboardClient>[0]['lots']} paymentStatusByLot={paymentStatusByLot} />
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 grid-cols-2">
        <Link href="/owner/levies">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Receipt className="size-8 text-[#02667F] mb-2" />
              <p className="text-sm font-medium">View Levy Statement</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/owner/maintenance/new">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Wrench className="size-8 text-[#02667F] mb-2" />
              <p className="text-sm font-medium">Submit Maintenance Request</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/owner/documents">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="size-8 text-[#02667F] mb-2" />
              <p className="text-sm font-medium">View Documents</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/owner/meetings">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar className="size-8 text-[#02667F] mb-2" />
              <p className="text-sm font-medium">Upcoming Meetings</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4" />
              Recent Payments
            </CardTitle>
            <CardDescription>Your last 5 payments</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPayments.length > 0 ? (
              <div className="space-y-3">
                {(recentPayments as unknown as Array<{ id: string; amount: number; payment_date: string; reference: string | null; lots: { lot_number: string } | null }>).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.payment_date)}
                        {payment.reference ? ` - ${payment.reference}` : ''}
                      </p>
                    </div>
                    {payment.lots && (
                      <span className="text-xs text-muted-foreground">
                        Lot {payment.lots.lot_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent payments</p>
            )}
          </CardContent>
        </Card>

        {/* Open Maintenance + Upcoming Meetings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="size-4" />
                Open Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openMaintenanceRequests.length > 0 ? (
                <div className="space-y-2">
                  {openMaintenanceRequests.map((req: { id: string; title: string; status: string; priority: string; created_at: string }) => (
                    <Link
                      key={req.id}
                      href={`/owner/maintenance/${req.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{req.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          req.status === 'in_progress'
                            ? 'bg-orange-100 text-orange-800'
                            : req.status === 'new'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {req.status.replace(/_/g, ' ')}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No open requests</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="size-4" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-2">
                  {upcomingMeetings.map((meeting: { id: string; meeting_type: string; meeting_date: string; location: string | null }) => (
                    <Link
                      key={meeting.id}
                      href="/owner/meetings"
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {meeting.meeting_type === 'agm'
                            ? 'Annual General Meeting'
                            : meeting.meeting_type === 'sgm'
                            ? 'Special General Meeting'
                            : 'Committee Meeting'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(meeting.meeting_date)}
                          {meeting.location ? ` - ${meeting.location}` : ''}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {meeting.meeting_type.toUpperCase()}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming meetings</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
