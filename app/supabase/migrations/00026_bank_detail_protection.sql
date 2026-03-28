-- Migration 00024: Bank Detail Change Protection (Maker-Checker Pattern)
-- Prevents direct modification of trust account bank details on schemes.
-- All bank detail changes must go through an approval workflow where a
-- different manager must approve the request.

BEGIN;

-- =============================================================================
-- 1. Bank detail change requests table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bank_detail_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  new_trust_bsb TEXT,
  new_trust_account_number TEXT,
  new_trust_account_name TEXT,
  old_trust_bsb TEXT,
  old_trust_account_number TEXT,
  old_trust_account_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_detail_changes_scheme ON public.bank_detail_change_requests(scheme_id);
CREATE INDEX IF NOT EXISTS idx_bank_detail_changes_status ON public.bank_detail_change_requests(status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_bank_detail_change_requests_updated_at ON public.bank_detail_change_requests;
CREATE TRIGGER update_bank_detail_change_requests_updated_at
  BEFORE UPDATE ON public.bank_detail_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit logging
DROP TRIGGER IF EXISTS audit_bank_detail_change_requests ON public.bank_detail_change_requests;
CREATE TRIGGER audit_bank_detail_change_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_detail_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- =============================================================================
-- 2. RLS policies for bank_detail_change_requests
-- =============================================================================

ALTER TABLE public.bank_detail_change_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: org-scoped — users can see change requests for schemes in their org
DROP POLICY IF EXISTS "bank_detail_changes_select" ON public.bank_detail_change_requests;
CREATE POLICY "bank_detail_changes_select" ON public.bank_detail_change_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes s
      WHERE s.id = bank_detail_change_requests.scheme_id
        AND s.organisation_id = public.user_organisation_id()
    )
  );

-- INSERT: manager/admin only — can create change requests for schemes in their org
DROP POLICY IF EXISTS "bank_detail_changes_insert" ON public.bank_detail_change_requests;
CREATE POLICY "bank_detail_changes_insert" ON public.bank_detail_change_requests
  FOR INSERT WITH CHECK (
    public.user_role() IN ('manager', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.schemes s
      WHERE s.id = bank_detail_change_requests.scheme_id
        AND s.organisation_id = public.user_organisation_id()
    )
    AND requested_by = auth.uid()
  );

-- UPDATE: manager/admin only, different user than requester, org-scoped
-- (used for approve/reject — actual approval goes through the SECURITY DEFINER function)
DROP POLICY IF EXISTS "bank_detail_changes_update" ON public.bank_detail_change_requests;
CREATE POLICY "bank_detail_changes_update" ON public.bank_detail_change_requests
  FOR UPDATE USING (
    public.user_role() IN ('manager', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.schemes s
      WHERE s.id = bank_detail_change_requests.scheme_id
        AND s.organisation_id = public.user_organisation_id()
    )
    AND requested_by != auth.uid()
  );

-- =============================================================================
-- 3. Session variable to allow the approval function to bypass the trigger
-- =============================================================================

-- We use a custom GUC (Grand Unified Configuration) variable to signal that
-- the bank detail update is coming from the approval function, not a direct edit.
-- The trigger checks for this and allows the update only when set.

-- =============================================================================
-- 4. Trigger: prevent direct bank detail updates on schemes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_direct_bank_detail_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if any trust bank detail column is being changed
  IF (
    COALESCE(OLD.trust_bsb, '') IS DISTINCT FROM COALESCE(NEW.trust_bsb, '')
    OR COALESCE(OLD.trust_account_number, '') IS DISTINCT FROM COALESCE(NEW.trust_account_number, '')
    OR COALESCE(OLD.trust_account_name, '') IS DISTINCT FROM COALESCE(NEW.trust_account_name, '')
  ) THEN
    -- Allow if called from the approval function (signaled via session variable)
    IF current_setting('app.bank_detail_bypass', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- Block direct updates
    RAISE EXCEPTION 'Direct modification of trust account bank details is not allowed. Please use the bank detail change request workflow.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_direct_bank_detail_update ON public.schemes;
CREATE TRIGGER prevent_direct_bank_detail_update
  BEFORE UPDATE ON public.schemes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_bank_detail_update();

-- =============================================================================
-- 5. SECURITY DEFINER function to approve bank detail changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_bank_detail_change(change_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_approver_org_id UUID;
  v_approver_role TEXT;
BEGIN
  -- Fetch the change request
  SELECT * INTO v_request
  FROM public.bank_detail_change_requests
  WHERE id = change_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change request not found';
  END IF;

  -- Verify status is pending
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Change request is not pending (current status: %)', v_request.status;
  END IF;

  -- Verify not expired
  IF v_request.expires_at < NOW() THEN
    -- Auto-expire it
    UPDATE public.bank_detail_change_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = change_request_id;
    RAISE EXCEPTION 'Change request has expired';
  END IF;

  -- Verify approver is different from requester
  IF v_request.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'You cannot approve your own bank detail change request';
  END IF;

  -- Verify the approver is a manager/admin in the same organisation as the scheme
  SELECT ou.organisation_id, ou.role INTO v_approver_org_id, v_approver_role
  FROM public.organisation_users ou
  JOIN public.schemes s ON s.organisation_id = ou.organisation_id
  WHERE ou.user_id = auth.uid()
    AND s.id = v_request.scheme_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You do not have permission to approve this change request';
  END IF;

  IF v_approver_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION 'Only managers and admins can approve bank detail changes';
  END IF;

  -- Set the bypass flag so the trigger allows the update
  PERFORM set_config('app.bank_detail_bypass', 'true', true);

  -- Update the scheme's bank details
  UPDATE public.schemes
  SET
    trust_bsb = v_request.new_trust_bsb,
    trust_account_number = v_request.new_trust_account_number,
    trust_account_name = v_request.new_trust_account_name,
    updated_at = NOW()
  WHERE id = v_request.scheme_id;

  -- Clear the bypass flag
  PERFORM set_config('app.bank_detail_bypass', 'false', true);

  -- Mark the request as approved
  UPDATE public.bank_detail_change_requests
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = change_request_id;
END;
$$;

COMMIT;
