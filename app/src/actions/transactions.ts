'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const journalLineSchema = z.object({
  account_id: z.string().uuid('Invalid account'),
  line_type: z.enum(['debit', 'credit']),
  amount: z.number().positive('Line amount must be greater than zero'),
  description: z.string().optional().nullable(),
})

const transactionSchema = z.object({
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)'),
  transaction_type: z.enum(['receipt', 'payment', 'journal']),
  fund_type: z.enum(['admin', 'capital_works']),
  category_id: z.string().uuid('Invalid category').optional().nullable(),
  amount: z.number().positive('Amount must be greater than zero'),
  gst_amount: z.number().min(0, 'GST amount cannot be negative').default(0),
  description: z.string().min(1, 'Description is required'),
  reference: z.string().optional().nullable(),
  payment_method: z.enum(['eft', 'credit_card', 'cheque', 'cash', 'bpay']).optional().nullable(),
  lot_id: z.string().uuid().optional().nullable(),
  lines: z.array(journalLineSchema).optional(),
})

export type TransactionFormData = z.infer<typeof transactionSchema>
export type JournalLineData = z.infer<typeof journalLineSchema>

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  transactionType?: 'receipt' | 'payment' | 'journal'
  fundType?: 'admin' | 'capital_works'
  categoryId?: string
  isReconciled?: boolean
  lotId?: string
}

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

/**
 * List transactions with filtering. Includes category name/code and lot info.
 */
export async function getTransactions(schemeId: string, filters?: TransactionFilters) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  let query = supabase
    .from('transactions')
    .select(`
      *,
      chart_of_accounts:category_id(id, code, name, account_type, fund_type),
      lots:lot_id(id, lot_number, unit_number)
    `)
    .eq('scheme_id', schemeId)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.startDate) {
    query = query.gte('transaction_date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('transaction_date', filters.endDate)
  }
  if (filters?.transactionType) {
    query = query.eq('transaction_type', filters.transactionType)
  }
  if (filters?.fundType) {
    query = query.eq('fund_type', filters.fundType)
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }
  if (filters?.isReconciled !== undefined) {
    query = query.eq('is_reconciled', filters.isReconciled)
  }
  if (filters?.lotId) {
    query = query.eq('lot_id', filters.lotId)
  }

  const { data: transactions, error } = await query

  if (error) return { error: error.message }
  return { data: transactions }
}

/**
 * Get a single transaction with its transaction_lines and payment_allocations.
 */
export async function getTransaction(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select(`
      *,
      chart_of_accounts:category_id(id, code, name, account_type, fund_type),
      lots:lot_id(id, lot_number, unit_number),
      transaction_lines(
        id, account_id, line_type, amount, description,
        chart_of_accounts:account_id(id, code, name)
      ),
      payment_allocations(
        id, allocated_amount,
        levy_items:levy_item_id(id, due_date, status, levy_periods(period_name))
      )
    `)
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: transaction }
}

/**
 * Create a receipt, payment, or journal transaction.
 * For receipt/payment: the DB trigger auto_create_transaction_lines handles debit/credit lines.
 * For journal: requires manual lines array with balanced debits/credits.
 */
