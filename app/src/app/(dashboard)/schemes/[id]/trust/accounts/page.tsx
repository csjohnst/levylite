import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChartOfAccountsTable } from '@/components/trust/chart-of-accounts-table'
import type { Account } from '@/components/trust/chart-of-accounts-table'

export default async function ChartOfAccountsPage({
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

  // Fetch all active accounts (scheme-specific + org-level defaults)
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .or(`scheme_id.eq.${id},scheme_id.is.null`)
    .eq('is_active', true)
    .order('code')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chart of Accounts</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/trust`} className="hover:underline">Trust Accounting</Link>
            {' '}&mdash; Chart of Accounts
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/trust`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Ledger
          </Link>
        </Button>
      </div>

      <ChartOfAccountsTable
        schemeId={id}
        accounts={(accounts ?? []) as Account[]}
      />
    </div>
  )
}
