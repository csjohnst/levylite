'use client'

import { useState } from 'react'
import { Lock, MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { deleteAccount } from '@/actions/chart-of-accounts'
import { AccountForm } from '@/components/trust/account-form'

export interface Account {
  id: string
  scheme_id: string | null
  code: string
  name: string
  account_type: string
  fund_type: string | null
  parent_id: string | null
  is_system: boolean
  is_active: boolean
}

interface ChartOfAccountsTableProps {
  schemeId: string
  accounts: Account[]
}

const ACCOUNT_TYPE_ORDER = ['asset', 'liability', 'equity', 'income', 'expense'] as const
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}
const FUND_LABELS: Record<string, string> = {
  admin: 'Admin',
  capital_works: 'Capital Works',
}

export function ChartOfAccountsTable({ schemeId, accounts }: ChartOfAccountsTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const grouped = ACCOUNT_TYPE_ORDER.map(type => ({
    type,
    label: ACCOUNT_TYPE_LABELS[type],
    accounts: accounts.filter(a => a.account_type === type).sort((a, b) => a.code.localeCompare(b.code)),
  })).filter(g => g.accounts.length > 0)

  async function handleDelete(id: string) {
    setDeleting(id)
    const result = await deleteAccount(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Account deactivated')
    }
    setDeleting(null)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 size-4" />
          Add Account
        </Button>
      </div>

      {grouped.map(group => (
        <div key={group.type} className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {group.label}
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.accounts.map(account => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono font-medium">{account.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {account.name}
                        {account.is_system && (
                          <Lock className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.fund_type ? (
                        <Badge variant="outline" className="text-xs">
                          {FUND_LABELS[account.fund_type] ?? account.fund_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {account.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!account.is_system && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditAccount(account)}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(account.id)}
                              disabled={deleting === account.id}
                            >
                              <Trash2 className="mr-2 size-4" />
                              {deleting === account.id ? 'Deleting...' : 'Deactivate'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {/* Create account dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Account</DialogTitle>
            <DialogDescription>
              Create a new account in the chart of accounts for this scheme.
            </DialogDescription>
          </DialogHeader>
          <AccountForm
            schemeId={schemeId}
            onSuccess={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit account dialog */}
      <Dialog open={!!editAccount} onOpenChange={(open) => { if (!open) setEditAccount(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update the account details.
            </DialogDescription>
          </DialogHeader>
          {editAccount && (
            <AccountForm
              schemeId={schemeId}
              account={editAccount}
              onSuccess={() => setEditAccount(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
