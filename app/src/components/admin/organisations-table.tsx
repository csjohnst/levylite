'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Eye, Ban, CheckCircle, Search } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  suspendOrganisation,
  unsuspendOrganisation,
} from '@/actions/admin/admin-organisations'
import type { OrganisationRow } from '@/actions/admin/admin-organisations'

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

interface OrganisationsTableProps {
  organisations: OrganisationRow[]
}

export function OrganisationsTable({ organisations }: OrganisationsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = organisations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSuspend(orgId: string) {
    setLoading(orgId)
    await suspendOrganisation(orgId)
    router.refresh()
    setLoading(null)
  }

  async function handleUnsuspend(orgId: string) {
    setLoading(orgId)
    await unsuspendOrganisation(orgId)
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search organisations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Schemes</TableHead>
              <TableHead className="text-center">Lots</TableHead>
              <TableHead className="text-center">Members</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {search ? 'No organisations match your search.' : 'No organisations found.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link
                      href={`/admin/organisations/${org.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{org.scheme_count}</TableCell>
                  <TableCell className="text-center">{org.lot_count}</TableCell>
                  <TableCell className="text-center">{org.member_count}</TableCell>
                  <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={loading === org.id}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/organisations/${org.id}`}>
                            <Eye className="size-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {org.subscription_status === 'suspended' ? (
                          <DropdownMenuItem onClick={() => handleUnsuspend(org.id)}>
                            <CheckCircle className="size-4 mr-2" />
                            Unsuspend
                          </DropdownMenuItem>
                        ) : (
                          org.subscription_status && (
                            <DropdownMenuItem
                              onClick={() => handleSuspend(org.id)}
                              className="text-destructive"
                            >
                              <Ban className="size-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )
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
    </div>
  )
}