export async function createTransaction(schemeId: string, data: TransactionFormData) {
  const parsed = transactionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // For receipt/payment, category_id is required
  if (parsed.data.transaction_type !== 'journal' && !parsed.data.category_id) {
    return { error: 'Category is required for receipt and payment transactions' }
  }

  // For journal, validate lines
  if (parsed.data.transaction_type === 'journal') {
    if (!parsed.data.lines || parsed.data.lines.length < 2) {
      return { error: 'Journal entries require at least 2 lines (debit and credit)' }
    }

    const totalDebits = parsed.data.lines
      .filter(l => l.line_type === 'debit')
      .reduce((sum, l) => sum + l.amount, 0)
    const totalCredits = parsed.data.lines
      .filter(l => l.line_type === 'credit')
      .reduce((sum, l) => sum + l.amount, 0)

    const roundedDebits = Math.round(totalDebits * 100) / 100
    const roundedCredits = Math.round(totalCredits * 100) / 100

    if (roundedDebits !== roundedCredits) {
      return {
        error: `Journal entry is unbalanced: debits ($${roundedDebits.toFixed(2)}) != credits ($${roundedCredits.toFixed(2)})`,
      }
    }
  }

  // Insert the transaction
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .insert({
      scheme_id: schemeId,
      transaction_date: parsed.data.transaction_date,
      transaction_type: parsed.data.transaction_type,
      fund_type: parsed.data.fund_type,
      category_id: parsed.data.category_id ?? null,
      amount: parsed.data.amount,
      gst_amount: parsed.data.gst_amount,
      description: parsed.data.description,
      reference: parsed.data.reference ?? null,
      payment_method: parsed.data.payment_method ?? null,
      lot_id: parsed.data.lot_id ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (txnError) return { error: txnError.message }

  // For journal entries, insert the manual lines
  if (parsed.data.transaction_type === 'journal' && parsed.data.lines) {
    const lines = parsed.data.lines.map(line => ({
      transaction_id: transaction.id,
      account_id: line.account_id,
      line_type: line.line_type,
      amount: line.amount,
      description: line.description ?? null,
    }))

    const { error: linesError } = await supabase
      .from('transaction_lines')
      .insert(lines)

    if (linesError) {
      return { error: `Transaction created but lines failed: ${linesError.message}` }
    }
  }

  revalidatePath(`/schemes/${schemeId}`)
  revalidatePath(`/schemes/${schemeId}/trust-accounting`)
  revalidatePath(`/schemes/${schemeId}/trust-accounting/transactions`)
  return { data: transaction }
}

/**
 * Update a transaction. Only if not reconciled.
 * For receipt/payment: deletes old lines, trigger creates new ones on re-insert.
 * For journal: re-inserts manual lines.
 * NOTE: Uses delete + re-insert approach since the trigger fires on INSERT.
 */
export async function updateTransaction(id: string, data: TransactionFormData) {
  const parsed = transactionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check that the transaction is not reconciled
  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select('scheme_id, is_reconciled')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (existing.is_reconciled) return { error: 'Cannot update a reconciled transaction' }

  // For receipt/payment, category_id is required
  if (parsed.data.transaction_type !== 'journal' && !parsed.data.category_id) {
    return { error: 'Category is required for receipt and payment transactions' }
  }

  // For journal, validate lines
  if (parsed.data.transaction_type === 'journal') {
    if (!parsed.data.lines || parsed.data.lines.length < 2) {
      return { error: 'Journal entries require at least 2 lines (debit and credit)' }
    }

    const totalDebits = parsed.data.lines
      .filter(l => l.line_type === 'debit')
      .reduce((sum, l) => sum + l.amount, 0)
    const totalCredits = parsed.data.lines
      .filter(l => l.line_type === 'credit')
      .reduce((sum, l) => sum + l.amount, 0)

    const roundedDebits = Math.round(totalDebits * 100) / 100
    const roundedCredits = Math.round(totalCredits * 100) / 100

    if (roundedDebits !== roundedCredits) {
      return {
        error: `Journal entry is unbalanced: debits ($${roundedDebits.toFixed(2)}) != credits ($${roundedCredits.toFixed(2)})`,
      }
    }
  }

  // Delete existing transaction_lines (CASCADE handles this, but explicit is safer for the trigger)
  const { error: deleteLinesError } = await supabase
    .from('transaction_lines')
    .delete()
    .eq('transaction_id', id)

  if (deleteLinesError) return { error: `Failed to clear old lines: ${deleteLinesError.message}` }

  // Update the transaction record
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .update({
      transaction_date: parsed.data.transaction_date,
      transaction_type: parsed.data.transaction_type,
      fund_type: parsed.data.fund_type,
      category_id: parsed.data.category_id ?? null,
      amount: parsed.data.amount,
      gst_amount: parsed.data.gst_amount,
      description: parsed.data.description,
      reference: parsed.data.reference ?? null,
      payment_method: parsed.data.payment_method ?? null,
      lot_id: parsed.data.lot_id ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (txnError) return { error: txnError.message }

  // Re-create lines: for receipt/payment, manually insert the same lines the trigger would
  // (trigger only fires on INSERT, not UPDATE)
  if (parsed.data.transaction_type === 'journal' && parsed.data.lines) {
    const lines = parsed.data.lines.map(line => ({
      transaction_id: id,
      account_id: line.account_id,
      line_type: line.line_type,
      amount: line.amount,
      description: line.description ?? null,
    }))

    const { error: linesError } = await supabase
      .from('transaction_lines')
      .insert(lines)

    if (linesError) return { error: `Transaction updated but lines failed: ${linesError.message}` }
  } else if (parsed.data.transaction_type === 'receipt' || parsed.data.transaction_type === 'payment') {
    // For receipt/payment, we need to manually recreate the double-entry lines
    // since the trigger only fires on INSERT, not UPDATE

    // Look up the trust account for this fund type
    const trustCode = parsed.data.fund_type === 'admin' ? '1100' : '1200'
    const { data: trustAccount, error: trustError } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('code', trustCode)
      .or(`scheme_id.eq.${existing.scheme_id},scheme_id.is.null`)
      .order('scheme_id', { ascending: true, nullsFirst: false })
      .limit(1)
      .single()

    if (trustError || !trustAccount) {
      return { error: `Trust account ${trustCode} not found` }
    }

    const lines = parsed.data.transaction_type === 'receipt'
      ? [
          { transaction_id: id, account_id: trustAccount.id, line_type: 'debit' as const, amount: parsed.data.amount, description: parsed.data.description },
          { transaction_id: id, account_id: parsed.data.category_id!, line_type: 'credit' as const, amount: parsed.data.amount, description: parsed.data.description },
        ]
      : [
          { transaction_id: id, account_id: parsed.data.category_id!, line_type: 'debit' as const, amount: parsed.data.amount, description: parsed.data.description },
          { transaction_id: id, account_id: trustAccount.id, line_type: 'credit' as const, amount: parsed.data.amount, description: parsed.data.description },
        ]

    const { error: linesError } = await supabase
      .from('transaction_lines')
      .insert(lines)

    if (linesError) return { error: `Transaction updated but lines failed: ${linesError.message}` }
  }

  revalidatePath(`/schemes/${existing.scheme_id}`)
  revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting`)
  revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting/transactions`)
  return { data: transaction }
}

/**
 * Soft-delete a transaction (set deleted_at).
 * Only if not reconciled and no payment_allocations reference it.
 */
export async function deleteTransaction(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check that the transaction is not reconciled
  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select('scheme_id, is_reconciled')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (existing.is_reconciled) return { error: 'Cannot delete a reconciled transaction' }

  // Check for payment_allocations
  const { count, error: countError } = await supabase
    .from('payment_allocations')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', id)

  if (countError) return { error: countError.message }
  if (count && count > 0) {
    return { error: `Cannot delete: transaction has ${count} payment allocation(s). Remove allocations first.` }
  }

  // Soft-delete
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/schemes/${existing.scheme_id}`)
  revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting`)
  revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting/transactions`)
  return { data: true }
}

/**
 * Get aggregate summary: total receipts, total payments, net movement, by fund type.
 */
export async function getTransactionSummary(schemeId: string, dateRange?: { startDate: string; endDate: string }) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  let query = supabase
    .from('transactions')
    .select('transaction_type, fund_type, amount')
    .eq('scheme_id', schemeId)
    .is('deleted_at', null)

  if (dateRange?.startDate) {
    query = query.gte('transaction_date', dateRange.startDate)
  }
  if (dateRange?.endDate) {
    query = query.lte('transaction_date', dateRange.endDate)
  }

  const { data: transactions, error } = await query

  if (error) return { error: error.message }

  const summary = {
    admin: { receipts: 0, payments: 0, net: 0 },
    capital_works: { receipts: 0, payments: 0, net: 0 },
    total: { receipts: 0, payments: 0, net: 0 },
  }

  transactions?.forEach(txn => {
    const fund = txn.fund_type as 'admin' | 'capital_works'
    if (txn.transaction_type === 'receipt') {
      summary[fund].receipts += txn.amount
      summary.total.receipts += txn.amount
    } else if (txn.transaction_type === 'payment') {
      summary[fund].payments += txn.amount
      summary.total.payments += txn.amount
    }
  })

  // Calculate net and round
  for (const key of ['admin', 'capital_works', 'total'] as const) {
    summary[key].receipts = Math.round(summary[key].receipts * 100) / 100
    summary[key].payments = Math.round(summary[key].payments * 100) / 100
    summary[key].net = Math.round((summary[key].receipts - summary[key].payments) * 100) / 100
  }

  return { data: summary }
}
