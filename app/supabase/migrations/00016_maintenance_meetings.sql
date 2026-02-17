-- Migration 00016: Maintenance & Meetings (Phase 5)
-- Tables: tradespeople, maintenance_requests, maintenance_comments, quotes, invoices,
--         maintenance_attachments, meetings, agenda_items, attendees, resolutions, minutes
-- Also: Supabase Storage bucket for maintenance attachments
-- NOTE: All tables created first, then indexes, then RLS, then policies, then triggers, then storage bucket

-- ============================================================
-- 1. CREATE ALL TABLES
-- ============================================================

-- Tradespeople (organisation-level directory)
CREATE TABLE public.tradespeople (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),

  -- Business details
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  abn TEXT,
  trade_type TEXT,
  is_preferred BOOLEAN NOT NULL DEFAULT false,

  -- Compliance
  insurance_expiry DATE,
  license_number TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_abn_length CHECK (abn IS NULL OR length(abn) = 11)
);

-- Maintenance Requests (scheme-level work requests)
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,

  -- Request details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  priority TEXT NOT NULL DEFAULT 'routine',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  responsibility TEXT,

  -- Assignment
  assigned_to UUID REFERENCES public.tradespeople(id) ON DELETE SET NULL,

  -- Costs
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2),

  -- Scheduling
  scheduled_date DATE,

  -- Timestamps for workflow tracking
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_mr_priority CHECK (priority IN ('emergency', 'urgent', 'routine', 'cosmetic')),
  CONSTRAINT valid_mr_category CHECK (category IS NULL OR category IN (
    'plumbing', 'electrical', 'painting', 'landscaping', 'pest_control', 'cleaning', 'security', 'general'
  )),
  CONSTRAINT valid_mr_status CHECK (status IN (
    'new', 'acknowledged', 'assigned', 'quoted', 'approved', 'in_progress', 'completed', 'closed'
  )),
  CONSTRAINT valid_mr_responsibility CHECK (responsibility IS NULL OR responsibility IN (
    'common_property', 'lot_owner', 'disputed'
  ))
);

-- Maintenance Comments (request comment thread)
CREATE TABLE public.maintenance_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,

  -- Comment details
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quotes (tradesperson quotes for maintenance work)
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  tradesperson_id UUID REFERENCES public.tradespeople(id) ON DELETE SET NULL,

  -- Quote details
  quote_amount DECIMAL(12,2) NOT NULL,
  quote_date DATE NOT NULL,
  quote_reference TEXT,
  description TEXT,

  -- Approval workflow
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- File storage
  file_path TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_quote_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- Invoices (maintenance invoices linked to trust accounting)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  tradesperson_id UUID REFERENCES public.tradespeople(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  invoice_amount DECIMAL(12,2) NOT NULL,
  gst_amount DECIMAL(12,2) DEFAULT 0,

  -- Payment link to trust accounting
  payment_reference UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,

  -- File storage
  file_path TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance Attachments (photos and documents)
CREATE TABLE public.maintenance_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,

  -- File details
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'photo',
  caption TEXT,

  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_attachment_type CHECK (attachment_type IN (
    'photo_before', 'photo_after', 'photo_progress', 'document', 'other'
  ))
);

-- Meetings (AGM, SGM, committee meetings)
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Meeting details
  meeting_type TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  location_virtual TEXT,
  status TEXT NOT NULL DEFAULT 'draft',

  -- Notice requirements
  notice_period_days INTEGER NOT NULL DEFAULT 21,

  -- Quorum
  quorum_required INTEGER,
  quorum_met BOOLEAN,

  -- Adjournment
  is_adjourned BOOLEAN DEFAULT false,
  adjourned_from_meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_meeting_type CHECK (meeting_type IN ('agm', 'sgm', 'committee')),
  CONSTRAINT valid_meeting_status CHECK (status IN (
    'draft', 'scheduled', 'notice_sent', 'in_progress', 'completed', 'adjourned', 'cancelled'
  ))
);

-- Agenda Items (meeting agenda)
CREATE TABLE public.agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,

  -- Item details
  item_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,

  -- Motion-specific fields
  motion_type TEXT,
  estimated_cost DECIMAL(12,2),

  -- Required items cannot be deleted
  is_required BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_agenda_item_type CHECK (item_type IN ('procedural', 'standard', 'motion', 'discussion')),
  CONSTRAINT valid_agenda_motion_type CHECK (motion_type IS NULL OR motion_type IN ('ordinary', 'special', 'unanimous'))
);

-- Attendees (meeting attendance)
CREATE TABLE public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,

  -- Attendee details
  owner_name TEXT NOT NULL,
  attendance_type TEXT NOT NULL,
  represented_by TEXT,

  -- Check-in tracking
  checked_in_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_attendance_type CHECK (attendance_type IN ('present', 'virtual', 'proxy', 'apology')),
  CONSTRAINT unique_attendee_per_meeting_lot UNIQUE(meeting_id, lot_id)
);

