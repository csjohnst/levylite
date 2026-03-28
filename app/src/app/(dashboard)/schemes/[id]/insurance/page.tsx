import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ShieldCheck, AlertTriangle, Plus, FileText, TrendingUp, AlertCircle, Clock } from 'lucide-react'
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

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme, error } = await supabase
    .from('schemes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !scheme) notFound()

  // Fetch insurance policies with alerts
  const { data: policies } = await supabase
    .from('insurance_policies_with_alerts')
    .select('*')
    .eq('scheme_id', id)
    .order('expiry_date')

  // Fetch valuations
  const { data: valuations } = await supabase
    .from('property_valuations')
    .select('*')
    .eq('scheme_id', id)
    .order('valuation_date', { ascending: false })

  const latestValuation = valuations?.[0]
  const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000
  const isValuationOutdated = latestValuation
    ? (new Date().getTime() - new Date(latestValuation.valuation_date).getTime()) > TWO_YEARS_MS
    : false

  // Count alerts
  const expiredCount = policies?.filter(p => p.alert_status === 'expired').length ?? 0
  const expiringSoonCount = policies?.filter(p => p.alert_status === 'expiring_soon').length ?? 0

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getAlertBadge = (status: string) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Expired</Badge>
      case 'expiring_soon':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Expiring Soon</Badge>
      case 'renewal_due':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Renewal Due</Badge>
      default:
        return <Badge variant="secondary">OK</Badge>
    }
  }

  const getPolicyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      building: 'Building Insurance',
      public_liability: 'Public Liability',
      office_bearers: 'Office Bearers',
      fidelity: 'Fidelity Guarantee',
      workers_comp: 'Workers Compensation',
      other: 'Other',
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/schemes/${id}`} className="text-sm text-muted-foreground hover:text-primary">
            ← Back to {scheme.scheme_name}
          </Link>
          <h1 className="text-3xl font-bold mt-2">Insurance & Valuations</h1>
          <p className="text-muted-foreground mt-1">
            Manage insurance policies and property valuations for {scheme.scheme_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/schemes/${id}/insurance/valuations/new`}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Add Valuation
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/schemes/${id}/insurance/policies/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Policy
            </Link>
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {expiredCount > 0 && `${expiredCount} policy(s) expired. `}
            {expiringSoonCount > 0 && `${expiringSoonCount} policy(s) expiring within 30 days. `}
            Action required to maintain coverage.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active insurance policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired / Expiring</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredCount + expiringSoonCount}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Valuation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestValuation ? formatCurrency(latestValuation.valuation_amount) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {latestValuation ? formatDate(latestValuation.valuation_date) : 'No valuation recorded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valuation Status</CardTitle>
            {isValuationOutdated ? (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestValuation ? (
                isValuationOutdated ? (
                  <Badge variant="outline" className="text-orange-500">Outdated</Badge>
                ) : (
                  <Badge variant="secondary">Current</Badge>
                )
              ) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isValuationOutdated
                ? 'Valuation is over 2 years old'
                : 'Valuation up to date'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Policies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Insurance Policies
          </CardTitle>
          <CardDescription>
            All insurance policies for this strata scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!policies || policies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No insurance policies recorded yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/schemes/${id}/insurance/policies/new`}>
                  Add Your First Policy
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Type</TableHead>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Policy Number</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Sum Insured</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{getPolicyTypeLabel(policy.policy_type)}</TableCell>
                    <TableCell>{policy.insurer_name}</TableCell>
                    <TableCell className="font-mono text-sm">{policy.policy_number}</TableCell>
                    <TableCell className="text-right">{formatCurrency(policy.premium_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(policy.sum_insured)}</TableCell>
                    <TableCell>{formatDate(policy.expiry_date)}</TableCell>
                    <TableCell>{getAlertBadge(policy.alert_status)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/schemes/${id}/insurance/policies/${policy.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Property Valuations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Property Valuations
          </CardTitle>
          <CardDescription>
            Historical property valuations for insurance purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!valuations || valuations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No property valuations recorded yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/schemes/${id}/insurance/valuations/new`}>
                  Add Your First Valuation
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Valuation Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Valuer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuations.map((valuation) => (
                  <TableRow key={valuation.id}>
                    <TableCell>{formatDate(valuation.valuation_date)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(valuation.valuation_amount)}
                    </TableCell>
                    <TableCell className="capitalize">{valuation.valuation_type.replace('_', ' ')}</TableCell>
                    <TableCell>{valuation.valuer_name}</TableCell>
                    <TableCell>{valuation.valuer_company || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/schemes/${id}/insurance/valuations/${valuation.id}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
