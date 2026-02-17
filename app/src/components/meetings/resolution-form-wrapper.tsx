'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResolutionForm } from './resolution-form'

interface AgendaItem {
  id: string
  item_number: number
  title: string
}

interface ResolutionFormWrapperProps {
  meetingId: string
  agendaItems: AgendaItem[]
}

export function ResolutionFormWrapper({ meetingId, agendaItems }: ResolutionFormWrapperProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 size-3" />
          Record Resolution
        </Button>
      </div>
      <ResolutionForm
        meetingId={meetingId}
        agendaItems={agendaItems}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