-- Resolutions (meeting resolutions)
CREATE TABLE public.resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES public.agenda_items(id) ON DELETE SET NULL,

  -- Resolution details
  resolution_number TEXT,
  motion_text TEXT NOT NULL,
  resolution_type TEXT NOT NULL,

  -- Voting
  moved_by TEXT,
  seconded_by TEXT,
  votes_for INTEGER NOT NULL DEFAULT 0,
  votes_against INTEGER NOT NULL DEFAULT 0,
  votes_abstain INTEGER NOT NULL DEFAULT 0,

  -- Result
  result TEXT NOT NULL,
  result_percentage DECIMAL(5,2),

  -- Notes
  discussion_notes TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_resolution_type CHECK (resolution_type IN ('ordinary', 'special', 'unanimous')),
  CONSTRAINT valid_resolution_result CHECK (result IN ('carried', 'defeated', 'withdrawn', 'deferred'))
);

-- Minutes (meeting minutes)
CREATE TABLE public.minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,

  -- Content
  content JSONB,
  status TEXT NOT NULL DEFAULT 'draft',

  -- Review workflow
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Approval workflow
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_minutes_status CHECK (status IN ('draft', 'manager_reviewed', 'approved', 'published'))
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- tradespeople indexes
CREATE INDEX idx_tradespeople_org ON public.tradespeople(organisation_id);
CREATE INDEX idx_tradespeople_trade_type ON public.tradespeople(trade_type);
CREATE INDEX idx_tradespeople_active ON public.tradespeople(organisation_id) WHERE is_active = true;

-- maintenance_requests indexes
CREATE INDEX idx_mr_scheme ON public.maintenance_requests(scheme_id);
CREATE INDEX idx_mr_lot ON public.maintenance_requests(lot_id);
CREATE INDEX idx_mr_status ON public.maintenance_requests(status);
CREATE INDEX idx_mr_priority ON public.maintenance_requests(priority);
CREATE INDEX idx_mr_assigned_to ON public.maintenance_requests(assigned_to);
CREATE INDEX idx_mr_scheme_status ON public.maintenance_requests(scheme_id, status);
CREATE INDEX idx_mr_created_at ON public.maintenance_requests(created_at DESC);

-- maintenance_comments indexes
CREATE INDEX idx_mc_request ON public.maintenance_comments(maintenance_request_id);
CREATE INDEX idx_mc_created_at ON public.maintenance_comments(maintenance_request_id, created_at DESC);

-- quotes indexes
CREATE INDEX idx_quotes_request ON public.quotes(maintenance_request_id);
CREATE INDEX idx_quotes_tradesperson ON public.quotes(tradesperson_id);
CREATE INDEX idx_quotes_approval ON public.quotes(approval_status);

-- invoices indexes
CREATE INDEX idx_invoices_request ON public.invoices(maintenance_request_id);
CREATE INDEX idx_invoices_tradesperson ON public.invoices(tradesperson_id);
CREATE INDEX idx_invoices_payment_ref ON public.invoices(payment_reference);
CREATE INDEX idx_invoices_paid ON public.invoices(paid_at);

-- maintenance_attachments indexes
CREATE INDEX idx_ma_request ON public.maintenance_attachments(maintenance_request_id);
CREATE INDEX idx_ma_type ON public.maintenance_attachments(attachment_type);

-- meetings indexes
CREATE INDEX idx_meetings_scheme ON public.meetings(scheme_id);
CREATE INDEX idx_meetings_date ON public.meetings(meeting_date);
CREATE INDEX idx_meetings_status ON public.meetings(status);
CREATE INDEX idx_meetings_type ON public.meetings(meeting_type);
CREATE INDEX idx_meetings_scheme_date ON public.meetings(scheme_id, meeting_date);

-- agenda_items indexes
CREATE INDEX idx_agenda_meeting ON public.agenda_items(meeting_id);
CREATE INDEX idx_agenda_order ON public.agenda_items(meeting_id, item_number);

-- attendees indexes
CREATE INDEX idx_attendees_meeting ON public.attendees(meeting_id);
CREATE INDEX idx_attendees_lot ON public.attendees(lot_id);

-- resolutions indexes
CREATE INDEX idx_resolutions_meeting ON public.resolutions(meeting_id);
CREATE INDEX idx_resolutions_agenda_item ON public.resolutions(agenda_item_id);
CREATE INDEX idx_resolutions_result ON public.resolutions(result);

-- minutes indexes
CREATE INDEX idx_minutes_meeting ON public.minutes(meeting_id);
CREATE INDEX idx_minutes_status ON public.minutes(status);

-- ============================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.tradespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minutes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- tradespeople: organisation_id = user_organisation_id()
CREATE POLICY "tradespeople_select" ON public.tradespeople
  FOR SELECT USING (
    organisation_id = public.user_organisation_id()
  );

