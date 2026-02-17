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
 * Get aggregate levy summary across all of the owner's lots.
 */
export async function getOwnerLevySummary() {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Get owner's lot IDs
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lot_id')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const lotIds = ownerships?.map(o => o.lot_id) ?? []
  if (lotIds.length === 0) {
    return { data: { totalBalance: 0, totalOverdue: 0, lotCount: 0 } }
  }

  const { data: items, error } = await supabase
    .from('levy_items')
    .select('lot_id, balance, status')
    .in('lot_id', lotIds)
    .in('status', ['pending', 'sent', 'partial', 'overdue'])

  if (error) return { error: error.message }

  const totalBalance = items?.reduce((sum, i) => sum + Number(i.balance), 0) ?? 0
  const totalOverdue = items
    ?.filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.balance), 0) ?? 0

  return {
    data: {
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      lotCount: lotIds.length,
    },
  }
}

/**
 * Get a detailed levy statement for a specific lot owned by the current owner.
 * Includes levy items, payment allocations, running balance, and payment instructions.
 */
export async function getOwnerLevyStatement(lotId: string) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Verify ownership
  const { data: ownership, error: ownershipError } = await supabase
    .from('lot_ownerships')
    .select('lot_id')
    .eq('owner_id', owner.id)
    .eq('lot_id', lotId)
    .is('ownership_end_date', null)
    .maybeSingle()

  if (ownershipError) return { error: ownershipError.message }
  if (!ownership) return { error: 'You do not own this lot' }

  // Get lot details with scheme info (including trust account)
  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .select(`
      id, lot_number, unit_number, unit_entitlement,
      schemes(id, scheme_name, trust_bsb, trust_account_number, trust_account_name)
    `)
    .eq('id', lotId)
    .single()

  if (lotError) return { error: lotError.message }

  // Get levy items ordered by due_date descending
  const { data: levyItems, error: levyError } = await supabase
    .from('levy_items')
    .select(`
      id, admin_levy_amount, capital_levy_amount, special_levy_amount,
      total_levy_amount, amount_paid, balance, due_date, status,
      notice_sent_at, paid_at,
      levy_periods(id, period_name, period_start, period_end)
    `)
    .eq('lot_id', lotId)
    .order('due_date', { ascending: false })

  if (levyError) return { error: levyError.message }

  // Get payment allocations for these levy items
  const levyItemIds = levyItems?.map(i => i.id) ?? []
  let allocations: Record<string, unknown>[] = []
  if (levyItemIds.length > 0) {
    const { data: allocs } = await supabase
      .from('payment_allocations')
      .select(`
        id, levy_item_id, allocated_amount,
        payments(id, payment_date, payment_method, reference, amount)
      `)
      .in('levy_item_id', levyItemIds)

    allocations = allocs ?? []
  }

  // Group allocations by levy_item_id
  const allocationsByItem: Record<string, typeof allocations> = {}
  for (const alloc of allocations) {
    const itemId = alloc.levy_item_id as string
    if (!allocationsByItem[itemId]) allocationsByItem[itemId] = []
    allocationsByItem[itemId].push(alloc)
  }

  // Calculate running balance (oldest to newest)
  const itemsChronological = [...(levyItems ?? [])].sort((a, b) =>
    a.due_date.localeCompare(b.due_date)
  )
  let runningBalance = 0
  const itemsWithRunningBalance = itemsChronological.map(item => {
    runningBalance += Number(item.balance)
    return {
      ...item,
      allocations: allocationsByItem[item.id] ?? [],
      running_balance: Math.round(runningBalance * 100) / 100,
    }
  })

  // Return in reverse chronological order for display
  itemsWithRunningBalance.reverse()

  const scheme = lot.schemes as unknown as {
    id: string
    scheme_name: string
    trust_bsb: string | null
    trust_account_number: string | null
    trust_account_name: string | null
  }

  return {
    data: {
      lot: {
        id: lot.id,
        lot_number: lot.lot_number,
        unit_number: lot.unit_number,
      },
      scheme: {
        id: scheme.id,
        name: scheme.scheme_name,
      },
      levyItems: itemsWithRunningBalance,
      currentBalance: Math.round(runningBalance * 100) / 100,
      paymentInstructions: scheme.trust_account_name
        ? {
            account_name: scheme.trust_account_name,
            bsb: scheme.trust_bsb,
            account_number: scheme.trust_account_number,
            reference: `Lot ${lot.lot_number}`,
          }
        : null,
    },
  }
}

/**
 * Generate a PDF levy statement for a specific lot.
 * Returns the PDF as a base64-encoded string.
 */
