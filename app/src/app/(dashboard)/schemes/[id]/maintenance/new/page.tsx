import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaintenanceRequestForm } from '@/components/maintenance/maintenance-request-form'

export default async function NewMaintenanceRequestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  // Fetch active lots for the lot selector
  const { data: lots } = await supabase
    .from('lots')
    .select('id, lot_number, unit_number')
    .eq('scheme_id', id)
    .eq('status', 'active')
    .order('lot_number')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Maintenance Request</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/maintenance`} className="hover:underline">Maintenance</Link>
            {' '}&mdash; New
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/maintenance`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Maintenance
          </Link>
        </Button>
      </div>

      <MaintenanceRequestForm
        schemeId={id}
        lots={(lots ?? []).map(l => ({
          id: l.id,
          lot_number: l.lot_number,
          unit_number: l.unit_number,
        }))}
      />
    </div>
  )
}
