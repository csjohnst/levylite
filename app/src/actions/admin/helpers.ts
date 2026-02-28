'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getAdminContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('id, role')
    .eq('user_id', user.id)
    .single()
  if (!admin) return { error: 'Not a platform admin' as const }

  const adminClient = createAdminClient()
  return { user, admin, adminClient }
}
