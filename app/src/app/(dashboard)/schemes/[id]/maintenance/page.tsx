import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
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
} from '@/components/ui/table'

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

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  quoted: 'Quoted',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
}

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  painting: 'Painting',
  landscaping: 'Landscaping',
  pest_control: 'Pest Control',
  cleaning: 'Cleaning',
  security: 'Security',
  general: 'General',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function SchemeMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      tradespeople:assigned_to(id, business_name, contact_name),
      lots:lot_id(id, lot_number, unit_number)
    `)
    .eq('scheme_id', id)
    .order('created_at', { ascending: false })

  const allRequests = requests ?? []
  const openRequests = allRequests.filter(r => r.status !== 'completed' && r.status !== 'closed')

  // Summary stats
  const emergencyCount = openRequests.filter(r => r.priority === 'emergency').length
  const urgentCount = openRequests.filter(r => r.priority === 'urgent').length
  const routineCount = openRequests.filter(r => r.priority === 'routine').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Maintenance Requests</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash; Maintenance
          </p>
        </div>
        <Button asChild>
          <Link href={`/schemes/${id}/maintenance/new`}>
            <Plus className="mr-2 size-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Requests</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{openRequests.length}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Emergency</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${emergencyCount > 0 ? 'text-red-600' : ''}`}>
              {emergencyCount}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Urgent</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${urgentCount > 0 ? 'text-amber-600' : ''}`}>
              {urgentCount}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Routine</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{routineCount}</CardTitle>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      {allRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No maintenance requests</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first maintenance request to start tracking work.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/schemes/${id}/maintenance/new`}>
                <Plus className="mr-2 size-4" />
                New Request
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
            <CardDescription>
              {allRequests.length} request{allRequests.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequests.map(request => {
                  const tp = request.tradespeople as { id: string; business_name: string; contact_name: string | null } | null
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link
                          href={`/schemes/${id}/maintenance/${request.id}`}
                          className="font-medium hover:underline"
                        >
                          {request.title}
                        </Link>
                        {request.location && (
                          <p className="text-xs text-muted-foreground">{request.location}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={PRIORITY_COLORS[request.priority] ?? ''}>
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[request.status] ?? ''}>
                          {STATUS_LABELS[request.status] ?? request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.category ? (CATEGORY_LABELS[request.category] ?? request.category) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tp ? tp.business_name : <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(request.created_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
