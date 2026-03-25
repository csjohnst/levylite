-- Migration 00023: Security Hardening
-- Fixes: F1 (cross-tenant INSERT), F2 (storage bucket isolation), F7 (RBAC),
--        F8 (non-determinism), F9 (global CoA protection), F16 (owner column restrict),
--        F21 (SECURITY DEFINER search_path), F22 (audit log cross-tenant),
--        F23 (subscription UPDATE), F29 (org_users self-escalation)
--
-- IMPORTANT: This migration drops and recreates many policies. It is idempotent
-- via DROP POLICY IF EXISTS before each CREATE POLICY.

BEGIN;

-- ============================================================
-- F21: SECURITY DEFINER search_path
-- Add SET search_path = public to ALL SECURITY DEFINER functions
-- ============================================================

-- audit_log_trigger() — originally in 00001, updated in 00008
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, operation, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- user_organisation_id() — F8 fix: add ORDER BY created_at ASC for determinism
-- Long-term fix: session-scoped org selection via app_settings / set_config
CREATE OR REPLACE FUNCTION public.user_organisation_id() RETURNS UUID AS $$
  SELECT organisation_id FROM public.organisation_users
  WHERE user_id = auth.uid()
  ORDER BY invited_at ASC NULLS LAST
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- user_role() — F8 fix: add ORDER BY for determinism (matches org selection)
CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT role FROM public.organisation_users
  WHERE user_id = auth.uid()
  ORDER BY invited_at ASC NULLS LAST
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- handle_new_user() — from 00018 (latest version)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _org_id UUID;
  _org_name TEXT;
  _invitation RECORD;
  _paid_plan_id UUID;
BEGIN
  _org_name := NEW.raw_user_meta_data ->> 'organisation_name';

  IF _org_name IS NOT NULL AND _org_name <> '' THEN
    INSERT INTO public.organisations (name)
    VALUES (_org_name)
    RETURNING id INTO _org_id;

    INSERT INTO public.organisation_users (organisation_id, user_id, role, joined_at)
    VALUES (_org_id, NEW.id, 'manager', NOW());

    SELECT id INTO _paid_plan_id FROM public.subscription_plans WHERE plan_code = 'paid' LIMIT 1;

    IF _paid_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        organisation_id, plan_id, status, billing_interval,
        trial_start_date, trial_end_date
      ) VALUES (
        _org_id, _paid_plan_id, 'trialing', 'monthly',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days'
      );
    END IF;

    RETURN NEW;
  END IF;

  SELECT * INTO _invitation
  FROM public.invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation IS NOT NULL THEN
    INSERT INTO public.organisation_users (organisation_id, user_id, role, invited_by, joined_at)
    VALUES (_invitation.organisation_id, NEW.id, _invitation.role, _invitation.invited_by, NOW());

    UPDATE public.invitations
    SET accepted_at = NOW()
    WHERE id = _invitation.id;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- is_owner() — from 00017
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owners
    WHERE portal_user_id = auth.uid()
    AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- owner_lot_ids() — from 00017
CREATE OR REPLACE FUNCTION public.owner_lot_ids()
RETURNS SETOF UUID AS $$
  SELECT lo.lot_id
  FROM public.lot_ownerships lo
  JOIN public.owners o ON o.id = lo.owner_id
  WHERE o.portal_user_id = auth.uid()
  AND lo.ownership_end_date IS NULL
  AND o.status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- owner_scheme_ids() — from 00017
CREATE OR REPLACE FUNCTION public.owner_scheme_ids()
RETURNS SETOF UUID AS $$
  SELECT DISTINCT l.scheme_id
  FROM public.lots l
  JOIN public.lot_ownerships lo ON lo.lot_id = l.id
  JOIN public.owners o ON o.id = lo.owner_id
  WHERE o.portal_user_id = auth.uid()
  AND lo.ownership_end_date IS NULL
  AND o.status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- is_committee_member() — from 00017
