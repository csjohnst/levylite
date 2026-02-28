'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreHorizontal, ArrowUpDown, Calendar, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  changePlan,
  extendTrial,
  cancelSubscription,
} from '@/actions/admin/admin-subscriptions'

interface Subscription {
  id: string
  orgId: string
  orgName: string
  planName: string
  planId: string | null
  status: string
  lotCount: number
  trialEndDate: string | null
  nextBilling: string | null
  createdAt: string
}

interface Plan {
  id: string
  plan_name: string
}

interface SubscriptionsTableProps {
  subscriptions: Subscription[]
  plans: Plan[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: 'Active',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    trialing: {
      label: 'Trialing',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    },
    canceled: {
      label: 'Canceled',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    past_due: {
      label: 'Past Due',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    paused: {
      label: 'Paused',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    },
    free: {
      label: 'Free',
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    },
    suspended: {
      label: 'Suspended',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    incomplete: {
      label: 'Incomplete',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
  }

  const c = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  }

  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  )
}

export function SubscriptionsTable({ subscriptions, plans }: SubscriptionsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Change Plan dialog state
  const [changePlanOpen, setChangePlanOpen] = useState(false)
  const [changePlanSub, setChangePlanSub] = useState<Subscription | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  // Extend Trial dialog state
  const [extendTrialOpen, setExtendTrialOpen] = useState(false)
  const [extendTrialSub, setExtendTrialSub] = useState<Subscription | null>(null)
  const [trialEndDate, setTrialEndDate] = useState('')

  // Cancel dialog state
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelSub, setCancelSub] = useState<Subscription | null>(null)

  async function handleChangePlan() {
    if (!changePlanSub || !selectedPlanId) return
    setLoading(true)
    const result = await changePlan(changePlanSub.id, selectedPlanId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Plan updated successfully')
      setChangePlanOpen(false)
      router.refresh()
    }
  }

  async function handleExtendTrial() {
    if (!extendTrialSub || !trialEndDate) return
    setLoading(true)
    const result = await extendTrial(extendTrialSub.id, trialEndDate)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Trial extended successfully')
      setExtendTrialOpen(false)
      router.refresh()
    }
  }

  async function handleCancel() {
    if (!cancelSub) return
    setLoading(true)
    const result = await cancelSubscription(cancelSub.id)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Subscription canceled')
      setCancelOpen(false)
      router.refresh()
    }
  }

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No subscriptions found.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Lots</TableHead>
              <TableHead>Trial End</TableHead>
              <TableHead>Next Billing</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/organisations/${sub.orgId}`}
                    className="text-primary hover:underline"
                  >
                    {sub.orgName}
                  </Link>
                </TableCell>
                <TableCell>{sub.planName}</TableCell>
                <TableCell>{statusBadge(sub.status)}</TableCell>
                <TableCell className="text-right">{sub.lotCount}</TableCell>
                <TableCell>{formatDate(sub.trialEndDate)}</TableCell>
                <TableCell>{formatDate(sub.nextBilling)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setChangePlanSub(sub)
                          setSelectedPlanId(sub.planId ?? '')
                          setChangePlanOpen(true)
                        }}
                      >
                        <ArrowUpDown className="mr-2 size-4" />
                        Change Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setExtendTrialSub(sub)
                          setTrialEndDate(sub.trialEndDate ?? '')
                          setExtendTrialOpen(true)
                        }}
                      >
                        <Calendar className="mr-2 size-4" />
                        Extend Trial
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setCancelSub(sub)
                          setCancelOpen(true)
                        }}
                        className="text-destructive focus:text-destructive"
                        disabled={sub.status === 'canceled'}
                      >
                        <XCircle className="mr-2 size-4" />
                        Cancel Subscription
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {changePlanSub?.orgName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.plan_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePlan} disabled={loading || !selectedPlanId}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Dialog */}
      <Dialog open={extendTrialOpen} onOpenChange={setExtendTrialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Trial</DialogTitle>
            <DialogDescription>
              Set a new trial end date for {extendTrialSub?.orgName}. This will also
              set the subscription status to trialing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="date"
              value={trialEndDate}
              onChange={(e) => setTrialEndDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendTrialOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendTrial} disabled={loading || !trialEndDate}>
              {loading ? 'Saving...' : 'Extend Trial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the subscription for{' '}
              <span className="font-semibold">{cancelSub?.orgName}</span>? This
              action will immediately set the subscription status to canceled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
