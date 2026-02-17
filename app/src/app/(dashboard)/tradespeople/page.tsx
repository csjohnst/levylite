import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TradespeopleDirectory } from '@/components/tradespeople/tradespeople-directory'

export default async function TradespeoplePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all tradespeople (including inactive for management)
  const { data: tradespeople } = await supabase
    .from('tradespeople')
    .select('*')
    .order('business_name')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tradespeople</h2>
        <p className="text-muted-foreground">
          Manage your tradesperson directory
        </p>
      </div>

      <TradespeopleDirectory tradespeople={tradespeople ?? []} />
    </div>
  )
}
