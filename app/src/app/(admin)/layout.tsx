import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: adminRecord } = await supabase
    .from('platform_admins')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!adminRecord) redirect('/')

  // Check if user also has an org membership (for "Back to App" link)
  const { data: orgUser } = await supabase
    .from('organisation_users')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  return (
    <SidebarProvider>
      <AdminSidebar
        user={user}
        adminRole={adminRecord.role}
        hasOrgMembership={!!orgUser}
      />
      <SidebarInset>
        <AdminHeader user={user} adminRole={adminRecord.role} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
