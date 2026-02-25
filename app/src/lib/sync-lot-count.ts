import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

/**
 * Count all active lots for an org and push the quantity to Stripe.
 * The existing `customer.subscription.updated` webhook writes
 * `billed_lots_count` back to Supabase, so we don't touch that here.
 */
export async function syncLotCountToStripe(orgId: string): Promise<void> {
  const admin = createAdminClient()

  // Get subscription for this org
  const { data: subscription, error: subError } = await admin
    .from('subscriptions')
    .select('id, status, stripe_subscription_id')
    .eq('organisation_id', orgId)
    .single()

  if (subError || !subscription) return
  if (!subscription.stripe_subscription_id) return
  if (subscription.status !== 'active') return

  // Count active lots across all schemes in the org
  const { count, error: countError } = await admin
    .from('lots')
    .select('id, schemes!inner(organisation_id)', { count: 'exact', head: true })
    .eq('schemes.organisation_id', orgId)

  if (countError || count === null) return

  const stripe = getStripe()

  // Retrieve the Stripe subscription to get the line item ID
  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
  const item = stripeSub.items.data[0]
  if (!item) return

  // Skip if quantity unchanged
  if (item.quantity === count) return

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    items: [{ id: item.id, quantity: count }],
    proration_behavior: 'create_prorations',
  })
}

/**
 * Resolve orgId from a schemeId, then sync lot count to Stripe.
 * Fire-and-forget: callers don't await, errors are logged.
 */
export function fireAndForgetLotSync(schemeId: string): void {
  const run = async () => {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('schemes')
      .select('organisation_id')
      .eq('id', schemeId)
      .single()

    if (error || !data) return
    await syncLotCountToStripe(data.organisation_id)
  }

  run().catch((err: unknown) => {
    console.error('[sync-lot-count] Failed to sync lot count to Stripe:', err)
  })
}
