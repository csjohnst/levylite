'use server'

import { revalidatePath } from 'next/cache'
import { getAdminContext } from './helpers'

// ============================================================
// getSubscriptions
// ============================================================

export async function getSubscriptions(status?: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  let query = adminClient
    .from('subscriptions')
    .select(
      `
      id,
      organisation_id,
      status,
      trial_end_date,
      current_period_end,
      created_at,
      organisations(id, name),
      subscription_plans(id, plan_name)
    `
    )
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: subs, error } = await query
  if (error) return { error: error.message }

  // Get lot counts per organisation via schemes
  const orgIds = [
    ...new Set(
      (subs ?? []).map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const org = s.organisations as any
        return Array.isArray(org) ? org[0]?.id : org?.id
      }).filter(Boolean)
    ),
  ] as string[]

  const lotCounts: Record<string, number> = {}
  if (orgIds.length > 0) {
    const { data: lots } = await adminClient
      .from('lots')
      .select('id, schemes!inner(organisation_id)')
      .in('schemes.organisation_id', orgIds)

    if (lots) {
      for (const lot of lots) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scheme = lot.schemes as any
        const orgId = Array.isArray(scheme)
          ? scheme[0]?.organisation_id
          : scheme?.organisation_id
        if (orgId) {
          lotCounts[orgId] = (lotCounts[orgId] || 0) + 1
        }
      }
    }
  }

  const enriched = (subs ?? []).map((sub) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const org = sub.organisations as any
    const orgData = Array.isArray(org) ? org[0] : org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = sub.subscription_plans as any
    const planData = Array.isArray(plan) ? plan[0] : plan

    return {
      id: sub.id,
      orgId: sub.organisation_id,
      orgName: orgData?.name ?? 'Unknown',
      planName: planData?.plan_name ?? 'No plan',
      planId: planData?.id ?? null,
      status: sub.status,
      lotCount: lotCounts[orgData?.id] ?? 0,
      trialEndDate: sub.trial_end_date,
      nextBilling: sub.current_period_end,
      createdAt: sub.created_at,
    }
  })

  return { data: enriched }
}

// ============================================================
// getPlans
// ============================================================

export async function getPlans() {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { data, error } = await adminClient
    .from('subscription_plans')
    .select('id, plan_name')
    .order('sort_order')

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

// ============================================================
// changePlan
// ============================================================

export async function changePlan(subscriptionId: string, newPlanId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient
    .from('subscriptions')
    .update({ plan_id: newPlanId, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/subscriptions')
  return { success: true }
}

// ============================================================
// extendTrial
// ============================================================

export async function extendTrial(subscriptionId: string, newEndDate: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient
    .from('subscriptions')
    .update({
      trial_end_date: newEndDate,
      status: 'trialing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/subscriptions')
  return { success: true }
}

// ============================================================
// cancelSubscription
// ============================================================

export async function cancelSubscription(subscriptionId: string) {
  const ctx = await getAdminContext()
  if ('error' in ctx) return { error: ctx.error }
  const { adminClient } = ctx

  const { error } = await adminClient
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) return { error: error.message }

  revalidatePath('/admin/subscriptions')
  return { success: true }
}
