'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Ban, CheckCircle, Building2, Users, CreditCard, LayoutList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateOrganisation,
  suspendOrganisation,
  unsuspendOrganisation,
} from '@/actions/admin/admin-organisations'
import type { OrganisationDetail } from '@/actions/admin/admin-organisations'

function getStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">No subscription</Badge>

  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-200' },
    trialing: { label: 'Trialing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    canceled: { label: 'Canceled', className: 'bg-red-100 text-red-800 border-red-200' },
    past_due: { label: 'Past Due', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800 border-red-200' },
    free: { label: 'Free', className: 'bg-gray-100 text-gray-800 border-gray-200' },
  }

  const c = config[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

interface Props {
  organisation: OrganisationDetail
}

export function OrganisationDetailClient({ organisation: org }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(org.name)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await updateOrganisation(org.id, { name: editName })
    setSaving(false)
    if (!('error' in result)) {
      setEditOpen(false)
      router.refresh()
    }
  }

  async function handleSuspend() {
    setActionLoading(true)
    await suspendOrganisation(org.id)
    router.refresh()
    setActionLoading(false)
  }

  async function handleUnsuspend() {
    setActionLoading(true)
    await unsuspendOrganisation(org.id)
    router.refresh()
    setActionLoading(false)
  }

  const isSuspended = org.subscription?.status === 'suspended'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/organisations">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{org.name}</h2>
            <p className="text-sm text-muted-foreground">
              Created {new Date(org.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4 mr-2" />
            Edit
          </Button>
          {org.subscription && (
            isSuspended ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnsuspend}
                disabled={actionLoading}
              >
                <CheckCircle className="size-4 mr-2" />
                Unsuspend
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSuspend}
                disabled={actionLoading}
              >
                <Ban className="size-4 mr-2" />
                Suspend
              </Button>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="size-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="size-4 mr-2" />
            Members ({org.usage.members})
          </TabsTrigger>
          <TabsTrigger value="schemes">
            <LayoutList className="size-4 mr-2" />
            Schemes ({org.usage.schemes})
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="size-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {getStatusBadge(org.subscription?.status ?? null)}
                  {org.subscription && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Plan: {org.subscription.plan_name}
                    </p>
                  )}
                  {org.subscription?.trial_end_date && (
                    <p className="text-sm text-muted-foreground">
                      Trial ends: {new Date(org.subscription.trial_end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>{org.usage.schemes} schemes</p>
                  <p>{org.usage.lots} lots</p>
                  <p>{org.usage.members} members</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {new Date(org.created_at).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Updated:</span>{' '}
                    {new Date(org.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-2 break-all">
                    ID: {org.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  org.members.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Schemes Tab */}
        <TabsContent value="schemes">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead className="text-center">Lots</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.schemes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No schemes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  org.schemes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.scheme_name}</TableCell>
                      <TableCell>{s.scheme_number}</TableCell>
                      <TableCell className="text-center">{s.lot_count}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {s.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          {org.invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No invoices found for this organisation.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        {inv.invoice_number ?? inv.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {new Date(inv.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ${(inv.amount_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organisation Name</Label>
              <Input
                id="org-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editName.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
