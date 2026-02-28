import { Building2, Users, CreditCard, DollarSign } from 'lucide-react'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAdminDashboardStats } from '@/actions/admin/admin-dashboard'

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

function statusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'Active':
      return 'default'
    case 'Trialing':
      return 'secondary'
    case 'Past Due':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default async function AdminDashboardPage() {
  const result = await getAdminDashboardStats()
  if ('error' in result) redirect('/login')

  const {
    totalOrgs,
    totalUsers,
    activeSubscriptions,
    totalRevenue,
    subscriptionBreakdown,
    recentSignups,
  } = result

  const stats = [
    {
      label: 'Total Organisations',
      value: totalOrgs.toString(),
      icon: Building2,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Total Users',
      value: totalUsers.toString(),
      icon: Users,
      iconBg: 'bg-green-50 text-green-600',
    },
    {
      label: 'Active Subscriptions',
      value: activeSubscriptions.toString(),
      icon: CreditCard,
      iconBg: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-2.5 ${stat.iconBg}`}>
                  <stat.icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Subscription breakdown */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Subscription Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptionBreakdown.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent signups */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organisations yet.</p>
            ) : (
              <div className="space-y-4">
                {recentSignups.map((org) => (
                  <div key={org.id} className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Building2 className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{org.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(org.createdAt)} &middot; {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
