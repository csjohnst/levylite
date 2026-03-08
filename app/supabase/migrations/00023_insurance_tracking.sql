-- Migration 00023: Insurance Tracking
-- Track insurance policies, valuations, and renewal dates for strata schemes
-- Addresses GitHub issue #21

-- Insurance policies table
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Policy identification
  policy_type VARCHAR(50) NOT NULL,
  policy_number VARCHAR(100),
  insurer VARCHAR(255) NOT NULL,
  broker VARCHAR(255),

  -- Financial
  premium_amount DECIMAL(12,2) NOT NULL,
  sum_insured DECIMAL(15,2),
  
  -- Dates
  policy_start_date DATE NOT NULL,
  policy_end_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  
  -- Valuation tracking
  last_valuation_date DATE,
  last_valuation_amount DECIMAL(15,2),
  valuer_name VARCHAR(255),
  valuer_company VARCHAR(255),
  valuation_notes TEXT,
  
  -- Additional details
  notes TEXT,
  attachment_url TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT valid_policy_type CHECK (policy_type IN ('building', 'public_liability', 'office_bearers', 'fidelity', 'workers_comp', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'cancelled')),
  CONSTRAINT valid_premium CHECK (premium_amount >= 0),
  CONSTRAINT valid_sum_insured CHECK (sum_insured IS NULL OR sum_insured >= 0),
  CONSTRAINT valid_valuation_amount CHECK (last_valuation_amount IS NULL OR last_valuation_amount >= 0),
  CONSTRAINT valid_dates CHECK (policy_end_date >= policy_start_date)
);

-- Indexes
CREATE INDEX idx_insurance_scheme ON public.insurance_policies(scheme_id);
CREATE INDEX idx_insurance_renewal ON public.insurance_policies(renewal_date);
CREATE INDEX idx_insurance_status ON public.insurance_policies(status);
CREATE INDEX idx_insurance_type ON public.insurance_policies(policy_type);
CREATE INDEX idx_insurance_valuation_date ON public.insurance_policies(last_valuation_date);

-- Row-level security
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.insurance_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = insurance_policies.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- Triggers
CREATE TRIGGER set_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Check for outdated valuations
CREATE OR REPLACE FUNCTION public.insurance_valuation_is_outdated(valuation_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN valuation_date IS NOT NULL AND valuation_date < CURRENT_DATE - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get upcoming renewals for a scheme
CREATE OR REPLACE FUNCTION public.get_upcoming_insurance_renewals(
  p_scheme_id UUID,
  p_days_ahead INTEGER DEFAULT 90
)
RETURNS TABLE (
  policy_id UUID,
  policy_type VARCHAR,
  insurer VARCHAR,
  renewal_date DATE,
  days_until_renewal INTEGER,
  premium_amount DECIMAL,
  valuation_outdated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id,
    ip.policy_type,
    ip.insurer,
    ip.renewal_date,
    (ip.renewal_date - CURRENT_DATE)::INTEGER,
    ip.premium_amount,
    public.insurance_valuation_is_outdated(ip.last_valuation_date)
  FROM public.insurance_policies ip
  WHERE ip.scheme_id = p_scheme_id
    AND ip.status = 'active'
    AND ip.renewal_date <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
    AND ip.renewal_date >= CURRENT_DATE
  ORDER BY ip.renewal_date ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.insurance_valuation_is_outdated TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_insurance_renewals TO authenticated;

-- Comments
COMMENT ON TABLE public.insurance_policies IS 'Insurance policies for strata schemes including valuations and renewal tracking';
COMMENT ON COLUMN public.insurance_policies.policy_type IS 'building, public_liability, office_bearers, fidelity, workers_comp, other';
COMMENT ON COLUMN public.insurance_policies.last_valuation_date IS 'Flagged as outdated if > 2 years old';
