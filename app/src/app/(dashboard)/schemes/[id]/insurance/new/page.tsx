import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { InsurancePolicyForm } from '@/components/insurance/insurance-policy-form'

export default async function NewInsurancePolicyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: schemeId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('scheme_name')
    .eq('id', schemeId)
    .single()

  if (!scheme) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Insurance Policy</h1>
        <p className="text-muted-foreground">{scheme.scheme_name}</p>
      </div>

      <InsurancePolicyForm schemeId={schemeId} />
    </div>
  )
}
