'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const insurancePolicySchema = z.object({
  policyType: z.enum(['building', 'public_liability', 'office_bearers', 'fidelity', 'workers_comp', 'other']),
  policyNumber: z.string().min(1, 'Policy number is required'),
  insurerName: z.string().min(1, 'Insurer name is required'),
  brokerName: z.string().nullable(),
  premiumAmount: z.number().min(0, 'Premium amount must be positive'),
  sumInsured: z.number().min(0).nullable(),
  excessAmount: z.number().min(0).nullable(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  coverageNotes: z.string().nullable(),
  specialConditions: z.string().nullable(),
})

const propertyValuationSchema = z.object({
  valuationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  valuationAmount: z.number().min(1, 'Valuation amount must be greater than zero'),
  valuationType: z.enum(['insurance', 'market', 'depreciated_replacement']),
  valuerName: z.string().min(1, 'Valuer name is required'),
  valuerCompany: z.string().nullable(),
  valuerRegistrationNumber: z.string().nullable(),
  reportReference: z.string().nullable(),
  notes: z.string().nullable(),
  methodology: z.string().nullable(),
})

type InsurancePolicyInput = z.infer<typeof insurancePolicySchema> & { schemeId: string }
type PropertyValuationInput = z.infer<typeof propertyValuationSchema> & { schemeId: string }

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

async function verifySchemeAccess(supabase: Awaited<ReturnType<typeof createClient>>, schemeId: string, userId: string) {
  const { data: scheme, error } = await supabase
    .from('schemes')
    .select('organisation_id')
    .eq('id', schemeId)
    .single()

  if (error || !scheme) return false

  const { data: userOrg } = await supabase
    .from('user_organisations')
    .select('organisation_id, role')
    .eq('user_id', userId)
    .eq('organisation_id', scheme.organisation_id)
    .in('role', ['owner', 'admin'])
    .single()

  return !!userOrg
}

// ============================================================
// INSURANCE POLICY ACTIONS
// ============================================================

export async function createInsurancePolicy(input: InsurancePolicyInput) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, supabase } = result as Exclude<typeof result, { error: string }>

  // Validate input
  const validation = insurancePolicySchema.safeParse(input)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  // Verify scheme access
  const hasAccess = await verifySchemeAccess(supabase, input.schemeId, user.id)
  if (!hasAccess) {
    return { error: 'You do not have permission to manage insurance for this scheme' }
  }

  // Validate dates
  if (new Date(input.effectiveDate) >= new Date(input.expiryDate)) {
    return { error: 'Expiry date must be after effective date' }
  }

  // Create policy
  const { data: policy, error: insertError } = await supabase
    .from('insurance_policies')
    .insert({
      scheme_id: input.schemeId,
      policy_type: input.policyType,
      policy_number: input.policyNumber,
      insurer_name: input.insurerName,
      broker_name: input.brokerName,
      premium_amount: input.premiumAmount,
      sum_insured: input.sumInsured,
      excess_amount: input.excessAmount,
      effective_date: input.effectiveDate,
      expiry_date: input.expiryDate,
      coverage_notes: input.coverageNotes,
      special_conditions: input.specialConditions,
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/schemes/${input.schemeId}/insurance`)
  return { data: policy }
}

export async function updateInsurancePolicy(policyId: string, updates: Partial<InsurancePolicyInput>) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, supabase } = result as Exclude<typeof result, { error: string }>

  // Get existing policy
  const { data: existingPolicy, error: fetchError } = await supabase
    .from('insurance_policies')
    .select('scheme_id')
    .eq('id', policyId)
    .single()

  if (fetchError || !existingPolicy) {
    return { error: 'Policy not found' }
  }

  // Verify scheme access
  const hasAccess = await verifySchemeAccess(supabase, existingPolicy.scheme_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have permission to manage insurance for this scheme' }
  }

  // Build update object
  const updateData: Record<string, unknown> = { updated_by: user.id }
  if (updates.policyType !== undefined) updateData.policy_type = updates.policyType
  if (updates.policyNumber !== undefined) updateData.policy_number = updates.policyNumber
  if (updates.insurerName !== undefined) updateData.insurer_name = updates.insurerName
  if (updates.brokerName !== undefined) updateData.broker_name = updates.brokerName
  if (updates.premiumAmount !== undefined) updateData.premium_amount = updates.premiumAmount
  if (updates.sumInsured !== undefined) updateData.sum_insured = updates.sumInsured
  if (updates.excessAmount !== undefined) updateData.excess_amount = updates.excessAmount
  if (updates.effectiveDate !== undefined) updateData.effective_date = updates.effectiveDate
  if (updates.expiryDate !== undefined) updateData.expiry_date = updates.expiryDate
  if (updates.coverageNotes !== undefined) updateData.coverage_notes = updates.coverageNotes
  if (updates.specialConditions !== undefined) updateData.special_conditions = updates.specialConditions

  const { data: policy, error: updateError } = await supabase
    .from('insurance_policies')
    .update(updateData)
    .eq('id', policyId)
    .select()
    .single()

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/schemes/${existingPolicy.scheme_id}/insurance`)
  return { data: policy }
}

