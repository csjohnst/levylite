'use server'

import { getAdminContext } from '@/actions/admin/helpers'

export async function getAdminDashboardStats() {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const [
    orgsResult,
    usersResult,
    activeSubsResult,
    trialingSubsResult,
    canceledSubsResult,
    pastDueSubsResult,
    freeSubsResult,
    revenueResult,
    recentOrgsResult,
  ] = await Promise.all([
    adminClient.from('organisations').select('id', { count: 'exact', head: true }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1 }),
    adminClient.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    adminClient.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    adminClient.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'canceled'),
    adminClient.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    adminClient.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'free'),
    adminClient.from('platform_invoices').select('total_inc_gst').eq('status', 'paid'),
    adminClient
      .from('organisations')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalOrgs = orgsResult.count ?? 0
  const totalUsers = 'total' in usersResult.data ? usersResult.data.total : 0
  const activeSubscriptions = (activeSubsResult.count ?? 0) + (trialingSubsResult.count ?? 0)
  const totalRevenue = (revenueResult.data ?? []).reduce(
    (sum, inv) => sum + (Number(inv.total_inc_gst) || 0),
    0
  )

  const subscriptionBreakdown = [
    { status: 'Active', count: activeSubsResult.count ?? 0 },
    { status: 'Trialing', count: trialingSubsResult.count ?? 0 },
    { status: 'Canceled', count: canceledSubsResult.count ?? 0 },
    { status: 'Past Due', count: pastDueSubsResult.count ?? 0 },
    { status: 'Free', count: freeSubsResult.count ?? 0 },
  ]

  // Get member counts for recent orgs
  const recentOrgs = recentOrgsResult.data ?? []
  const orgMemberCounts = await Promise.all(
    recentOrgs.map((org) =>
      adminClient
        .from('organisation_users')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', org.id)
    )
  )

  const recentSignups = recentOrgs.map((org, i) => ({
    id: org.id,
    name: org.name,
    createdAt: org.created_at,
    memberCount: orgMemberCounts[i].count ?? 0,
  }))

  return {
    totalOrgs,
    totalUsers,
    activeSubscriptions,
    totalRevenue,
    subscriptionBreakdown,
    recentSignups,
  }
}
