'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LotInfo {
  lot_id: string
  lot_number: string
  unit_number: string | null
  scheme_name: string
}

interface LotSelectorProps {
  lots: LotInfo[]
}

export function LotSelector({ lots }: LotSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (lots.length <= 1) {
    if (lots.length === 1) {
      const lot = lots[0]
      return (
        <div className="text-sm text-muted-foreground">
          {lot.scheme_name} &mdash; Lot {lot.lot_number}
          {lot.unit_number ? ` (Unit ${lot.unit_number})` : ''}
        </div>
      )
    }
    return null
  }

  const selectedLotId = searchParams.get('lot') ?? 'all'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('lot')
    } else {
      params.set('lot', value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Select value={selectedLotId} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-[280px]">
        <SelectValue placeholder="Select a lot" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Lots (Summary)</SelectItem>
        {lots.map((lot) => (
          <SelectItem key={lot.lot_id} value={lot.lot_id}>
            {lot.scheme_name} &mdash; Lot {lot.lot_number}
            {lot.unit_number ? ` (Unit ${lot.unit_number})` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
