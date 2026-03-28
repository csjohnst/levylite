-- Migration 00023: Insurance Tracking with Valuations
-- Tables: insurance_policies, property_valuations
-- Feature: Track insurance policies, premiums, renewals, and property valuations
-- Ref: https://github.com/csjohnst/levylite/issues/21

-- ============================================================
-- 1. CREATE TABLES
-- ============================================================

-- Insurance policies
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Policy identification
  policy_type TEXT NOT NULL, -- e.g. building, public_liability, office_bearers, fidelity
  policy_number TEXT NOT NULL,
  insurer_name TEXT NOT NULL,
  broker_name TEXT,

  -- Financial
  premium_amount DECIMAL(12,2) NOT NULL CHECK (premium_amount >= 0),
  sum_insured DECIMAL(12,2), -- NULL allowed for policies like public liability
  excess_amount DECIMAL(12,2) CHECK (excess_amount >= 0),

  -- Dates
  effective_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  renewal_notice_sent_at TIMESTAMPTZ,

  -- Additional details
  coverage_notes TEXT,
  special_conditions TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_renewal')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_policy_dates CHECK (expiry_date > effective_date)
);

-- Property valuations (for insurance purposes)
CREATE TABLE public.property_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Valuation details
  valuation_date DATE NOT NULL,
  valuation_amount DECIMAL(12,2) NOT NULL CHECK (valuation_amount > 0),
  valuation_type TEXT NOT NULL DEFAULT 'insurance', -- insurance, market, depreciated_replacement
  
  -- Valuer information
  valuer_name TEXT NOT NULL,
  valuer_company TEXT,
  valuer_registration_number TEXT,

  -- Report details
  report_reference TEXT,
  report_file_path TEXT, -- Link to document in Supabase Storage
  
  -- Notes
  notes TEXT,
  methodology TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- 2. CREATE INDEXES
-- ============================================================

-- Insurance policies indexes
CREATE INDEX idx_insurance_policies_scheme_id ON public.insurance_policies(scheme_id);
CREATE INDEX idx_insurance_policies_expiry_date ON public.insurance_policies(expiry_date);
CREATE INDEX idx_insurance_policies_status ON public.insurance_policies(status);
CREATE INDEX idx_insurance_policies_policy_type ON public.insurance_policies(policy_type);

-- Property valuations indexes
CREATE INDEX idx_property_valuations_scheme_id ON public.property_valuations(scheme_id);
CREATE INDEX idx_property_valuations_valuation_date ON public.property_valuations(valuation_date DESC);
CREATE INDEX idx_property_valuations_scheme_date ON public.property_valuations(scheme_id, valuation_date DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_valuations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Insurance policies: Users can only access policies for schemes in their organisation
CREATE POLICY insurance_policies_select ON public.insurance_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = insurance_policies.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY insurance_policies_insert ON public.insurance_policies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = insurance_policies.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY insurance_policies_update ON public.insurance_policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = insurance_policies.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = insurance_policies.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY insurance_policies_delete ON public.insurance_policies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = insurance_policies.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- Property valuations: Same RLS pattern
CREATE POLICY property_valuations_select ON public.property_valuations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = property_valuations.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY property_valuations_insert ON public.property_valuations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = property_valuations.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY property_valuations_update ON public.property_valuations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = property_valuations.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = property_valuations.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY property_valuations_delete ON public.property_valuations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = property_valuations.scheme_id
      AND schemes.organisation_id IN (
        SELECT organisation_id FROM public.user_organisations 
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================

-- Trigger function: update updated_at timestamp on insurance_policies
CREATE OR REPLACE FUNCTION public.update_insurance_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: update updated_at timestamp on property_valuations
CREATE OR REPLACE FUNCTION public.update_property_valuations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: auto-expire policies that have passed expiry_date
CREATE OR REPLACE FUNCTION public.auto_expire_insurance_policies()
RETURNS void AS $$
BEGIN
  UPDATE public.insurance_policies
  SET status = 'expired'
  WHERE status = 'active'
  AND expiry_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

CREATE TRIGGER update_insurance_policies_updated_at_trigger
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_insurance_policies_updated_at();

CREATE TRIGGER update_property_valuations_updated_at_trigger
  BEFORE UPDATE ON public.property_valuations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_property_valuations_updated_at();

-- ============================================================
-- 7. HELPER VIEW: Latest valuation per scheme
-- ============================================================

CREATE OR REPLACE VIEW public.latest_property_valuations AS
SELECT DISTINCT ON (scheme_id)
  id,
  scheme_id,
  valuation_date,
  valuation_amount,
  valuation_type,
  valuer_name,
  valuer_company,
  created_at,
  -- Flag if valuation is outdated (2+ years old)
  (CURRENT_DATE - valuation_date) > INTERVAL '2 years' AS is_outdated
FROM public.property_valuations
ORDER BY scheme_id, valuation_date DESC;

-- Grant access to the view
GRANT SELECT ON public.latest_property_valuations TO authenticated;

-- ============================================================
-- 8. HELPER VIEW: Insurance policies with expiry alerts
-- ============================================================

CREATE OR REPLACE VIEW public.insurance_policies_with_alerts AS
SELECT
  ip.*,
  lv.valuation_date AS latest_valuation_date,
  lv.valuation_amount AS latest_valuation_amount,
  lv.is_outdated AS valuation_is_outdated,
  -- Days until expiry
  (ip.expiry_date - CURRENT_DATE) AS days_until_expiry,
  -- Alert flags
  CASE
    WHEN ip.expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN (ip.expiry_date - CURRENT_DATE) <= 30 THEN 'expiring_soon'
    WHEN (ip.expiry_date - CURRENT_DATE) <= 60 THEN 'renewal_due'
    ELSE 'ok'
  END AS alert_status
FROM public.insurance_policies ip
LEFT JOIN public.latest_property_valuations lv ON lv.scheme_id = ip.scheme_id;

-- Grant access to the view
GRANT SELECT ON public.insurance_policies_with_alerts TO authenticated;

-- ============================================================
-- 9. SCHEDULE AUTO-EXPIRE (pg_cron)
-- ============================================================

-- Run daily at midnight to expire policies past their expiry date
SELECT cron.schedule(
  'auto-expire-insurance-policies',
  '0 0 * * *',
  $$SELECT public.auto_expire_insurance_policies()$$
);

-- ============================================================
-- 10. COMMENTS
-- ============================================================

COMMENT ON TABLE public.insurance_policies IS 'Insurance policies for strata schemes including building, liability, and other coverage';
COMMENT ON TABLE public.property_valuations IS 'Property valuations for insurance and financial purposes';
COMMENT ON VIEW public.latest_property_valuations IS 'Returns the most recent valuation for each scheme with outdated flag';
COMMENT ON VIEW public.insurance_policies_with_alerts IS 'Insurance policies with valuation data and expiry alert statuses';
