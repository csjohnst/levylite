'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { updateMaintenanceRequest } from '@/actions/maintenance-requests'

interface Tradesperson {
  id: string
  business_name: string
  contact_name: string | null
  trade_type: string | null
  phone: string | null
  email: string | null
  is_preferred: boolean
}

interface AssignTradespersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  tradespeople: Tradesperson[]
  currentAssignedId: string | null
}

export function AssignTradespersonDialog({
  open,
  onOpenChange,
  requestId,
  tradespeople,
  currentAssignedId,
}: AssignTradespersonDialogProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(currentAssignedId)
  const [loading, setLoading] = useState(false)

  const filtered = tradespeople.filter(tp => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      tp.business_name.toLowerCase().includes(q) ||
      tp.contact_name?.toLowerCase().includes(q) ||
      tp.trade_type?.toLowerCase().includes(q)
    )
  })

  async function handleAssign() {
    setLoading(true)
    const updateData: { assigned_to: string | null; status?: string } = {
      assigned_to: selectedId,
    }
    if (selectedId) {
      updateData.status = 'assigned'
    }

    const result = await updateMaintenanceRequest(requestId, updateData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(selectedId ? 'Tradesperson assigned' : 'Assignment removed')
      onOpenChange(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Tradesperson</DialogTitle>
          <DialogDescription>
            Select a tradesperson from your directory to assign to this request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or trade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                selectedId === null ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <span className="text-muted-foreground">Unassign</span>
            </button>
            {filtered.map(tp => (
              <button
                key={tp.id}
                type="button"
                onClick={() => setSelectedId(tp.id)}
                className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${
                  selectedId === tp.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{tp.business_name}</span>
                    {tp.contact_name && (
                      <span className="text-muted-foreground"> ({tp.contact_name})</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {tp.is_preferred && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800">
                        Preferred
                      </Badge>
                    )}
                    {tp.trade_type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {tp.trade_type}
                      </Badge>
                    )}
                  </div>
                </div>
                {(tp.phone || tp.email) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[tp.phone, tp.email].filter(Boolean).join(' | ')}
                  </p>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No tradespeople found
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? 'Saving...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
