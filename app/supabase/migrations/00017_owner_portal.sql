-- Migration 00017: Owner Portal (Phase 6)
-- Helper functions for owner-scoped RLS and new owner-facing RLS policies.
-- Also adds submitted_by_owner_id to maintenance_requests and portal_activated_at to owners.
-- NOTE: These are ADDITIVE policies — they do not modify existing staff/tenant_isolation policies.
-- PostgreSQL OR's multiple policies: if ANY policy returns true, the row is visible.

-- ============================================================
-- 1. SCHEMA CHANGES
-- ============================================================

-- Add portal_activated_at to owners (tracks when owner first logged in to portal)
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS portal_activated_at TIMESTAMPTZ;

-- Add submitted_by_owner_id to maintenance_requests (links owner-submitted requests)
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS submitted_by_owner_id UUID REFERENCES public.owners(id);

-- Index for owner-submitted maintenance requests
CREATE INDEX IF NOT EXISTS idx_mr_submitted_by_owner ON public.maintenance_requests(submitted_by_owner_id)
  WHERE submitted_by_owner_id IS NOT NULL;

-- Index for portal_user_id lookups on owners
CREATE INDEX IF NOT EXISTS idx_owners_portal_user ON public.owners(portal_user_id)
  WHERE portal_user_id IS NOT NULL;

-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================

-- Check if the current authenticated user is an owner with portal access
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owners
    WHERE portal_user_id = auth.uid()
    AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get lot IDs currently owned by the authenticated owner
CREATE OR REPLACE FUNCTION public.owner_lot_ids()
RETURNS SETOF UUID AS $$
  SELECT lo.lot_id
  FROM public.lot_ownerships lo
  JOIN public.owners o ON o.id = lo.owner_id
  WHERE o.portal_user_id = auth.uid()
  AND lo.ownership_end_date IS NULL
  AND o.status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get scheme IDs for the authenticated owner's lots
CREATE OR REPLACE FUNCTION public.owner_scheme_ids()
RETURNS SETOF UUID AS $$
  SELECT DISTINCT l.scheme_id
  FROM public.lots l
  JOIN public.lot_ownerships lo ON lo.lot_id = l.id
  JOIN public.owners o ON o.id = lo.owner_id
  WHERE o.portal_user_id = auth.uid()
  AND lo.ownership_end_date IS NULL
  AND o.status = 'active';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if the current authenticated user is a committee member for a given scheme
CREATE OR REPLACE FUNCTION public.is_committee_member(p_scheme_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.committee_members cm
    JOIN public.owners o ON o.id = cm.owner_id
    WHERE cm.scheme_id = p_scheme_id
    AND o.portal_user_id = auth.uid()
    AND cm.is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get the owner record ID for the current authenticated user
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS UUID AS $$
  SELECT id FROM public.owners
  WHERE portal_user_id = auth.uid()
  AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_lot_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_scheme_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_committee_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_owner_id() TO authenticated;

-- ============================================================
-- 3. OWNER-SCOPED RLS POLICIES
-- ============================================================
-- These are NEW policies added alongside existing staff policies.
-- PostgreSQL evaluates all policies with OR logic — if any policy passes, access is granted.

-- -------------------------------------------------------
-- schemes: owner can SELECT schemes they have lots in
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.schemes
  FOR SELECT USING (
    id IN (SELECT public.owner_scheme_ids())
  );

-- -------------------------------------------------------
-- lots: owner can SELECT their own lots
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.lots
  FOR SELECT USING (
    id IN (SELECT public.owner_lot_ids())
  );

-- -------------------------------------------------------
-- lot_ownerships: owner can SELECT their own ownerships
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.lot_ownerships
  FOR SELECT USING (
    lot_id IN (SELECT public.owner_lot_ids())
  );

-- -------------------------------------------------------
-- owners: owner can SELECT their own record
-- (The existing owners_select already includes portal_user_id = auth.uid(),
--  but we add a dedicated policy for clarity and to ensure the pattern is consistent)
-- -------------------------------------------------------
-- Note: owners_select in 00004 already allows portal_user_id = auth.uid(), so no new policy needed.

-- -------------------------------------------------------
-- levy_items: owner can SELECT levy items for their lots
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.levy_items
  FOR SELECT USING (
    lot_id IN (SELECT public.owner_lot_ids())
  );

-- -------------------------------------------------------
-- levy_periods: owner can SELECT levy periods related to their schemes
-- (needed to display period details for levy items)
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.levy_periods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.levy_schedules ls
      WHERE ls.id = levy_periods.levy_schedule_id
      AND ls.scheme_id IN (SELECT public.owner_scheme_ids())
    )
  );

-- -------------------------------------------------------
-- levy_schedules: owner can SELECT schedules for their schemes
-- (needed to display schedule context for levy items)
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.levy_schedules
  FOR SELECT USING (
    scheme_id IN (SELECT public.owner_scheme_ids())
  );