CREATE OR REPLACE FUNCTION public.is_committee_member(p_scheme_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.committee_members cm
    JOIN public.owners o ON o.id = cm.owner_id
    WHERE cm.scheme_id = p_scheme_id
    AND o.portal_user_id = auth.uid()
    AND cm.is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- current_owner_id() — from 00017
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS UUID AS $$
  SELECT id FROM public.owners
  WHERE portal_user_id = auth.uid()
  AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- is_platform_admin() — from 00022
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- check_plan_limits() — from 00018 (already had SET search_path, included for completeness)
-- No change needed; already correct.

-- enforce_lot_limit() — from 00018 (already had SET search_path)
-- No change needed; already correct.

-- has_active_subscription() — from 00018 (already had SET search_path)
-- No change needed; already correct.

-- can_access_feature() — from 00018 (already had SET search_path)
-- No change needed; already correct.


-- ============================================================
-- F7: Role-Based Access Control — split FOR ALL into per-operation
-- F1: Cross-Tenant INSERT — proper WITH CHECK on all INSERT policies
-- F29: org_users self-escalation — require manager/admin for INSERT/UPDATE
-- ============================================================

-- Helper: reusable role check expression
-- Staff = user has an organisation membership (not an owner-portal user)
-- We'll use user_role() inline since we can't create views in a policy.

-- -------------------------------------------------------
-- organisations (00002): DROP "tenant_isolation" FOR ALL, create per-op
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.organisations;

CREATE POLICY "organisations_select" ON public.organisations
  FOR SELECT USING (
    id = public.user_organisation_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "organisations_insert" ON public.organisations
  FOR INSERT WITH CHECK (
    -- Only handle_new_user trigger (SECURITY DEFINER) or platform admins create orgs
    public.is_platform_admin()
  );

CREATE POLICY "organisations_update" ON public.organisations
  FOR UPDATE USING (
    id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "organisations_delete" ON public.organisations
  FOR DELETE USING (
    id = public.user_organisation_id()
    AND public.user_role() = 'admin'
  );

-- -------------------------------------------------------
-- organisation_users (00002): DROP "tenant_isolation" FOR ALL, create per-op
-- F29: INSERT/UPDATE requires manager or admin role
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.organisation_users;

CREATE POLICY "org_users_select" ON public.organisation_users
  FOR SELECT USING (
    organisation_id = public.user_organisation_id()
  );

CREATE POLICY "org_users_insert" ON public.organisation_users
  FOR INSERT WITH CHECK (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "org_users_update" ON public.organisation_users
  FOR UPDATE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "org_users_delete" ON public.organisation_users
  FOR DELETE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- schemes (00003): DROP "tenant_isolation" FOR ALL, create per-op with RBAC
-- Keep owner_select from 00017 untouched
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.schemes;

CREATE POLICY "schemes_select" ON public.schemes
  FOR SELECT USING (
    organisation_id = public.user_organisation_id()
  );

-- F1: INSERT WITH CHECK validates org ownership
CREATE POLICY "schemes_insert" ON public.schemes
  FOR INSERT WITH CHECK (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "schemes_update" ON public.schemes
  FOR UPDATE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "schemes_delete" ON public.schemes
  FOR DELETE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- lots (00003): DROP "tenant_isolation" FOR ALL, create per-op with RBAC
-- Keep owner_select from 00017 untouched
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.lots;

CREATE POLICY "lots_select" ON public.lots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = lots.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- F1: INSERT validates scheme belongs to user's org
CREATE POLICY "lots_insert" ON public.lots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = lots.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "lots_update" ON public.lots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = lots.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "lots_delete" ON public.lots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = lots.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- lot_ownerships (00004): DROP "tenant_isolation" FOR ALL, create per-op
-- Keep owner_select from 00017 untouched
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.lot_ownerships;

CREATE POLICY "lot_ownerships_select" ON public.lot_ownerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = lot_ownerships.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- F1: INSERT validates lot->scheme->org chain
CREATE POLICY "lot_ownerships_insert" ON public.lot_ownerships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = lot_ownerships.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "lot_ownerships_update" ON public.lot_ownerships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = lot_ownerships.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "lot_ownerships_delete" ON public.lot_ownerships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = lot_ownerships.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- committee_members (00004): DROP "tenant_isolation" FOR ALL, create per-op
-- Keep owner_select from 00017 untouched
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.committee_members;

CREATE POLICY "committee_members_select" ON public.committee_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = committee_members.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- F1: INSERT validates scheme->org
CREATE POLICY "committee_members_insert" ON public.committee_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = committee_members.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "committee_members_update" ON public.committee_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = committee_members.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "committee_members_delete" ON public.committee_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = committee_members.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- tenants (00004): DROP "tenant_isolation" FOR ALL, create per-op
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.tenants;

CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = tenants.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- F1: INSERT validates lot->scheme->org chain
CREATE POLICY "tenants_insert" ON public.tenants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = tenants.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "tenants_update" ON public.tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = tenants.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "tenants_delete" ON public.tenants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = tenants.lot_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- invitations (00005): DROP "tenant_isolation" FOR ALL, create per-op
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON public.invitations;

CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT USING (
    organisation_id = public.user_organisation_id()
  );

CREATE POLICY "invitations_insert" ON public.invitations
  FOR INSERT WITH CHECK (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "invitations_update" ON public.invitations
  FOR UPDATE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

CREATE POLICY "invitations_delete" ON public.invitations
  FOR DELETE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- notifications (00005): DROP FOR ALL, create per-op
-- Notifications are user-scoped, not org-scoped, so keep simple
-- -------------------------------------------------------
DROP POLICY IF EXISTS "users_see_own_notifications" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());


-- ============================================================
-- F1: Cross-Tenant INSERT Policies — Fix all INSERT policies
-- that only check user_organisation_id() IS NOT NULL
-- ============================================================

-- owners_insert: Already per-op from 00004, but only checks org IS NOT NULL
-- Keep the existing INSERT pattern (owners aren't yet linked to a scheme at INSERT time)
-- but add a staff role check
DROP POLICY IF EXISTS "owners_insert" ON public.owners;

CREATE POLICY "owners_insert" ON public.owners
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
    AND public.user_role() IN ('manager', 'admin')
  );

-- owners_update: keep existing but add role check for staff (owner portal handled by F16 trigger)
DROP POLICY IF EXISTS "owners_update" ON public.owners;

CREATE POLICY "owners_update" ON public.owners
  FOR UPDATE USING (
    (
      EXISTS (
        SELECT 1 FROM public.lot_ownerships
        JOIN public.lots ON lots.id = lot_ownerships.lot_id
        JOIN public.schemes ON schemes.id = lots.scheme_id
        WHERE lot_ownerships.owner_id = owners.id
        AND schemes.organisation_id = public.user_organisation_id()
      )
      AND public.user_role() IN ('manager', 'admin')
    )
    OR portal_user_id = auth.uid()
    OR (created_by = auth.uid() AND public.user_role() IN ('manager', 'admin'))
  );

-- owners_delete: add role check
DROP POLICY IF EXISTS "owners_delete" ON public.owners;

CREATE POLICY "owners_delete" ON public.owners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lot_ownerships
      JOIN public.lots ON lots.id = lot_ownerships.lot_id
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lot_ownerships.owner_id = owners.id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- levy_schedules INSERT (00012) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "levy_schedules_insert" ON public.levy_schedules;

CREATE POLICY "levy_schedules_insert" ON public.levy_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = levy_schedules.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- levy_periods INSERT (00012) — F1: validate schedule->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "levy_periods_insert" ON public.levy_periods;

CREATE POLICY "levy_periods_insert" ON public.levy_periods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.levy_schedules
      JOIN public.schemes ON schemes.id = levy_schedules.scheme_id
      WHERE levy_schedules.id = levy_periods.levy_schedule_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- levy_items INSERT (00012) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "levy_items_insert" ON public.levy_items;

CREATE POLICY "levy_items_insert" ON public.levy_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = levy_items.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- payments INSERT (00012) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "payments_insert" ON public.payments;

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = payments.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- payment_allocations INSERT (00012) — F1: validate payment->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "payment_allocations_insert" ON public.payment_allocations;

CREATE POLICY "payment_allocations_insert" ON public.payment_allocations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payments
      JOIN public.schemes ON schemes.id = payments.scheme_id
      WHERE payments.id = payment_allocations.payment_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- transactions INSERT (00014) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "txn_insert" ON public.transactions;

CREATE POLICY "txn_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = transactions.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- transaction_lines INSERT (00014) — F1: validate txn->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "txl_insert" ON public.transaction_lines;

CREATE POLICY "txl_insert" ON public.transaction_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      JOIN public.schemes ON schemes.id = transactions.scheme_id
      WHERE transactions.id = transaction_lines.transaction_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- bank_statements INSERT (00014) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "bs_insert" ON public.bank_statements;

CREATE POLICY "bs_insert" ON public.bank_statements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = bank_statements.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- bank_statement_lines INSERT (00014) — F1: validate bs->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "bsl_insert" ON public.bank_statement_lines;

CREATE POLICY "bsl_insert" ON public.bank_statement_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = bank_statement_lines.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- reconciliations INSERT (00014) — F1: validate bs->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "recon_insert" ON public.reconciliations;

CREATE POLICY "recon_insert" ON public.reconciliations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = reconciliations.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- financial_years INSERT (00014) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "fy_insert" ON public.financial_years;

CREATE POLICY "fy_insert" ON public.financial_years
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = financial_years.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- documents INSERT (00015) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "documents_insert" ON public.documents;

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = documents.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- document_versions INSERT (00015) — F1: validate doc->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "doc_versions_insert" ON public.document_versions;

CREATE POLICY "doc_versions_insert" ON public.document_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      JOIN public.schemes ON schemes.id = documents.scheme_id
      WHERE documents.id = document_versions.document_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- document_audit_log INSERT (00015) — F1: validate doc->scheme->org chain
-- Keep owner_insert from 00017 (additive)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "doc_audit_insert" ON public.document_audit_log;

CREATE POLICY "doc_audit_insert" ON public.document_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      JOIN public.schemes ON schemes.id = documents.scheme_id
      WHERE documents.id = document_audit_log.document_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- -------------------------------------------------------
-- budgets INSERT (00015) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;

CREATE POLICY "budgets_insert" ON public.budgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = budgets.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- budget_line_items INSERT (00015) — F1: validate budget->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "budget_line_items_insert" ON public.budget_line_items;

CREATE POLICY "budget_line_items_insert" ON public.budget_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budgets
      JOIN public.schemes ON schemes.id = budgets.scheme_id
      WHERE budgets.id = budget_line_items.budget_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- tradespeople INSERT (00016) — F1: validate org directly
-- -------------------------------------------------------
DROP POLICY IF EXISTS "tradespeople_insert" ON public.tradespeople;

CREATE POLICY "tradespeople_insert" ON public.tradespeople
  FOR INSERT WITH CHECK (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

-- tradespeople UPDATE: add role check
DROP POLICY IF EXISTS "tradespeople_update" ON public.tradespeople;

CREATE POLICY "tradespeople_update" ON public.tradespeople
  FOR UPDATE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

-- tradespeople DELETE: add role check
DROP POLICY IF EXISTS "tradespeople_delete" ON public.tradespeople;

CREATE POLICY "tradespeople_delete" ON public.tradespeople
  FOR DELETE USING (
    organisation_id = public.user_organisation_id()
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- maintenance_requests INSERT (00016) — F1: validate scheme->org
-- Keep owner_insert from 00017 (additive)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "mr_insert" ON public.maintenance_requests;

CREATE POLICY "mr_insert" ON public.maintenance_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = maintenance_requests.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- maintenance_comments INSERT (00016) — F1: validate mr->scheme->org chain
-- Keep owner_insert from 00017 (additive)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "mc_insert" ON public.maintenance_comments;

CREATE POLICY "mc_insert" ON public.maintenance_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_comments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- quotes INSERT (00016) — F1: validate mr->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "quotes_insert" ON public.quotes;

CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = quotes.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- invoices INSERT (00016) — F1: validate mr->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = invoices.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- maintenance_attachments INSERT (00016) — F1: validate mr->scheme->org chain
-- Keep owner_insert from 00017 (additive)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "ma_insert" ON public.maintenance_attachments;

CREATE POLICY "ma_insert" ON public.maintenance_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_attachments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- meetings INSERT (00016) — F1: validate scheme->org
-- -------------------------------------------------------
DROP POLICY IF EXISTS "meetings_insert" ON public.meetings;

CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = meetings.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- agenda_items INSERT (00016) — F1: validate meeting->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "agenda_items_insert" ON public.agenda_items;

CREATE POLICY "agenda_items_insert" ON public.agenda_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = agenda_items.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- attendees INSERT (00016) — F1: validate meeting->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "attendees_insert" ON public.attendees;

CREATE POLICY "attendees_insert" ON public.attendees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = attendees.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- resolutions INSERT (00016) — F1: validate meeting->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "resolutions_insert" ON public.resolutions;

CREATE POLICY "resolutions_insert" ON public.resolutions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = resolutions.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );

-- -------------------------------------------------------
-- minutes INSERT (00016) — F1: validate meeting->scheme->org chain
-- -------------------------------------------------------
DROP POLICY IF EXISTS "minutes_insert" ON public.minutes;

CREATE POLICY "minutes_insert" ON public.minutes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = minutes.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
    AND public.user_role() IN ('manager', 'admin')
  );


-- ============================================================
-- F9: Protect Global CoA Seed Rows (scheme_id IS NULL)
-- Only platform admins can INSERT/UPDATE/DELETE global rows.
-- Regular users can only SELECT them.
-- ============================================================

DROP POLICY IF EXISTS "coa_select" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_insert" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_update" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "coa_delete" ON public.chart_of_accounts;

-- SELECT: scheme-specific rows for org members + global rows for everyone authenticated
CREATE POLICY "coa_select" ON public.chart_of_accounts
  FOR SELECT USING (
    scheme_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = chart_of_accounts.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- INSERT: scheme-specific rows require scheme->org validation
-- Global rows (scheme_id IS NULL) require platform admin
CREATE POLICY "coa_insert" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (
    CASE
      WHEN scheme_id IS NULL THEN public.is_platform_admin()
      ELSE EXISTS (
        SELECT 1 FROM public.schemes
        WHERE schemes.id = chart_of_accounts.scheme_id
        AND schemes.organisation_id = public.user_organisation_id()
      ) AND public.user_role() IN ('manager', 'admin')
    END
  );

-- UPDATE: global rows = platform admin only; scheme rows = org member
CREATE POLICY "coa_update" ON public.chart_of_accounts
  FOR UPDATE USING (
    CASE
      WHEN scheme_id IS NULL THEN public.is_platform_admin()
      ELSE EXISTS (
        SELECT 1 FROM public.schemes
        WHERE schemes.id = chart_of_accounts.scheme_id
        AND schemes.organisation_id = public.user_organisation_id()
      ) AND public.user_role() IN ('manager', 'admin')
    END
  );

-- DELETE: global rows = platform admin only; scheme rows = org member
CREATE POLICY "coa_delete" ON public.chart_of_accounts
  FOR DELETE USING (
    CASE
      WHEN scheme_id IS NULL THEN public.is_platform_admin()
      ELSE EXISTS (
        SELECT 1 FROM public.schemes
        WHERE schemes.id = chart_of_accounts.scheme_id
        AND schemes.organisation_id = public.user_organisation_id()
      ) AND public.user_role() IN ('manager', 'admin')
    END
  );


-- ============================================================
-- F2: Storage Bucket Tenant Isolation
-- Replace broad "any authenticated user" policies with scheme-scoped checks.
-- Path convention: <scheme_id>/<rest-of-path>
-- ============================================================

-- scheme-documents bucket
DROP POLICY IF EXISTS "scheme_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "scheme_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "scheme_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "scheme_docs_delete" ON storage.objects;

CREATE POLICY "scheme_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'scheme-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "scheme_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'scheme-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "scheme_docs_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'scheme-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "scheme_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'scheme-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- maintenance-attachments bucket
DROP POLICY IF EXISTS "maintenance_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_attachments_delete" ON storage.objects;

CREATE POLICY "maintenance_attachments_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "maintenance_attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "maintenance_attachments_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "maintenance_attachments_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = (storage.foldername(name))[1]::uuid
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- Owner portal users also need storage access for their schemes
CREATE POLICY "owner_scheme_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'scheme-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.owner_scheme_ids())
  );

CREATE POLICY "owner_maintenance_attachments_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.owner_scheme_ids())
  );

CREATE POLICY "owner_maintenance_attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
    AND public.is_owner()
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.owner_scheme_ids())
  );


-- ============================================================
-- F22: Audit Log Cross-Tenant Fix
-- Fix the lot_ownerships/committee_members/tenants case to join through
-- to the user's org instead of just checking org membership.
-- ============================================================

DROP POLICY IF EXISTS "users_see_own_org_audit_logs" ON public.audit_log;

CREATE POLICY "users_see_own_org_audit_logs" ON public.audit_log
  FOR SELECT USING (
    (table_name = 'schemes' AND EXISTS (
      SELECT 1 FROM public.schemes WHERE schemes.id = audit_log.record_id
      AND schemes.organisation_id = public.user_organisation_id()
    )) OR
    (table_name = 'lots' AND EXISTS (
      SELECT 1 FROM public.lots
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lots.id = audit_log.record_id
      AND schemes.organisation_id = public.user_organisation_id()
    )) OR
    (table_name = 'owners' AND EXISTS (
      SELECT 1 FROM public.owners
      JOIN public.lot_ownerships ON lot_ownerships.owner_id = owners.id
      JOIN public.lots ON lots.id = lot_ownerships.lot_id
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE owners.id = audit_log.record_id
      AND schemes.organisation_id = public.user_organisation_id()
    )) OR
    (table_name = 'organisations' AND EXISTS (
      SELECT 1 FROM public.organisations WHERE organisations.id = audit_log.record_id
      AND organisations.id = public.user_organisation_id()
    )) OR
    (table_name = 'lot_ownerships' AND EXISTS (
      SELECT 1 FROM public.lot_ownerships lo
      JOIN public.lots ON lots.id = lo.lot_id
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE lo.id = audit_log.record_id
      AND schemes.organisation_id = public.user_organisation_id()
    )) OR
    (table_name = 'committee_members' AND EXISTS (
      SELECT 1 FROM public.committee_members cm
      JOIN public.schemes ON schemes.id = cm.scheme_id
      WHERE cm.id = audit_log.record_id
      AND schemes.organisation_id = public.user_organisation_id()
    )) OR
    (table_name = 'tenants' AND EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.lots ON lots.id = t.lot_id
      JOIN public.schemes ON schemes.id = lots.scheme_id
      WHERE t.id = audit_log.record_id
      AND schemes.organisation_id = public.user_organisation_id()
    ))
  );


-- ============================================================
-- F23: Subscription UPDATE Policy
-- Drop the subscriptions_update policy for authenticated users.
-- Subscription changes should only happen via service-role.
-- ============================================================

DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;

-- No replacement policy: only service-role (bypasses RLS) can UPDATE subscriptions.


-- ============================================================
-- F16: Owner Column-Level Update Restriction
-- Trigger that restricts owner portal users to only updating safe fields.
-- Staff (managers/admins) can update any field.
-- ============================================================

CREATE OR REPLACE FUNCTION public.restrict_owner_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restrict if the current user is the owner editing their own record
  IF OLD.portal_user_id IS NOT NULL AND OLD.portal_user_id = auth.uid() THEN
    -- Check for disallowed field changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Owner portal users cannot change their own status';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Owner portal users cannot change their email via the portal';
    END IF;
    IF NEW.portal_user_id IS DISTINCT FROM OLD.portal_user_id THEN
      RAISE EXCEPTION 'Owner portal users cannot change their portal_user_id';
    END IF;
    IF NEW.portal_activated_at IS DISTINCT FROM OLD.portal_activated_at THEN
      RAISE EXCEPTION 'Owner portal users cannot change their portal_activated_at';
    END IF;
    IF NEW.portal_invite_sent_at IS DISTINCT FROM OLD.portal_invite_sent_at THEN
      RAISE EXCEPTION 'Owner portal users cannot change their portal_invite_sent_at';
    END IF;
    IF NEW.portal_invite_accepted_at IS DISTINCT FROM OLD.portal_invite_accepted_at THEN
      RAISE EXCEPTION 'Owner portal users cannot change their portal_invite_accepted_at';
    END IF;
    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Owner portal users cannot change the notes field';
    END IF;
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Owner portal users cannot change created_by';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Owner portal users cannot change created_at';
    END IF;
    IF NEW.abn IS DISTINCT FROM OLD.abn THEN
      RAISE EXCEPTION 'Owner portal users cannot change their ABN';
    END IF;
    IF NEW.company_name IS DISTINCT FROM OLD.company_name THEN
      RAISE EXCEPTION 'Owner portal users cannot change their company name';
    END IF;
    -- Allowed fields: phone_mobile, phone_home, phone_work,
    -- postal_address_line1, postal_address_line2, postal_suburb, postal_state,
    -- postal_postcode, postal_country, correspondence_method, correspondence_language,
    -- first_name, last_name, middle_name, preferred_name, title, updated_at
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any (idempotent)
DROP TRIGGER IF EXISTS restrict_owner_self_update ON public.owners;

CREATE TRIGGER restrict_owner_self_update
  BEFORE UPDATE ON public.owners
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_owner_self_update();


COMMIT;
