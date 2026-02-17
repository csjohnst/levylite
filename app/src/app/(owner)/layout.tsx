import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OwnerHeader } from '@/components/owner/owner-header'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/owner/login')

  // Check if this user is an owner
  const { data: owner } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email')
    .eq('portal_user_id', user.id)
    .single()

  if (!owner) redirect('/owner/login')

  const ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ') || owner.email || 'Owner'

  return (
    <div className="min-h-screen bg-muted/30">
      <OwnerHeader
        ownerName={ownerName}
        ownerEmail={owner.email || user.email || ''}
      />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
