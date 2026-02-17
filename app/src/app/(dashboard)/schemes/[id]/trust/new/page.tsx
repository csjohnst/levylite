import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/trust/transaction-form'

export default async function NewTransactionPage({
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

  // Fetch chart of accounts and lots in parallel
  const [accountsResult, lotsResult] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, account_type, fund_type, is_system')
      .or(`scheme_id.eq.${id},scheme_id.is.null`)
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('lots')
      .select('id, lot_number, unit_number')
      .eq('scheme_id', id)
      .eq('status', 'active')
      .order('lot_number'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Record Transaction</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/trust`} className="hover:underline">Trust Accounting</Link>
            {' '}&mdash; New Transaction
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/trust`}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>

      <TransactionForm
        schemeId={id}
        accounts={(accountsResult.data ?? []) as Array<{ id: string; code: string; name: string; account_type: string; fund_type: string | null; is_system: boolean }>}
        lots={(lotsResult.data ?? []) as Array<{ id: string; lot_number: string; unit_number: string | null }>}
      />
    </div>
  )
}
