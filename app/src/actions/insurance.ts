'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { InsurancePolicy, UpcomingInsuranceRenewal } from '@/lib/types'

const insurancePolicySchema = z.object({
  policy_type: z.enum(['building', 'public_liability', 'office_bearers', 'fidelity', 'workers_comp', 'other']),
  policy_number: z.string().optional().nullable(),
  insurer: z.string().min(1, 'Insurer is required'),
  broker: z.string().optional().nullable(),
  premium_amount: z.number().min(0, 'Premium must be positive'),
  sum_insured: z.number().min(0).optional().nullable(),
  policy_start_date: z.string(),
  policy_end_date: z.string(),
  renewal_date: z.string(),
  last_valuation_date: z.string().optional().nullable(),
  last_valuation_amount: z.number().min(0).optional().nullable(),
  valuer_name: z.string().optional().nullable(),
  valuer_company: z.string().optional().nullable(),
  valuation_notes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'expired', 'cancelled']).default('active'),
})

export type InsurancePolicyFormData = z.infer<typeof insurancePolicySchema>

async function getOrgId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: orgUser } = await supabase
    .from('organisation_users')
    .select('organisation_id')
    .eq('user_id', user.id)
    .single()
  if (!orgUser) return { error: 'No organisation found' as const }

  return { user, orgId: orgUser.organisation_id, supabase }
}

export async function getInsurancePolicies(schemeId: string) {
  const result = await getOrgId()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: policies, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('scheme_id', schemeId)
    .order('renewal_date', { ascending: true })

  if (error) return { error: error.message }
  return { data: policies as InsurancePolicy[] }
}

export async function getInsurancePolicy(id: string) {
  const result = await getOrgId()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: policy, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: policy as InsurancePolicy }
}

export async function createInsurancePolicy(schemeId: string, data: InsurancePolicyFormData) {
  const parsed = insurancePolicySchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getOrgId()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  const { data: policy, error } = await supabase
    .from('insurance_policies')
    .insert({
      scheme_id: schemeId,
      ...parsed.data,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/schemes/${schemeId}/insurance`)
  return { data: policy as InsurancePolicy }
}

export async function updateInsurancePolicy(id: string, data: Partial<InsurancePolicyFormData>) {
  const result = await getOrgId()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  const { data: policy, error } = await supabase
    .from('insurance_policies')
    .update({
      ...data,
      updated_by: user.id,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  const { data: schemeData } = await supabase
    .from('insurance_policies')
    .select('scheme_id')
    .eq('id', id)
    .single()

  if (schemeData) {
    revalidatePath(`/schemes/${schemeData.scheme_id}/insurance`)
  }

  return { data: policy as InsurancePolicy }
}

export async function deleteInsurancePolicy(id: string) {
  const result = await getOrgId()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: schemeData } = await supabase
    .from('insurance_policies')
    .select('scheme_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('insurance_policies')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  if (schemeData) {
    revalidatePath(`/schemes/${schemeData.scheme_id}/insurance`)
  }

  return { success: true }
}

export async function getUpcomingRenewals(schemeId: string, daysAhead = 90) {
  const result = await getOrgId()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: renewals, error } = await supabase
    .rpc('get_upcoming_insurance_renewals', {
      p_scheme_id: schemeId,
      p_days_ahead: daysAhead,
    })

  if (error) return { error: error.message }
  return { data: renewals as UpcomingInsuranceRenewal[] }
}
