'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ShieldAlert, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import {
  requestBankDetailChange,
  approveBankDetailChange,
  rejectBankDetailChange,
  getPendingBankDetailChanges,
  getRecentBankDetailChanges,
} from '@/actions/bank-detail-changes'

interface BankDetailChangePanelProps {
  schemeId: string
  currentBsb: string | null
  currentAccountNumber: string | null
  currentAccountName: string | null
  currentUserId: string
}

interface ChangeRequest {
  id: string
  scheme_id: string
  requested_by: string
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  status: string
  new_trust_bsb: string | null
  new_trust_account_number: string | null
  new_trust_account_name: string | null
  old_trust_bsb: string | null
  old_trust_account_number: string | null
  old_trust_account_name: string | null
  expires_at: string
}

export function BankDetailChangePanel({
  schemeId,
  currentBsb,
  currentAccountNumber,
  currentAccountName,
  currentUserId,
}: BankDetailChangePanelProps) {
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([])
  const [recentChanges, setRecentChanges] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadData()
  }, [schemeId])

  async function loadData() {
    const [pendingResult, recentResult] = await Promise.all([
      getPendingBankDetailChanges(schemeId),
      getRecentBankDetailChanges(schemeId),
    ])
    if (pendingResult.data) setPendingRequests(pendingResult.data as ChangeRequest[])
    if (recentResult.data) setRecentChanges(recentResult.data as ChangeRequest[])
  }

  async function handleRequestChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const result = await requestBankDetailChange(
      schemeId,
      (form.get('new_bsb') as string) || null,
      (form.get('new_account_number') as string) || null,
      (form.get('new_account_name') as string) || null,
    )
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Bank detail change request submitted. Another manager must approve it.')
    setRequestDialogOpen(false)
    loadData()
  }

  async function handleApprove(requestId: string) {
    setLoading(true)
    const result = await approveBankDetailChange(requestId)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Bank detail change approved and applied.')
    loadData()
  }

  async function handleReject() {
    if (!rejectingId) return
    setLoading(true)
    const result = await rejectBankDetailChange(rejectingId, rejectReason || undefined)
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Bank detail change request rejected.')
    setRejectDialogOpen(false)
    setRejectingId(null)
    setRejectReason('')
    loadData()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="mr-1 size-3" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="mr-1 size-3" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="mr-1 size-3" />Rejected</Badge>
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Expired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Current bank details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-5 text-amber-600" />
              Trust Account Bank Details
            </CardTitle>
            <CardDescription className="mt-1">
              Protected by dual authorisation. Changes require approval from a different manager.
            </CardDescription>
          </div>
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={pendingRequests.length > 0}>
                Request Change
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Bank Detail Change</DialogTitle>
                <DialogDescription>
                  This change will require approval from a different manager before it takes effect. The request expires after 48 hours.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleRequestChange} className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p className="font-medium text-muted-foreground">Current Details:</p>
                  <p>BSB: <span className="font-mono">{currentBsb || '(not set)'}</span></p>
                  <p>Account: <span className="font-mono">{currentAccountNumber || '(not set)'}</span></p>
                  <p>Name: {currentAccountName || '(not set)'}</p>
                </div>
                <div className="space-y-3">
                  <p className="font-medium text-sm">New Details:</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="new_bsb">BSB</Label>
                      <Input id="new_bsb" name="new_bsb" placeholder="066-123" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new_account_number">Account Number</Label>
                      <Input id="new_account_number" name="new_account_number" placeholder="12345678" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new_account_name">Account Name</Label>
                    <Input id="new_account_name" name="new_account_name" placeholder="Trust Account Name" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-muted-foreground">BSB:</span>{' '}
              <span className="font-mono font-medium">{currentBsb || '(not set)'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Account Number:</span>{' '}
              <span className="font-mono font-medium">{currentAccountNumber || '(not set)'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Account Name:</span>{' '}
              <span className="font-medium">{currentAccountName || '(not set)'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base">Pending Change Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {statusBadge(req.status)}
                  <span className="text-xs text-muted-foreground">
                    Expires: {formatDate(req.expires_at)}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Current:</p>
                    <p className="font-mono">{req.old_trust_bsb || '(none)'}</p>
                    <p className="font-mono">{req.old_trust_account_number || '(none)'}</p>
                    <p>{req.old_trust_account_name || '(none)'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Proposed:</p>
                    <p className="font-mono">{req.new_trust_bsb || '(none)'}</p>
                    <p className="font-mono">{req.new_trust_account_number || '(none)'}</p>
                    <p>{req.new_trust_account_name || '(none)'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requested: {formatDate(req.requested_at)}
                </p>
                {/* Show approve/reject only to users who are NOT the requester */}
                {req.requested_by !== currentUserId && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(req.id)}
                      disabled={loading}
                    >
                      <CheckCircle2 className="mr-1 size-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRejectingId(req.id)
                        setRejectDialogOpen(true)
                      }}
                      disabled={loading}
                    >
                      <XCircle className="mr-1 size-4" />
                      Reject
                    </Button>
                  </div>
                )}
                {req.requested_by === currentUserId && (
                  <p className="text-xs text-amber-600 pt-2 border-t">
                    You submitted this request. A different manager must approve or reject it.
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent changes audit trail */}
      {recentChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Detail Change History</CardTitle>
            <CardDescription>Recent change requests for audit purposes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentChanges.slice(0, 10).map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    {statusBadge(req.status)}
                    <div>
                      <span className="font-mono text-xs">
                        {req.old_trust_bsb || '(none)'}
                      </span>
                      <ArrowRight className="inline mx-1 size-3" />
                      <span className="font-mono text-xs">
                        {req.new_trust_bsb || '(none)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(req.requested_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this bank detail change request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject_reason">Reason (optional)</Label>
            <Textarea
              id="reject_reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incorrect BSB number"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectingId(null)
                setRejectReason('')
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              {loading ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
