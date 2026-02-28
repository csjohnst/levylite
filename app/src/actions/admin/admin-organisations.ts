'use server'

import { revalidatePath } from 'next/cache'
import { getAdminContext } from './helpers'

// ============================================================
// Types
// ============================================================

export interface OrganisationRow {
  id: string
  name: string
  created_at: string
  scheme_count: number
  lot_count: number
  member_count: number
  subscription_status: string | null
}

export interface OrganisationDetail {
  id: string
  name: string
  created_at: string
  updated_at: string
  subscription: {
    id: string
    status: string
    plan_name: string
    billing_interval: string | null
    trial_end_date: string | null
    current_period_start: string | null
    current_period_end: string | null
    stripe_subscription_id: string | null
  } | null
  usage: {
    schemes: number
    lots: number
    members: number
  }
  members: {
    user_id: string
    role: string
    created_at: string
    email: string
    full_name: string
  }[]
  schemes: {
    id: string
    scheme_name: string
    scheme_number: string
    status: string
    lot_count: number
  }[]
  invoices: {
    id: string
    invoice_number: string | null
    invoice_date: string
    amount_cents: number
    status: string
  }[]
}

// ============================================================
// getOrganisations
// ============================================================

export async function getOrganisations(search?: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  let query = adminClient
    .from('organisations')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data: orgs, error } = await query
  if (error) return { error: error.message }
  if (!orgs || orgs.length === 0) return { data: [] as OrganisationRow[] }

  const orgIds = orgs.map((o) => o.id)

  // Fetch counts in parallel
  const [membersRes, schemesRes, lotsRes, subsRes] = await Promise.all([
    adminClient
      .from('organisation_users')
      .select('organisation_id')
      .in('organisation_id', orgIds),
    adminClient
      .from('schemes')
      .select('id, organisation_id')
      .in('organisation_id', orgIds)
      .neq('status', 'archived'),
    adminClient
      .from('lots')
      .select('id, scheme_id, schemes!inner(organisation_id)')
      .in('schemes.organisation_id', orgIds),
    adminClient
      .from('subscriptions')
      .select('organisation_id, status')
      .in('organisation_id', orgIds),
  ])

  // Build count maps
  const memberCounts = new Map<string, number>()
  for (const m of membersRes.data ?? []) {
    memberCounts.set(m.organisation_id, (memberCounts.get(m.organisation_id) ?? 0) + 1)
  }

  const schemeCounts = new Map<string, number>()
  for (const s of schemesRes.data ?? []) {
    schemeCounts.set(s.organisation_id, (schemeCounts.get(s.organisation_id) ?? 0) + 1)
  }

  const lotCounts = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (lotsRes.data ?? []) as any[]) {
    const schemes = l.schemes
    const orgId = Array.isArray(schemes) ? schemes[0]?.organisation_id : schemes?.organisation_id
    if (orgId) {
      lotCounts.set(orgId, (lotCounts.get(orgId) ?? 0) + 1)
    }
  }

  const subStatusMap = new Map<string, string>()
  for (const s of subsRes.data ?? []) {
    subStatusMap.set(s.organisation_id, s.status)
  }

  const data: OrganisationRow[] = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    scheme_count: schemeCounts.get(org.id) ?? 0,
    lot_count: lotCounts.get(org.id) ?? 0,
    member_count: memberCounts.get(org.id) ?? 0,
    subscription_status: subStatusMap.get(org.id) ?? null,
  }))

  return { data }
}

// ============================================================
// getOrganisationDetail
// ============================================================

export async function getOrganisationDetail(orgId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { data: org, error: orgError } = await adminClient
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (orgError || !org) return { error: orgError?.message ?? 'Organisation not found' }

  // Fetch related data in parallel
  const [subRes, membersRes, schemesRes, invoicesRes, lotsRes] = await Promise.all([
    adminClient
      .from('subscriptions')
      .select('*, subscription_plans(plan_name)')
      .eq('organisation_id', orgId)
      .maybeSingle(),
    adminClient
      .from('organisation_users')
      .select('user_id, role, created_at')
      .eq('organisation_id', orgId)
      .order('created_at'),
    adminClient
      .from('schemes')
      .select('id, scheme_name, scheme_number, status, lots(count)')
      .eq('organisation_id', orgId)
      .neq('status', 'archived')
      .order('scheme_name'),
    adminClient
      .from('platform_invoices')
      .select('id, invoice_number, invoice_date, amount_cents, status')
      .eq('organisation_id', orgId)
      .order('invoice_date', { ascending: false })
      .limit(20),
    adminClient
      .from('lots')
      .select('id, schemes!inner(organisation_id)', { count: 'exact', head: true })
      .eq('schemes.organisation_id', orgId),
  ])

  // Resolve user details for members
  const members = []
  for (const m of membersRes.data ?? []) {
    const { data: userData } = await adminClient.auth.admin.getUserById(m.user_id)
    const user = userData?.user
    const meta = user?.user_metadata ?? {}
    const fullName = meta.full_name ?? (meta.first_name ? `${meta.first_name} ${meta.last_name ?? ''}`.trim() : null)
    members.push({
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      email: user?.email ?? 'Unknown',
      full_name: fullName ?? user?.email ?? 'Unknown',
    })
  }

  // Parse subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subData = subRes.data as any
  let subscription = null
  if (subData) {
    const planRaw = subData.subscription_plans
    const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw
    subscription = {
      id: subData.id,
      status: subData.status,
      plan_name: plan?.plan_name ?? 'Unknown',
      billing_interval: subData.billing_interval,
      trial_end_date: subData.trial_end_date,
      current_period_start: subData.current_period_start,
      current_period_end: subData.current_period_end,
      stripe_subscription_id: subData.stripe_subscription_id,
    }
  }

  // Parse scheme lot counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemes = (schemesRes.data ?? []).map((s: any) => ({
    id: s.id,
    scheme_name: s.scheme_name,
    scheme_number: s.scheme_number,
    status: s.status,
    lot_count: Array.isArray(s.lots) && s.lots[0] ? s.lots[0].count : 0,
  }))

  const detail: OrganisationDetail = {
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    updated_at: org.updated_at,
    subscription,
    usage: {
      schemes: schemesRes.data?.length ?? 0,
      lots: lotsRes.count ?? 0,
      members: membersRes.data?.length ?? 0,
    },
    members,
    schemes,
    invoices: (invoicesRes.data ?? []).map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      amount_cents: i.amount_cents,
      status: i.status,
    })),
  }

  return { data: detail }
}

// ============================================================
// suspendOrganisation
// ============================================================

export async function suspendOrganisation(orgId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient
    .from('subscriptions')
    .update({ status: 'suspended' })
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/organisations/${orgId}`)
  return { success: true }
}

// ============================================================
// unsuspendOrganisation
// ============================================================

export async function unsuspendOrganisation(orgId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('organisation_id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/organisations/${orgId}`)
  return { success: true }
}

// ============================================================
// updateOrganisation
// ============================================================

export async function updateOrganisation(orgId: string, data: { name: string }) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  if (!data.name || data.name.trim().length === 0) {
    return { error: 'Organisation name is required' }
  }

  const { error } = await adminClient
    .from('organisations')
    .update({ name: data.name.trim() })
    .eq('id', orgId)

  if (error) return { error: error.message }

  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/organisations/${orgId}`)
  return { success: true }
}
