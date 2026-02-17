'use client'

import Link from 'next/link'
import { Plus, MoreHorizontal, Pencil, Trash2, Mail, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { deleteOwner } from '@/actions/owners'
import { inviteOwnerToPortal, resendPortalInvitation } from '@/actions/owner-portal'
import { useRouter } from 'next/navigation'

interface OwnersTabProps {
  schemeId: string
  owners: Array<{
    owner: Record<string, unknown>
    lots: Array<{ lot_number: string; unit_number: string | null }>
  }>
}

function getPortalStatus(owner: Record<string, unknown>): 'active' | 'invited' | 'none' {
  if (owner.portal_activated_at || owner.portal_invite_accepted_at) return 'active'
  if (owner.portal_user_id) return 'invited'
  return 'none'
}

export function OwnersTab({ schemeId, owners }: OwnersTabProps) {
  const router = useRouter()

  async function handleDelete(ownerId: string) {
    if (!confirm('Are you sure you want to delete this owner? This will also remove all lot assignments.')) return
    const result = await deleteOwner(ownerId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Owner deleted')
      router.refresh()
    }
  }

  async function handleInvite(ownerId: string) {
    const result = await inviteOwnerToPortal(ownerId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Portal invitation sent to ${result.data?.email}`)
      router.refresh()
    }
  }

  async function handleResendInvite(ownerId: string) {
    const result = await resendPortalInvitation(ownerId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Invitation resent to ${result.data?.email}`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/schemes/${schemeId}/owners/new`}>
            <Plus className="mr-2 size-4" />
            Add Owner
          </Link>
        </Button>
      </div>

      {owners.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Lot(s)</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map(({ owner, lots }) => {
                const portalStatus = getPortalStatus(owner)

                return (
                  <TableRow key={owner.id as string}>
                    <TableCell className="font-medium">
                      {owner.first_name as string} {owner.last_name as string}
                    </TableCell>
                    <TableCell>
                      {(owner.email as string) || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {(owner.phone_mobile as string) || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {lots.length > 0
                        ? lots.map(l => l.unit_number ? `Unit ${l.unit_number}` : `Lot ${l.lot_number}`).join(', ')
                        : <span className="text-muted-foreground">None</span>
                      }
                    </TableCell>
                    <TableCell>
                      {portalStatus === 'active' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 size-3" />
                          Active
                        </Badge>
                      )}
                      {portalStatus === 'invited' && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          <Mail className="mr-1 size-3" />
                          Invited
                        </Badge>
                      )}
                      {portalStatus === 'none' && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/schemes/${schemeId}/owners/${owner.id as string}/edit`}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>

                          {portalStatus === 'none' && (owner.email as string) && (
                            <DropdownMenuItem
                              onClick={() => handleInvite(owner.id as string)}
                            >
                              <Send className="mr-2 size-4" />
                              Invite to Portal
                            </DropdownMenuItem>
                          )}

                          {portalStatus === 'invited' && (
                            <DropdownMenuItem
                              onClick={() => handleResendInvite(owner.id as string)}
                            >
                              <Mail className="mr-2 size-4" />
                              Resend Invitation
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(owner.id as string)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No owners yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add owners and assign them to lots.
          </p>
        </div>
      )}
    </div>
  )
}
