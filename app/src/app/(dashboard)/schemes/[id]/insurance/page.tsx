import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Plus, Calendar, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getInsurancePolicies, getUpcomingRenewals } from '@/actions/insurance'
import { formatCurrency } from '@/lib/utils'

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: schemeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('*')
    .eq('id', schemeId)
    .single()

  if (!scheme) notFound()

  const policiesResult = await getInsurancePolicies(schemeId)
  const renewalsResult = await getUpcomingRenewals(schemeId, 90)

  const policies = policiesResult.data || []
  const renewals = renewalsResult.data || []

  const activePolicies = policies.filter(p => p.status === 'active')
  const expiredPolicies = policies.filter(p => p.status === 'expired')
  const outdatedValuations = activePolicies.filter(p =>
    p.lastValuationDate && new Date(p.lastValuationDate) < new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
  )

  const policyTypeLabels: Record<string, string> = {
    building: 'Building Insurance',
    public_liability: 'Public Liability',
    office_bearers: 'Office Bearers',
    fidelity: 'Fidelity Guarantee',
    workers_comp: 'Workers Compensation',
    other: 'Other',
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  function getDaysUntilRenewal(renewalDate: string) {
    const days = Math.floor((new Date(renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Tracking</h1>
          <p className="text-muted-foreground">{scheme.scheme_name}</p>
        </div>
        <Button asChild>
          <Link href={`/schemes/${schemeId}/insurance/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Policy
          </Link>
        </Button>
      </div>

      {renewals.length > 0 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <strong>{renewals.length} insurance renewal{renewals.length !== 1 ? 's' : ''}</strong> due in the next 90 days
          </AlertDescription>
        </Alert>
      )}

      {outdatedValuations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{outdatedValuations.length} polic{outdatedValuations.length !== 1 ? 'ies have' : 'y has'}</strong> outdated valuations (not updated in 2+ years)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePolicies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renewals.length}</div>
            <p className="text-xs text-muted-foreground">Next 90 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outdated Valuations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outdatedValuations.length}</div>
            <p className="text-xs text-muted-foreground">2+ years old</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Policies</CardTitle>
          <CardDescription>Current insurance coverage for {scheme.scheme_name}</CardDescription>
        </CardHeader>
        <CardContent>
          {activePolicies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No active policies</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Add your first insurance policy to start tracking renewals and valuations.
              </p>
              <Button asChild>
                <Link href={`/schemes/${schemeId}/insurance/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Policy
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Type</TableHead>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead>Last Valuation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePolicies.map((policy) => {
                  const daysUntil = getDaysUntilRenewal(policy.renewalDate)
                  const valuationAge = policy.lastValuationDate
                    ? Math.floor((Date.now() - new Date(policy.lastValuationDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                    : null

                  return (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        {policyTypeLabels[policy.policyType] || policy.policyType}
                      </TableCell>
                      <TableCell>
                        {policy.insurer}
                        {policy.broker && (
                          <span className="text-xs text-muted-foreground"> via {policy.broker}</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(policy.premiumAmount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{formatDate(policy.renewalDate)}</span>
                          {daysUntil <= 30 && (
                            <Badge variant={daysUntil <= 14 ? 'destructive' : 'secondary'}>
                              {daysUntil} days
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {policy.lastValuationDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatDate(policy.lastValuationDate)}</span>
                            {valuationAge !== null && valuationAge >= 2 && (
                              <Badge variant="destructive" className="text-xs">
                                {valuationAge}y old
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No valuation</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/schemes/${schemeId}/insurance/${policy.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {expiredPolicies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expired Policies</CardTitle>
            <CardDescription>Historical coverage records</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Type</TableHead>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>{policyTypeLabels[policy.policyType] || policy.policyType}</TableCell>
                    <TableCell>{policy.insurer}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(policy.policyStartDate)} — {formatDate(policy.policyEndDate)}
                    </TableCell>
                    <TableCell>{formatCurrency(policy.premiumAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
