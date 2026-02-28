'use server'

import { revalidatePath } from 'next/cache'
import { getAdminContext } from './helpers'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  org_name: string | null
  role: string | null
  last_sign_in_at: string | null
  created_at: string
  banned: boolean
}

export async function getUsers(search?: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  // Fetch all auth users (paginate up to 1000)
  const allUsers: AdminUser[] = []
  const perPage = 50
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) return { error: error.message }
    if (!data.users || data.users.length === 0) break

    for (const u of data.users) {
      allUsers.push({
        id: u.id,
        email: u.email ?? '',
        full_name: (u.user_metadata?.full_name as string) ?? null,
        org_name: null,
        role: null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
        banned: u.banned_until
          ? new Date(u.banned_until) > new Date()
          : false,
      })
    }

    if (data.users.length < perPage) break
  }

  // Fetch org memberships for all users
  const { data: orgUsers, error: orgError } = await adminClient
    .from('organisation_users')
    .select('user_id, role, organisations(name)')

  if (!orgError && orgUsers) {
    const orgMap = new Map<
      string,
      { org_name: string; role: string }
    >()
    for (const ou of orgUsers) {
      const org = ou.organisations as unknown as { name: string } | null
      orgMap.set(ou.user_id, {
        org_name: org?.name ?? 'Unknown',
        role: ou.role,
      })
    }
    for (const user of allUsers) {
      const membership = orgMap.get(user.id)
      if (membership) {
        user.org_name = membership.org_name
        user.role = membership.role
      }
    }
  }

  // Apply search filter
  if (search) {
    const q = search.toLowerCase()
    return {
      data: allUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name && u.full_name.toLowerCase().includes(q))
      ),
    }
  }

  return { data: allUsers }
}

export async function initiatePasswordReset(email: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function suspendUser(userId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function unsuspendUser(userId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { success: true }
}
