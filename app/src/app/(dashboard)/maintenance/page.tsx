import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Wrench, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800',
  urgent: 'bg-amber-100 text-amber-800',
  routine: 'bg-blue-100 text-blue-800',
  cosmetic: 'bg-gray-100 text-gray-800',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-800',
}

export default async function MaintenanceIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orgUser } = await supabase
    .from('organisation_users')
    .select('organisation_id')
    .eq('user_id', user.id)
    .single()

  if (!orgUser) redirect('/')

  const { data: schemes } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number, status')
    .eq('organisation_id', orgUser.organisation_id)
    .eq('status', 'active')
    .order('scheme_name')

  // Get maintenance request counts per scheme (open requests only)
  const schemeIds = schemes?.map(s => s.id) ?? []
  const requestCounts: Record<string, { total: number; emergency: number; urgent: number }> = {}

  if (schemeIds.length > 0) {
    const { data: requests } = await supabase
      .from('maintenance_requests')
      .select('scheme_id, priority, status')
      .in('scheme_id', schemeIds)
      .not('status', 'in', '("completed","closed")')

    if (requests) {
      for (const r of requests) {
        if (!requestCounts[r.scheme_id]) {
          requestCounts[r.scheme_id] = { total: 0, emergency: 0, urgent: 0 }
        }
        requestCounts[r.scheme_id].total++
        if (r.priority === 'emergency') requestCounts[r.scheme_id].emergency++
        if (r.priority === 'urgent') requestCounts[r.scheme_id].urgent++
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Maintenance</h2>
        <p className="text-muted-foreground">
          Manage maintenance requests across all your schemes
        </p>
      </div>

      {schemes && schemes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.map((scheme) => {
            const counts = requestCounts[scheme.id] ?? { total: 0, emergency: 0, urgent: 0 }
            return (
              <Link key={scheme.id} href={`/schemes/${scheme.id}/maintenance`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{scheme.scheme_name}</CardTitle>
                      <CardDescription>{scheme.scheme_number}</CardDescription>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {counts.total > 0
                        ? `${counts.total} open request${counts.total !== 1 ? 's' : ''}`
                        : 'No open requests'
                      }
                    </p>
                    {(counts.emergency > 0 || counts.urgent > 0) && (
                      <div className="flex gap-1 mt-1">
                        {counts.emergency > 0 && (
                          <Badge variant="secondary" className={PRIORITY_COLORS.emergency + ' text-[10px] px-1.5 py-0'}>
                            {counts.emergency} emergency
                          </Badge>
                        )}
                        {counts.urgent > 0 && (
                          <Badge variant="secondary" className={PRIORITY_COLORS.urgent + ' text-[10px] px-1.5 py-0'}>
                            {counts.urgent} urgent
                          </Badge>
                        )}
                      </div>
                    )}
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
            <h3 className="text-lg font-medium">No schemes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a scheme first before managing maintenance requests.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
