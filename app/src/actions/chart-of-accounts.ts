'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const accountSchema = z.object({
  code: z.string()
    .min(1, 'Account code is required')
    .max(10, 'Account code must be 10 characters or less')
    .regex(/^\d{4}$/, 'Account code must be a 4-digit number'),
  name: z.string()
    .min(2, 'Account name must be at least 2 characters')
    .max(255),
  account_type: z.enum(['asset', 'liability', 'income', 'expense', 'equity']),
  fund_type: z.enum(['admin', 'capital_works']).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
})

export type AccountFormData = z.infer<typeof accountSchema>

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

/**
 * Get all accounts for a scheme, including org-level defaults (scheme_id IS NULL).
 * Scheme-specific accounts take precedence over defaults with the same code.
 */
export async function getChartOfAccounts(schemeId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .or(`scheme_id.eq.${schemeId},scheme_id.is.null`)
    .eq('is_active', true)
    .order('code')

  if (error) return { error: error.message }
  return { data: accounts }
}

/**
 * Get a single account by ID.
 */
export async function getAccount(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: account, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: account }
}

/**
 * Create a custom (non-system) account for a scheme.
 */
export async function createAccount(schemeId: string, data: AccountFormData) {
  const parsed = accountSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: account, error } = await supabase
    .from('chart_of_accounts')
    .insert({
      scheme_id: schemeId,
      code: parsed.data.code,
      name: parsed.data.name,
      account_type: parsed.data.account_type,
      fund_type: parsed.data.fund_type ?? null,
      parent_id: parsed.data.parent_id ?? null,
      is_system: false,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/schemes/${schemeId}`)
  revalidatePath(`/schemes/${schemeId}/trust-accounting`)
  return { data: account }
}

/**
 * Update a non-system account. System accounts are read-only.
 */
export async function updateAccount(id: string, data: AccountFormData) {
  const parsed = accountSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check that account is not a system account
  const { data: existing, error: fetchError } = await supabase
    .from('chart_of_accounts')
    .select('is_system, scheme_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (existing.is_system) return { error: 'System accounts cannot be modified' }

  const { data: account, error } = await supabase
    .from('chart_of_accounts')
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      account_type: parsed.data.account_type,
      fund_type: parsed.data.fund_type ?? null,
      parent_id: parsed.data.parent_id ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  if (existing.scheme_id) {
    revalidatePath(`/schemes/${existing.scheme_id}`)
    revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting`)
  }
  return { data: account }
}

/**
 * Soft-delete an account (set is_active=false).
 * Only non-system accounts. Prevents deletion if referenced by transactions.
 */
export async function deleteAccount(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check that account is not a system account
  const { data: existing, error: fetchError } = await supabase
    .from('chart_of_accounts')
    .select('is_system, scheme_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (existing.is_system) return { error: 'System accounts cannot be deleted' }

  // Check if referenced by any transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (countError) return { error: countError.message }
  if (count && count > 0) {
    return { error: `Cannot delete account: it is referenced by ${count} transaction(s)` }
  }

  // Also check transaction_lines
  const { count: lineCount, error: lineCountError } = await supabase
    .from('transaction_lines')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id)

  if (lineCountError) return { error: lineCountError.message }
  if (lineCount && lineCount > 0) {
    return { error: `Cannot delete account: it is referenced by ${lineCount} transaction line(s)` }
  }

  // Soft-delete: set is_active = false
  const { error } = await supabase
    .from('chart_of_accounts')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { error: error.message }
  if (existing.scheme_id) {
    revalidatePath(`/schemes/${existing.scheme_id}`)
    revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting`)
  }
  return { data: true }
}

/**
 * Get accounts filtered by account type for a scheme.
 */
export async function getAccountsByType(schemeId: string, accountType: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: accounts, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .or(`scheme_id.eq.${schemeId},scheme_id.is.null`)
    .eq('account_type', accountType)
    .eq('is_active', true)
    .order('code')

  if (error) return { error: error.message }
  return { data: accounts }
}
