'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, HardHat, Pencil, Ban, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { TradespersonForm } from '@/components/tradespeople/tradesperson-form'
import { deleteTradesperson, updateTradesperson } from '@/actions/tradespeople'

interface Tradesperson {
  id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  abn: string | null
  trade_type: string | null
  is_preferred: boolean
  insurance_expiry: string | null
  license_number: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

interface TradespeopleDirectoryProps {
  tradespeople: Tradesperson[]
}

const TRADE_TYPE_LABELS: Record<string, string> = {
  plumber: 'Plumber',
  electrician: 'Electrician',
  painter: 'Painter',
  landscaper: 'Landscaper',
  pest_control: 'Pest Control',
  cleaner: 'Cleaner',
  locksmith: 'Locksmith',
  builder: 'Builder',
  roofer: 'Roofer',
  glazier: 'Glazier',
  hvac: 'HVAC',
  general: 'General',
  other: 'Other',
}

function isInsuranceExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function TradespeopleDirectory({ tradespeople }: TradespeopleDirectoryProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tradesperson | null>(null)

  // Get unique trade types for filter
  const tradeTypes = Array.from(new Set(tradespeople.map(tp => tp.trade_type).filter(Boolean))) as string[]

  const filtered = tradespeople.filter(tp => {
    if (!showInactive && !tp.is_active) return false
    if (tradeFilter !== 'all' && tp.trade_type !== tradeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        tp.business_name.toLowerCase().includes(q) ||
        tp.contact_name?.toLowerCase().includes(q) ||
        tp.email?.toLowerCase().includes(q) ||
        tp.trade_type?.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function handleDeactivate(tp: Tradesperson) {
    const result = await deleteTradesperson(tp.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${tp.business_name} deactivated`)
      router.refresh()
    }
  }

  async function handleReactivate(tp: Tradesperson) {
    const result = await updateTradesperson(tp.id, { is_preferred: tp.is_preferred })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${tp.business_name} reactivated`)
      router.refresh()
    }
  }

  function openEditForm(tp: Tradesperson) {
    setEditing(tp)
    setFormOpen(true)
  }

  function openAddForm() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <>
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tradespeople..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tradeFilter} onValueChange={setTradeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trade type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                {tradeTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {TRADE_TYPE_LABELS[type] ?? type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm cursor-pointer px-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
            <Button onClick={openAddForm}>
              <Plus className="mr-2 size-4" />
              Add Tradesperson
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tradespeople Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardHat className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {tradespeople.length === 0 ? 'No tradespeople yet' : 'No tradespeople match your filters'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tradespeople.length === 0
                ? 'Add your first tradesperson to get started.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {tradespeople.length === 0 && (
              <Button onClick={openAddForm} className="mt-4">
                <Plus className="mr-2 size-4" />
                Add Tradesperson
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Directory</CardTitle>
            <CardDescription>
              {filtered.length} tradesperson{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== tradespeople.filter(tp => showInactive || tp.is_active).length && ` (filtered)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ABN</TableHead>
                  <TableHead>Insurance Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(tp => (
                  <TableRow key={tp.id} className={!tp.is_active ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{tp.business_name}</span>
                        {tp.is_preferred && (
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 bg-green-100 text-green-800">
                            Preferred
                          </Badge>
                        )}
                        {tp.contact_name && (
                          <p className="text-xs text-muted-foreground">{tp.contact_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tp.trade_type ? (TRADE_TYPE_LABELS[tp.trade_type] ?? tp.trade_type) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{tp.phone || '-'}</TableCell>
                    <TableCell className="text-sm">{tp.email || '-'}</TableCell>
                    <TableCell className="text-sm font-mono">{tp.abn || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {tp.insurance_expiry ? (
                        <span className={isInsuranceExpired(tp.insurance_expiry) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(tp.insurance_expiry)}
                          {isInsuranceExpired(tp.insurance_expiry) && ' (expired)'}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tp.is_active ? 'secondary' : 'outline'}
                        className={tp.is_active ? 'bg-green-100 text-green-800' : 'text-gray-500'}
                      >
                        {tp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEditForm(tp)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {tp.is_active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDeactivate(tp)}
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-green-600 hover:text-green-700"
                            onClick={() => handleReactivate(tp)}
                          >
                            <RotateCcw className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <TradespersonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        tradesperson={editing ? {
          id: editing.id,
          business_name: editing.business_name,
          contact_name: editing.contact_name,
          email: editing.email,
          phone: editing.phone,
          abn: editing.abn,
          trade_type: editing.trade_type,
          insurance_expiry: editing.insurance_expiry,
          license_number: editing.license_number,
          notes: editing.notes,
        } : null}
      />
    </>
  )
}