export async function downloadOwnerStatement(lotId: string) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Verify ownership
  const { data: ownership } = await supabase
    .from('lot_ownerships')
    .select('lot_id')
    .eq('owner_id', owner.id)
    .eq('lot_id', lotId)
    .is('ownership_end_date', null)
    .maybeSingle()

  if (!ownership) return { error: 'You do not own this lot' }

  // Get the full statement data
  const statementResult = await getOwnerLevyStatement(lotId)
  if ('error' in statementResult) return { error: statementResult.error }

  const statement = statementResult.data!

  // Use @react-pdf/renderer to generate PDF
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const React = await import('react')
  const { Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
    header: { marginBottom: 20 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#02667F', marginBottom: 4 },
    subtitle: { fontSize: 12, color: '#333', marginBottom: 2 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#02667F', paddingBottom: 4 },
    row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingVertical: 4 },
    headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4, marginBottom: 4, fontWeight: 'bold' },
    col1: { width: '25%' },
    col2: { width: '25%' },
    col3: { width: '15%', textAlign: 'right' },
    col4: { width: '15%', textAlign: 'right' },
    col5: { width: '20%', textAlign: 'right' },
    summaryBox: { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 4, marginBottom: 16 },
    summaryLabel: { fontSize: 10, color: '#666' },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#02667F' },
    paymentBox: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4 },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#999', textAlign: 'center' },
  })

  const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })

  const StatementDoc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, 'Levy Statement'),
        React.createElement(Text, { style: styles.subtitle }, statement.scheme.name),
        React.createElement(Text, { style: styles.subtitle }, `Lot ${statement.lot.lot_number}${statement.lot.unit_number ? ` (Unit ${statement.lot.unit_number})` : ''}`),
        React.createElement(Text, { style: styles.subtitle }, `Owner: ${owner.first_name} ${owner.last_name}`),
        React.createElement(Text, { style: { ...styles.subtitle, color: '#666', marginTop: 4 } }, `Statement Date: ${today}`)
      ),
      // Summary
      React.createElement(
        View,
        { style: styles.summaryBox },
        React.createElement(Text, { style: styles.summaryLabel }, 'Current Balance'),
        React.createElement(Text, { style: styles.summaryValue }, `$${statement.currentBalance.toFixed(2)}`)
      ),
      // Levy Items Table
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Levy History'),
        React.createElement(
          View,
          { style: styles.headerRow },
          React.createElement(Text, { style: styles.col1 }, 'Period'),
          React.createElement(Text, { style: styles.col2 }, 'Due Date'),
          React.createElement(Text, { style: styles.col3 }, 'Levied'),
          React.createElement(Text, { style: styles.col4 }, 'Paid'),
          React.createElement(Text, { style: styles.col5 }, 'Balance')
        ),
        ...statement.levyItems.map((item, idx) => {
          const period = item.levy_periods as unknown as { period_name: string } | null
          return React.createElement(
            View,
            { key: idx, style: styles.row },
            React.createElement(Text, { style: styles.col1 }, period?.period_name ?? '-'),
            React.createElement(Text, { style: styles.col2 }, item.due_date),
            React.createElement(Text, { style: styles.col3 }, `$${Number(item.total_levy_amount).toFixed(2)}`),
            React.createElement(Text, { style: styles.col4 }, `$${Number(item.amount_paid).toFixed(2)}`),
            React.createElement(Text, { style: styles.col5 }, `$${Number(item.balance).toFixed(2)}`)
          )
        })
      ),
      // Payment Instructions
      statement.paymentInstructions
        ? React.createElement(
            View,
            { style: styles.paymentBox },
            React.createElement(Text, { style: { ...styles.sectionTitle, borderBottomColor: '#999' } }, 'Payment Instructions'),
            React.createElement(Text, null, `Account Name: ${statement.paymentInstructions.account_name}`),
            React.createElement(Text, null, `BSB: ${statement.paymentInstructions.bsb ?? 'N/A'}`),
            React.createElement(Text, null, `Account Number: ${statement.paymentInstructions.account_number ?? 'N/A'}`),
            React.createElement(Text, null, `Reference: ${statement.paymentInstructions.reference}`)
          )
        : null,
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, `Generated by LevyLite on ${today}`)
      )
    )
  )

  const pdfBuffer = await renderToBuffer(StatementDoc)
  const base64 = Buffer.from(pdfBuffer).toString('base64')

  return {
    data: {
      pdf: base64,
      filename: `levy-statement-lot-${statement.lot.lot_number}-${new Date().toISOString().split('T')[0]}.pdf`,
    },
  }
}