CREATE POLICY "tradespeople_insert" ON public.tradespeople
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "tradespeople_update" ON public.tradespeople
  FOR UPDATE USING (
    organisation_id = public.user_organisation_id()
  );

CREATE POLICY "tradespeople_delete" ON public.tradespeople
  FOR DELETE USING (
    organisation_id = public.user_organisation_id()
  );

-- maintenance_requests: scheme_id -> schemes.organisation_id = user_organisation_id()
CREATE POLICY "mr_select" ON public.maintenance_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = maintenance_requests.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "mr_insert" ON public.maintenance_requests
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "mr_update" ON public.maintenance_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = maintenance_requests.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "mr_delete" ON public.maintenance_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = maintenance_requests.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- maintenance_comments: chain through maintenance_request_id -> maintenance_requests.scheme_id -> schemes.organisation_id
CREATE POLICY "mc_select" ON public.maintenance_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_comments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "mc_insert" ON public.maintenance_comments
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "mc_update" ON public.maintenance_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_comments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "mc_delete" ON public.maintenance_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_comments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- quotes: chain through maintenance_request_id -> maintenance_requests.scheme_id -> schemes.organisation_id
CREATE POLICY "quotes_select" ON public.quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = quotes.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "quotes_insert" ON public.quotes
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "quotes_update" ON public.quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = quotes.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "quotes_delete" ON public.quotes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = quotes.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- invoices: chain through maintenance_request_id -> maintenance_requests.scheme_id -> schemes.organisation_id
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = invoices.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = invoices.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = invoices.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- maintenance_attachments: chain through maintenance_request_id -> maintenance_requests.scheme_id -> schemes.organisation_id
CREATE POLICY "ma_select" ON public.maintenance_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_attachments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "ma_insert" ON public.maintenance_attachments
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "ma_update" ON public.maintenance_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_attachments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "ma_delete" ON public.maintenance_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests
      JOIN public.schemes ON schemes.id = maintenance_requests.scheme_id
      WHERE maintenance_requests.id = maintenance_attachments.maintenance_request_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- meetings: scheme_id -> schemes.organisation_id = user_organisation_id()
CREATE POLICY "meetings_select" ON public.meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = meetings.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "meetings_insert" ON public.meetings
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "meetings_update" ON public.meetings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = meetings.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "meetings_delete" ON public.meetings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = meetings.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- agenda_items: chain through meeting_id -> meetings.scheme_id -> schemes.organisation_id
CREATE POLICY "agenda_items_select" ON public.agenda_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = agenda_items.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "agenda_items_insert" ON public.agenda_items
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "agenda_items_update" ON public.agenda_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = agenda_items.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "agenda_items_delete" ON public.agenda_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = agenda_items.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- attendees: chain through meeting_id -> meetings.scheme_id -> schemes.organisation_id
CREATE POLICY "attendees_select" ON public.attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = attendees.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "attendees_insert" ON public.attendees
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "attendees_update" ON public.attendees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = attendees.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "attendees_delete" ON public.attendees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = attendees.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- resolutions: chain through meeting_id -> meetings.scheme_id -> schemes.organisation_id
CREATE POLICY "resolutions_select" ON public.resolutions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = resolutions.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "resolutions_insert" ON public.resolutions
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "resolutions_update" ON public.resolutions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = resolutions.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "resolutions_delete" ON public.resolutions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = resolutions.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- minutes: chain through meeting_id -> meetings.scheme_id -> schemes.organisation_id
CREATE POLICY "minutes_select" ON public.minutes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = minutes.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "minutes_insert" ON public.minutes
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "minutes_update" ON public.minutes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = minutes.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "minutes_delete" ON public.minutes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings
      JOIN public.schemes ON schemes.id = meetings.scheme_id
      WHERE meetings.id = minutes.meeting_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- ============================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================

-- (No new trigger functions needed; reusing existing update_updated_at_column and audit_log_trigger)

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- updated_at triggers (reuse existing function)
CREATE TRIGGER set_tradespeople_updated_at
  BEFORE UPDATE ON public.tradespeople
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_maintenance_requests_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_minutes_updated_at
  BEFORE UPDATE ON public.minutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log triggers (reuse existing function)
CREATE TRIGGER tradespeople_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.tradespeople
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER maintenance_requests_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER maintenance_comments_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_comments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER quotes_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER invoices_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER maintenance_attachments_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_attachments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER meetings_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER agenda_items_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER attendees_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.attendees
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER resolutions_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.resolutions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER minutes_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.minutes
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================
-- 7. STORAGE BUCKET
-- ============================================================

-- Create the maintenance-attachments bucket (private, 10MB max file size)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-attachments',
  'maintenance-attachments',
  false,
  10485760, -- 10MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for maintenance-attachments bucket
CREATE POLICY "maintenance_attachments_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "maintenance_attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "maintenance_attachments_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "maintenance_attachments_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'maintenance-attachments'
    AND auth.role() = 'authenticated'
  );
