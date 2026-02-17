'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const financialYearSchema = z.object({
  year_label: z.string()
    .min(1, 'Year label is required')
    .max(20, 'Year label must be 20 characters or less')
    .regex(/^\d{4}\/\d{2}$/, 'Year label must be in format "2025/26"'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date (YYYY-MM-DD)'),
  admin_opening_balance: z.number().default(0),
  capital_opening_balance: z.number().default(0),
})

export type FinancialYearFormData = z.infer<typeof financialYearSchema>

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

/**
 * Get all financial years for a scheme, ordered by start_date DESC.
 */
export async function getFinancialYears(schemeId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: years, error } = await supabase
    .from('financial_years')
    .select('*')
    .eq('scheme_id', schemeId)
    .order('start_date', { ascending: false })

  if (error) return { error: error.message }
  return { data: years }
}

/**
 * Get the current financial year (is_current=true) for a scheme.
 */
export async function getCurrentFinancialYear(schemeId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: year, error } = await supabase
    .from('financial_years')
    .select('*')
    .eq('scheme_id', schemeId)
    .eq('is_current', true)
    .maybeSingle()

  if (error) return { error: error.message }
  return { data: year }
}

/**
 * Create a new financial year. Validates no date overlap with existing FYs.
 */
export async function createFinancialYear(schemeId: string, data: FinancialYearFormData) {
  const parsed = financialYearSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  if (parsed.data.end_date <= parsed.data.start_date) {
    return { error: 'End date must be after start date' }
  }

  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Check for overlapping financial years
  const { data: overlapping, error: overlapError } = await supabase
    .from('financial_years')
    .select('id, year_label')
    .eq('scheme_id', schemeId)
    .lt('start_date', parsed.data.end_date)
    .gt('end_date', parsed.data.start_date)

  if (overlapError) return { error: overlapError.message }
  if (overlapping && overlapping.length > 0) {
    return { error: `Date range overlaps with existing financial year: ${overlapping[0].year_label}` }
  }

  // Check if this is the first FY for this scheme (auto-set as current)
  const { count, error: countError } = await supabase
    .from('financial_years')
    .select('id', { count: 'exact', head: true })
    .eq('scheme_id', schemeId)

  if (countError) return { error: countError.message }
  const isFirst = (count ?? 0) === 0

  const { data: year, error } = await supabase
    .from('financial_years')
    .insert({
      scheme_id: schemeId,
      year_label: parsed.data.year_label,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      admin_opening_balance: parsed.data.admin_opening_balance,
      capital_opening_balance: parsed.data.capital_opening_balance,
      is_current: isFirst,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/schemes/${schemeId}`)
  revalidatePath(`/schemes/${schemeId}/trust-accounting`)
  return { data: year }
}

/**
 * Update a financial year's details.
 */
export async function updateFinancialYear(id: string, data: FinancialYearFormData) {
  const parsed = financialYearSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  if (parsed.data.end_date <= parsed.data.start_date) {
    return { error: 'End date must be after start date' }
  }

  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get the existing record to know the scheme_id for overlap check
  const { data: existing, error: fetchError } = await supabase
    .from('financial_years')
    .select('scheme_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  // Check for overlapping financial years (excluding self)
  const { data: overlapping, error: overlapError } = await supabase
    .from('financial_years')
    .select('id, year_label')
    .eq('scheme_id', existing.scheme_id)
    .neq('id', id)
    .lt('start_date', parsed.data.end_date)
    .gt('end_date', parsed.data.start_date)

  if (overlapError) return { error: overlapError.message }
  if (overlapping && overlapping.length > 0) {
    return { error: `Date range overlaps with existing financial year: ${overlapping[0].year_label}` }
  }

  const { data: year, error } = await supabase
    .from('financial_years')
    .update({
      year_label: parsed.data.year_label,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      admin_opening_balance: parsed.data.admin_opening_balance,
      capital_opening_balance: parsed.data.capital_opening_balance,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/schemes/${existing.scheme_id}`)
  revalidatePath(`/schemes/${existing.scheme_id}/trust-accounting`)
  return { data: year }
}

/**
 * Set a financial year as the current one.
 * Unsets the previous current FY for the same scheme.
 */
export async function setCurrentFinancialYear(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get the scheme_id for this FY
  const { data: fy, error: fetchError } = await supabase
    .from('financial_years')
    .select('scheme_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  // Unset any existing current FY for this scheme
  const { error: unsetError } = await supabase
    .from('financial_years')
    .update({ is_current: false })
    .eq('scheme_id', fy.scheme_id)
    .eq('is_current', true)

  if (unsetError) return { error: unsetError.message }

  // Set the new current FY
  const { data: year, error } = await supabase
    .from('financial_years')
    .update({ is_current: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/schemes/${fy.scheme_id}`)
  revalidatePath(`/schemes/${fy.scheme_id}/trust-accounting`)
  return { data: year }
}
