import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Wrench, Plus } from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OwnerMaintenanceClient } from '@/components/owner/owner-maintenance-client'

export default async function OwnerMaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('portal_user_id', user.id)
    .single()

  if (!owner) redirect('/owner/login')

  // Get owner's lot IDs
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lot_id, lots(lot_number, unit_number)')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const lotIds = (ownerships ?? []).map((o) => o.lot_id)

  // Fetch maintenance requests for owner's lots or submitted by owner
  let requests: Array<{
    id: string
    title: string
    status: string
    priority: string
    created_at: string
    lot_id: string | null
    lots: { lot_number: string; unit_number: string | null } | null
  }> = []

  if (lotIds.length > 0) {
    const { data } = await supabase
      .from('maintenance_requests')
      .select('id, title, status, priority, created_at, lot_id, lots:lot_id(lot_number, unit_number)')
      .or(`lot_id.in.(${lotIds.join(',')}),submitted_by_owner_id.eq.${owner.id}`)
      .order('created_at', { ascending: false })

    requests = (data ?? []) as unknown as typeof requests
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Maintenance Requests</h2>
          <p className="text-muted-foreground">
            View and submit maintenance requests
          </p>
        </div>
        <Button asChild>
          <Link href="/owner/maintenance/new">
            <Plus className="mr-2 size-4" />
            Submit New Request
          </Link>
        </Button>
      </div>

      {requests.length > 0 ? (
        <OwnerMaintenanceClient requests={requests} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No maintenance requests</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven&apos;t submitted any maintenance requests yet.
            </p>
            <Button asChild className="mt-4">
              <Link href="/owner/maintenance/new">
                <Plus className="mr-2 size-4" />
                Submit New Request
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
