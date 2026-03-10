import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AddValuationForm } from '@/components/insurance/add-valuation-form'

export default async function NewValuationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme, error } = await supabase
    .from('schemes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !scheme) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href={`/schemes/${id}/insurance`}
          className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Insurance
        </Link>
        <h1 className="text-3xl font-bold mt-2">Add Property Valuation</h1>
        <p className="text-muted-foreground mt-1">
          Record a new property valuation for {scheme.scheme_name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valuation Details</CardTitle>
          <CardDescription>
            Enter the property valuation information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddValuationForm schemeId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