export async function deleteInsurancePolicy(policyId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, supabase } = result as Exclude<typeof result, { error: string }>

  // Get existing policy
  const { data: existingPolicy, error: fetchError } = await supabase
    .from('insurance_policies')
    .select('scheme_id')
    .eq('id', policyId)
    .single()

  if (fetchError || !existingPolicy) {
    return { error: 'Policy not found' }
  }

  // Verify scheme access
  const hasAccess = await verifySchemeAccess(supabase, existingPolicy.scheme_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have permission to manage insurance for this scheme' }
  }

  const { error: deleteError } = await supabase
    .from('insurance_policies')
    .delete()
    .eq('id', policyId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/schemes/${existingPolicy.scheme_id}/insurance`)
  return { success: true }
}

// ============================================================
// PROPERTY VALUATION ACTIONS
// ============================================================

export async function createPropertyValuation(input: PropertyValuationInput) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, supabase } = result as Exclude<typeof result, { error: string }>

  // Validate input
  const validation = propertyValuationSchema.safeParse(input)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  // Verify scheme access
  const hasAccess = await verifySchemeAccess(supabase, input.schemeId, user.id)
  if (!hasAccess) {
    return { error: 'You do not have permission to manage valuations for this scheme' }
  }

  // Create valuation
  const { data: valuation, error: insertError } = await supabase
    .from('property_valuations')
    .insert({
      scheme_id: input.schemeId,
      valuation_date: input.valuationDate,
      valuation_amount: input.valuationAmount,
      valuation_type: input.valuationType,
      valuer_name: input.valuerName,
      valuer_company: input.valuerCompany,
      valuer_registration_number: input.valuerRegistrationNumber,
      report_reference: input.reportReference,
      notes: input.notes,
      methodology: input.methodology,
      created_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/schemes/${input.schemeId}/insurance`)
  return { data: valuation }
}

export async function updatePropertyValuation(valuationId: string, updates: Partial<PropertyValuationInput>) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, supabase } = result as Exclude<typeof result, { error: string }>

  // Get existing valuation
  const { data: existingValuation, error: fetchError } = await supabase
    .from('property_valuations')
    .select('scheme_id')
    .eq('id', valuationId)
    .single()

  if (fetchError || !existingValuation) {
    return { error: 'Valuation not found' }
  }

  // Verify scheme access
  const hasAccess = await verifySchemeAccess(supabase, existingValuation.scheme_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have permission to manage valuations for this scheme' }
  }

  // Build update object
  const updateData: Record<string, unknown> = { updated_by: user.id }
  if (updates.valuationDate !== undefined) updateData.valuation_date = updates.valuationDate
  if (updates.valuationAmount !== undefined) updateData.valuation_amount = updates.valuationAmount
  if (updates.valuationType !== undefined) updateData.valuation_type = updates.valuationType
  if (updates.valuerName !== undefined) updateData.valuer_name = updates.valuerName
  if (updates.valuerCompany !== undefined) updateData.valuer_company = updates.valuerCompany
  if (updates.valuerRegistrationNumber !== undefined) updateData.valuer_registration_number = updates.valuerRegistrationNumber
  if (updates.reportReference !== undefined) updateData.report_reference = updates.reportReference
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.methodology !== undefined) updateData.methodology = updates.methodology

  const { data: valuation, error: updateError } = await supabase
    .from('property_valuations')
    .update(updateData)
    .eq('id', valuationId)
    .select()
    .single()

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/schemes/${existingValuation.scheme_id}/insurance`)
  return { data: valuation }
}

export async function deletePropertyValuation(valuationId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, supabase } = result as Exclude<typeof result, { error: string }>

  // Get existing valuation
  const { data: existingValuation, error: fetchError } = await supabase
    .from('property_valuations')
    .select('scheme_id')
    .eq('id', valuationId)
    .single()

  if (fetchError || !existingValuation) {
    return { error: 'Valuation not found' }
  }

  // Verify scheme access
  const hasAccess = await verifySchemeAccess(supabase, existingValuation.scheme_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have permission to manage valuations for this scheme' }
  }

  const { error: deleteError } = await supabase
    .from('property_valuations')
    .delete()
    .eq('id', valuationId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/schemes/${existingValuation.scheme_id}/insurance`)
  return { success: true }
}
