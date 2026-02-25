import { Home, Receipt, Calendar, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [schemesResult, lotsResult, overdueResult, openRequestsResult, upcomingMeetingsResult] = await Promise.all([
    supabase.from('schemes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('lots').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('levy_items').select('balance', { count: 'exact', head: false }).eq('status', 'overdue'),
    supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).not('status', 'in', '("completed","closed")'),
    supabase.from('meetings').select('id', { count: 'exact', head: true }).not('status', 'in', '("completed","cancelled","adjourned")'),
  ])

  const totalSchemes = schemesResult.count ?? 0
  const totalLots = lotsResult.count ?? 0
  const overdueItems = overdueResult.data ?? []
  const overdueAmount = overdueItems.reduce((sum, i) => sum + (i.balance ?? 0), 0)
  const openRequestsCount = openRequestsResult.count ?? 0
  const upcomingMeetingsCount = upcomingMeetingsResult.count ?? 0

  const stats = [
    {
      label: 'Total Lots',
      value: totalLots.toString(),
      subtitle: `Across ${totalSchemes} scheme${totalSchemes !== 1 ? 's' : ''}`,
      icon: Home,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Levies Outstanding',
      value: formatCurrency(overdueAmount),
      subtitle: `${overdueItems.length} overdue item${overdueItems.length !== 1 ? 's' : ''}`,
      icon: Receipt,
      iconBg: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Upcoming Meetings',
      value: upcomingMeetingsCount.toString(),
      subtitle: 'Next 30 days',
      icon: Calendar,
      iconBg: 'bg-green-50 text-green-600',
    },
    {
      label: 'Open Maintenance',
      value: openRequestsCount.toString(),
      subtitle: `Request${openRequestsCount !== 1 ? 's' : ''} in progress`,
      icon: Wrench,
      iconBg: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
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
              <p className="mt-2 text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom section: chart + activity feed */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Chart placeholder */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Levy Arrears by Scheme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[240px] items-end gap-6 px-4">
              {['Scheme A', 'Scheme B', 'Scheme C', 'Scheme D', 'Scheme E'].map((name, i) => {
                const pxHeights = [150, 95, 200, 70, 130]
                return (
                  <div key={name} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-primary"
                      style={{ height: `${pxHeights[i]}px` }}
                    />
                    <span className="text-xs text-muted-foreground">{name}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Live chart coming soon
            </p>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { category: 'Levy', text: 'Quarterly levies issued for SP12345', time: '2 hours ago', variant: 'default' as const },
                { category: 'Maintenance', text: 'New request: Pool pump replacement', time: '5 hours ago', variant: 'secondary' as const },
                { category: 'Meeting', text: 'AGM minutes approved', time: '1 day ago', variant: 'outline' as const },
                { category: 'Payment', text: 'Lot 4 payment received — $1,250.00', time: '2 days ago', variant: 'default' as const },
                { category: 'Document', text: 'Insurance certificate uploaded', time: '3 days ago', variant: 'secondary' as const },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge variant={item.variant} className="mt-0.5 shrink-0 text-[10px]">
                    {item.category}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
