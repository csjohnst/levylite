'use server'

import { createClient } from '@/lib/supabase/server'

async function getOwnerAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: owner, error } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email, portal_user_id')
    .eq('portal_user_id', user.id)
    .single()

  if (error || !owner) return { error: 'Not an owner' as const }
  return { user, owner, supabase }
}

/**
 * Get comprehensive dashboard data for the logged-in owner.
 * Returns lots, levy balances, next due, recent payments,
 * upcoming meetings, and open maintenance requests.
 */
export async function getOwnerDashboard() {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // 1. Get owner's lots with scheme info
  const { data: ownerships, error: ownershipError } = await supabase
    .from('lot_ownerships')
    .select(`
      lot_id, ownership_type, ownership_percentage,
      lots(
        id, lot_number, unit_number, unit_entitlement,
        schemes(id, scheme_name, trust_bsb, trust_account_number, trust_account_name)
      )
    `)
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  if (ownershipError) return { error: ownershipError.message }

  const lotIds = ownerships?.map(o => o.lot_id) ?? []
  const schemeIds = [
    ...new Set(
      ownerships
        ?.map(o => {
          const lot = o.lots as unknown as { schemes: { id: string } }
          return lot?.schemes?.id
        })
        .filter(Boolean) ?? []
    ),
  ]

  if (lotIds.length === 0) {
    return {
      data: {
        owner: { first_name: owner.first_name, last_name: owner.last_name },
        lots: [],
        levyBalance: { total: 0, overdue: 0 },
        nextLevyDue: null,
        recentPayments: [],
        upcomingMeetings: [],
        openMaintenanceRequests: [],
        paymentStatusByLot: [],
      },
    }
  }

  // 2. Get levy balance per lot
  const { data: levyItems } = await supabase
    .from('levy_items')
    .select('lot_id, total_levy_amount, amount_paid, balance, status, due_date')
    .in('lot_id', lotIds)
    .in('status', ['pending', 'sent', 'partial', 'overdue'])

  const totalBalance = levyItems?.reduce((sum, item) => sum + Number(item.balance), 0) ?? 0
  const totalOverdue = levyItems
    ?.filter(item => item.status === 'overdue')
    .reduce((sum, item) => sum + Number(item.balance), 0) ?? 0

  // 3. Next levy due (next unpaid item by due_date)
  const nextDue = levyItems
    ?.filter(item => Number(item.balance) > 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null

  // 4. Recent payments (last 5 across all lots)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('id, amount, payment_date, payment_method, reference, lot_id, lots(lot_number, unit_number)')
    .in('lot_id', lotIds)
    .order('payment_date', { ascending: false })
    .limit(5)

  // 5. Upcoming meetings (next 3 in owner's schemes)
  const { data: upcomingMeetings } = schemeIds.length > 0
    ? await supabase
        .from('meetings')
        .select('id, meeting_type, meeting_date, location, location_virtual, status, schemes:scheme_id(id, scheme_name)')
        .in('scheme_id', schemeIds)
        .in('status', ['scheduled', 'notice_sent'])
        .gte('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: true })
        .limit(3)
    : { data: [] }

  // 6. Open maintenance requests
  const { data: openRequests } = await supabase
    .from('maintenance_requests')
    .select('id, title, status, priority, created_at, lot_id, lots:lot_id(lot_number, unit_number)')
    .in('lot_id', lotIds)
    .not('status', 'in', '("completed","closed")')
    .order('created_at', { ascending: false })
    .limit(5)

  // 7. Payment status per lot
  const paymentStatusByLot = lotIds.map(lotId => {
    const lotItems = levyItems?.filter(i => i.lot_id === lotId) ?? []
    const lotBalance = lotItems.reduce((sum, i) => sum + Number(i.balance), 0)
    const hasOverdue = lotItems.some(i => i.status === 'overdue')
    const hasPartial = lotItems.some(i => i.status === 'partial')

    let status: 'up_to_date' | 'overdue' | 'partial' = 'up_to_date'
    if (hasOverdue) status = 'overdue'
    else if (hasPartial || lotBalance > 0) status = 'partial'

    return { lot_id: lotId, balance: Math.round(lotBalance * 100) / 100, status }
  })

  return {
    data: {
      owner: { first_name: owner.first_name, last_name: owner.last_name },
      lots: ownerships ?? [],
      levyBalance: {
        total: Math.round(totalBalance * 100) / 100,
        overdue: Math.round(totalOverdue * 100) / 100,
      },
      nextLevyDue: nextDue
        ? {
            lot_id: nextDue.lot_id,
            amount: Number(nextDue.balance),
            due_date: nextDue.due_date,
          }
        : null,
      recentPayments: recentPayments ?? [],
      upcomingMeetings: upcomingMeetings ?? [],
      openMaintenanceRequests: openRequests ?? [],
      paymentStatusByLot,
    },
  }
}
