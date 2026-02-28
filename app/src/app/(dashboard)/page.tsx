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

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [schemesResult, lotsResult, overdueResult, openRequestsResult, upcomingMeetingsResult, arrearsResult, recentPayments, recentMaintenance, recentMeetings, recentDocuments, recentLevySchedules] = await Promise.all([
    supabase.from('schemes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('lots').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('levy_items').select('balance', { count: 'exact', head: false }).eq('status', 'overdue'),
    supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).not('status', 'in', '("completed","closed")'),
    supabase.from('meetings').select('id', { count: 'exact', head: true }).not('status', 'in', '("completed","cancelled","adjourned")'),
    // Levy arrears grouped by scheme
    supabase.from('levy_items').select('scheme_id, balance, schemes(scheme_name)').in('status', ['overdue', 'partial']).gt('balance', 0),
    // Recent activity: payments
    supabase.from('payments').select('id, amount, payment_date, created_at, lots(lot_number)').order('created_at', { ascending: false }).limit(5),
    // Recent activity: maintenance requests
    supabase.from('maintenance_requests').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
    // Recent activity: meetings
    supabase.from('meetings').select('id, meeting_type, status, meeting_date, created_at').order('created_at', { ascending: false }).limit(5),
    // Recent activity: documents
    supabase.from('documents').select('id, document_name, category, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    // Recent activity: levy schedules
    supabase.from('levy_schedules').select('id, frequency, created_at, schemes(scheme_number)').order('created_at', { ascending: false }).limit(5),
  ])

  const totalSchemes = schemesResult.count ?? 0
  const totalLots = lotsResult.count ?? 0
  const overdueItems = overdueResult.data ?? []
  const overdueAmount = overdueItems.reduce((sum, i) => sum + (i.balance ?? 0), 0)
  const openRequestsCount = openRequestsResult.count ?? 0
  const upcomingMeetingsCount = upcomingMeetingsResult.count ?? 0

  // Aggregate arrears by scheme
  const arrearsByScheme = new Map<string, { name: string; total: number }>()
  for (const item of arrearsResult.data ?? []) {
    const schemeId = item.scheme_id as string
    const schemeName = (item.schemes as unknown as { scheme_name: string } | null)?.scheme_name ?? 'Unknown'
    const existing = arrearsByScheme.get(schemeId)
    if (existing) {
      existing.total += Number(item.balance) || 0
    } else {
      arrearsByScheme.set(schemeId, { name: schemeName, total: Number(item.balance) || 0 })
    }
  }
  const schemeArrears = [...arrearsByScheme.values()].sort((a, b) => b.total - a.total)
  const maxArrears = Math.max(...schemeArrears.map((s) => s.total), 1)

  // Build unified activity feed
  type ActivityItem = { category: string; text: string; time: Date; variant: 'default' | 'secondary' | 'outline' }
  const activityItems: ActivityItem[] = []

  for (const p of recentPayments.data ?? []) {
    const lotNum = (p.lots as unknown as { lot_number: string } | null)?.lot_number ?? '?'
    activityItems.push({
      category: 'Payment',
      text: `Lot ${lotNum} payment received — ${formatCurrency(Number(p.amount))}`,
      time: new Date(p.created_at),
      variant: 'default',
    })
  }
  for (const m of recentMaintenance.data ?? []) {
    activityItems.push({
      category: 'Maintenance',
      text: `${m.status === 'new' ? 'New request' : m.status === 'completed' ? 'Completed' : 'Updated'}: ${m.title}`,
      time: new Date(m.created_at),
      variant: 'secondary',
    })
  }
  for (const mt of recentMeetings.data ?? []) {
    const typeLabel = mt.meeting_type === 'agm' ? 'AGM' : mt.meeting_type === 'sgm' ? 'SGM' : 'Committee'
    activityItems.push({
      category: 'Meeting',
      text: `${typeLabel} ${mt.status === 'completed' ? 'completed' : mt.status === 'scheduled' ? 'scheduled' : 'created'}`,
      time: new Date(mt.created_at),
      variant: 'outline',
    })
  }
  for (const d of recentDocuments.data ?? []) {
    activityItems.push({
      category: 'Document',
      text: `${d.document_name} uploaded`,
      time: new Date(d.created_at),
      variant: 'secondary',
    })
  }
  for (const ls of recentLevySchedules.data ?? []) {
    const schemeNum = (ls.schemes as unknown as { scheme_number: string } | null)?.scheme_number ?? '?'
    activityItems.push({
      category: 'Levy',
      text: `${ls.frequency.charAt(0).toUpperCase() + ls.frequency.slice(1)} levies issued for ${schemeNum}`,
      time: new Date(ls.created_at),
      variant: 'default',
    })
  }

  // Sort by most recent, take top 8
  activityItems.sort((a, b) => b.time.getTime() - a.time.getTime())
  const recentActivity = activityItems.slice(0, 8)

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
        {/* Levy arrears chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Levy Arrears by Scheme</CardTitle>
          </CardHeader>
          <CardContent>
            {schemeArrears.length === 0 ? (
              <div className="flex h-[240px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No outstanding arrears</p>
              </div>
            ) : (
              <div className="flex h-[240px] items-end gap-6 px-4">
                {schemeArrears.map((scheme) => {
                  const heightPx = Math.max(8, Math.round((scheme.total / maxArrears) * 200))
                  return (
                    <div key={scheme.name} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-medium">{formatCurrency(scheme.total)}</span>
                      <div
                        className="w-full rounded-t-md bg-primary"
                        style={{ height: `${heightPx}px` }}
                      />
                      <span className="text-xs text-muted-foreground text-center truncate w-full">{scheme.name}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Badge variant={item.variant} className="mt-0.5 w-[90px] justify-center shrink-0 text-[10px]">
                      {item.category}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{item.text}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(item.time)}</p>
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