-- -------------------------------------------------------
-- payments: owner can SELECT payments for their lots
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.payments
  FOR SELECT USING (
    lot_id IN (SELECT public.owner_lot_ids())
  );

-- -------------------------------------------------------
-- payment_allocations: owner can SELECT allocations for their payments
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.payment_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_allocations.payment_id
      AND p.lot_id IN (SELECT public.owner_lot_ids())
    )
  );

-- -------------------------------------------------------
-- documents: owner can SELECT documents for their schemes with appropriate visibility
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.documents
  FOR SELECT USING (
    scheme_id IN (SELECT public.owner_scheme_ids())
    AND (
      visibility = 'owners'
      OR (visibility = 'committee' AND public.is_committee_member(scheme_id))
    )
    AND deleted_at IS NULL
  );

-- -------------------------------------------------------
-- maintenance_requests: owner can SELECT requests for their lots or submitted by them
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.maintenance_requests
  FOR SELECT USING (
    lot_id IN (SELECT public.owner_lot_ids())
    OR submitted_by_owner_id = public.current_owner_id()
  );

-- owner can INSERT new maintenance requests for their lots
CREATE POLICY "owner_insert" ON public.maintenance_requests
  FOR INSERT WITH CHECK (
    lot_id IN (SELECT public.owner_lot_ids())
    AND submitted_by_owner_id = public.current_owner_id()
  );

-- -------------------------------------------------------
-- maintenance_comments: owner can SELECT non-internal comments on accessible requests
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.maintenance_comments
  FOR SELECT USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_comments.maintenance_request_id
      AND (
        mr.lot_id IN (SELECT public.owner_lot_ids())
        OR mr.submitted_by_owner_id = public.current_owner_id()
      )
    )
  );

-- owner can INSERT comments on their accessible requests (always non-internal)
CREATE POLICY "owner_insert" ON public.maintenance_comments
  FOR INSERT WITH CHECK (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_comments.maintenance_request_id
      AND (
        mr.lot_id IN (SELECT public.owner_lot_ids())
        OR mr.submitted_by_owner_id = public.current_owner_id()
      )
    )
  );

-- -------------------------------------------------------
-- meetings: owner can SELECT scheduled/published meetings in their schemes
-- (owners should not see draft or cancelled meetings)
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.meetings
  FOR SELECT USING (
    scheme_id IN (SELECT public.owner_scheme_ids())
    AND status IN ('scheduled', 'notice_sent', 'in_progress', 'completed')
  );

-- -------------------------------------------------------
-- agenda_items: owner can SELECT items for accessible meetings
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.agenda_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = agenda_items.meeting_id
      AND m.scheme_id IN (SELECT public.owner_scheme_ids())
      AND m.status IN ('scheduled', 'notice_sent', 'in_progress', 'completed')
    )
  );

-- -------------------------------------------------------
-- resolutions: owner can SELECT resolutions for accessible meetings
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.resolutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = resolutions.meeting_id
      AND m.scheme_id IN (SELECT public.owner_scheme_ids())
      AND m.status IN ('scheduled', 'notice_sent', 'in_progress', 'completed')
    )
  );

-- -------------------------------------------------------
-- minutes: owner can SELECT published minutes for accessible meetings
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.minutes
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = minutes.meeting_id
      AND m.scheme_id IN (SELECT public.owner_scheme_ids())
    )
  );

-- -------------------------------------------------------
-- maintenance_attachments: owner can SELECT and INSERT attachments on accessible requests
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.maintenance_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_attachments.maintenance_request_id
      AND (
        mr.lot_id IN (SELECT public.owner_lot_ids())
        OR mr.submitted_by_owner_id = public.current_owner_id()
      )
    )
  );

CREATE POLICY "owner_insert" ON public.maintenance_attachments
  FOR INSERT WITH CHECK (
    public.is_owner()
    AND EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = maintenance_attachments.maintenance_request_id
      AND (
        mr.lot_id IN (SELECT public.owner_lot_ids())
        OR mr.submitted_by_owner_id = public.current_owner_id()
      )
    )
  );

-- -------------------------------------------------------
-- document_audit_log: owner can INSERT audit log entries (for tracking downloads)
-- -------------------------------------------------------
CREATE POLICY "owner_insert" ON public.document_audit_log
  FOR INSERT WITH CHECK (
    public.is_owner()
  );

-- -------------------------------------------------------
-- committee_members: owner can SELECT committee members for their schemes
-- (useful for displaying committee info in the owner portal)
-- -------------------------------------------------------
CREATE POLICY "owner_select" ON public.committee_members
  FOR SELECT USING (
    scheme_id IN (SELECT public.owner_scheme_ids())
  );
