'use client'

/**
 * OwnershipTypeEditor Component
 *
 * Allows editing the ownership_type and ownership_percentage for an owner's
 * lot_ownership records directly from the Edit Owner page.
 *
 * This component addresses bug #11: ownership_type was stored in lot_ownerships
 * but the Edit Owner form only updated the owners table — no UI existed to change
 * ownership type after initial creation.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type OwnershipType = 'sole' | 'joint-tenants' | 'tenants-in-common'

interface Ownership {
  id: string
  lot_id: string
  ownership_type: OwnershipType
  ownership_percentage: number
  lot: { lot_number: string; unit_number: string | null; scheme_id: string } | null
}

interface OwnershipTypeEditorProps {
  ownerships: Ownership[]
  onUpdate: (
    ownershipId: string,
    data: { ownership_type: OwnershipType; ownership_percentage?: number }
  ) => Promise<{ data?: unknown; error?: string }>
}

const OWNERSHIP_TYPE_OPTIONS: { value: OwnershipType; label: string; description: string }[] = [
  { value: 'sole', label: 'Sole Owner', description: 'Single owner holds 100%' },
  { value: 'joint-tenants', label: 'Joint Tenants', description: 'Equal shares, automatic right of survivorship' },
  { value: 'tenants-in-common', label: 'Tenants in Common', description: 'Specified percentage shares, no survivorship' },
]

function OwnershipRow({
  ownership,
  onUpdate,
}: {
  ownership: Ownership
  onUpdate: OwnershipTypeEditorProps['onUpdate']
}) {
  const [type, setType] = useState<OwnershipType>(ownership.ownership_type)
  const [percentage, setPercentage] = useState(ownership.ownership_percentage)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const lotLabel = ownership.lot
    ? `Lot ${ownership.lot.lot_number}${ownership.lot.unit_number ? ` (Unit ${ownership.lot.unit_number})` : ''}`
    : `Lot ${ownership.lot_id.substring(0, 8)}...`

  function handleTypeChange(newType: OwnershipType) {
    setType(newType)
    if (newType === 'sole') setPercentage(100)
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const result = await onUpdate(ownership.id, {
      ownership_type: type,
      ownership_percentage: percentage,
    })
    setSaving(false)
    if (result.error) {
      toast.error(`Failed to update: ${result.error}`)
    } else {
      toast.success(`Ownership type updated for ${lotLabel}`)
      setDirty(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{lotLabel}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="space-y-1">
          <Label htmlFor={`ownership-type-${ownership.id}`} className="text-xs text-muted-foreground">
            Ownership Type
          </Label>
          <Select value={type} onValueChange={(v) => handleTypeChange(v as OwnershipType)}>
            <SelectTrigger id={`ownership-type-${ownership.id}`} className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OWNERSHIP_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {type === 'tenants-in-common' && (
          <div className="space-y-1">
            <Label htmlFor={`ownership-pct-${ownership.id}`} className="text-xs text-muted-foreground">
              Share %
            </Label>
            <Input
              id={`ownership-pct-${ownership.id}`}
              type="number"
              min={1}
              max={100}
              step={0.01}
              value={percentage}
              onChange={(e) => { setPercentage(Number(e.target.value)); setDirty(true) }}
              className="w-24"
            />
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          size="sm"
          variant={dirty ? 'default' : 'outline'}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 size-3 animate-spin" />
              Saving…
            </>
          ) : dirty ? 'Save' : 'Saved'}
        </Button>
      </div>
    </div>
  )
}

export function OwnershipTypeEditor({ ownerships, onUpdate }: OwnershipTypeEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ownership Type</CardTitle>
        <CardDescription>
          Change how this owner holds their lot(s). This updates the ownership structure in the register.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ownerships.map(ownership => (
          <OwnershipRow
            key={ownership.id}
            ownership={ownership}
            onUpdate={onUpdate}
          />
        ))}
      </CardContent>
    </Card>
  )
}
