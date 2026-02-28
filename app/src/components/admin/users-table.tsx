'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MoreHorizontal, KeyRound, ShieldBan, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { AdminUser } from '@/actions/admin/admin-users'
import {
  initiatePasswordReset,
  suspendUser,
  unsuspendUser,
} from '@/actions/admin/admin-users'

interface UsersTableProps {
  users: AdminUser[]
}

type ConfirmAction = {
  type: 'reset_password'
  user: AdminUser
} | {
  type: 'suspend'
  user: AdminUser
} | {
  type: 'unsuspend'
  user: AdminUser
} | null

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [loading, setLoading] = useState(false)

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name && u.full_name.toLowerCase().includes(q))
    )
  })

  async function handleConfirm() {
    if (!confirmAction) return
    setLoading(true)

    try {
      if (confirmAction.type === 'reset_password') {
        const result = await initiatePasswordReset(confirmAction.user.email)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`Password reset link generated for ${confirmAction.user.email}`)
        }
      } else if (confirmAction.type === 'suspend') {
        const result = await suspendUser(confirmAction.user.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`User ${confirmAction.user.email} suspended`)
          router.refresh()
        }
      } else if (confirmAction.type === 'unsuspend') {
        const result = await unsuspendUser(confirmAction.user.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`User ${confirmAction.user.email} unsuspended`)
          router.refresh()
        }
      }
    } finally {
      setLoading(false)
      setConfirmAction(null)
    }
  }

  const confirmTitle = confirmAction
    ? confirmAction.type === 'reset_password'
      ? 'Reset Password'
      : confirmAction.type === 'suspend'
        ? 'Suspend User'
        : 'Unsuspend User'
    : ''

  const confirmDescription = confirmAction
    ? confirmAction.type === 'reset_password'
      ? `Generate a password reset link for ${confirmAction.user.email}?`
      : confirmAction.type === 'suspend'
        ? `Suspend ${confirmAction.user.email}? They will be unable to sign in until unsuspended.`
        : `Unsuspend ${confirmAction.user.email}? They will be able to sign in again.`
    : ''

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Sign In</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {search ? 'No users match your search.' : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || <span className="text-muted-foreground italic">No name</span>}
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell className="text-sm">
                    {user.org_name || <span className="text-muted-foreground italic">--</span>}
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {user.role || <span className="text-muted-foreground italic">--</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeTime(user.last_sign_in_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-500/50">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setConfirmAction({ type: 'reset_password', user })
                          }
                        >
                          <KeyRound className="size-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        {user.banned ? (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmAction({ type: 'unsuspend', user })
                            }
                          >
                            <ShieldCheck className="size-4 mr-2" />
                            Unsuspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmAction({ type: 'suspend', user })
                            }
                            className="text-destructive focus:text-destructive"
                          >
                            <ShieldBan className="size-4 mr-2" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === 'suspend' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
