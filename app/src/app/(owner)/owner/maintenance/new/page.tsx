import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OwnerMaintenanceForm } from '@/components/owner/owner-maintenance-form'

export default async function OwnerNewMaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('portal_user_id', user.id)
    .single()

  if (!owner) redirect('/owner/login')

  // Get owner's lots for the lot selector
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select(`
      lot_id,
      lots(id, lot_number, unit_number, schemes(scheme_name))
    `)
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const lots = (ownerships ?? []).map((o) => {
    const lot = o.lots as unknown as {
      id: string
      lot_number: string
      unit_number: string | null
      schemes: { scheme_name: string }
    }
    return {
      id: o.lot_id,
      lot_number: lot.lot_number,
      unit_number: lot.unit_number,
      scheme_name: lot.schemes?.scheme_name ?? 'Unknown',
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Submit Maintenance Request</h2>
        <p className="text-muted-foreground">
          Report a maintenance issue for your property
        </p>
      </div>

      <OwnerMaintenanceForm lots={lots} />
    </div>
  )
}
