-- =============================================
-- LevyLite Feedback System v3.2
-- Database Schema: Privacy-First, Security-Hardened
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. FEEDBACK CATEGORIES (Strategic Classification)
-- =============================================

CREATE TABLE IF NOT EXISTS feedback_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT, -- Hex color for UI display
  icon TEXT, -- Icon identifier
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial categories
INSERT INTO feedback_categories (name, description, color, icon, sort_order) VALUES
  ('bug', 'Something is broken or not working correctly', '#EF4444', 'bug', 1),
  ('feature', 'Suggestion for new functionality', '#3B82F6', 'lightbulb', 2),
  ('ux', 'User experience or interface feedback', '#8B5CF6', 'palette', 3),
  ('content', 'Content quality or accuracy issues', '#F59E0B', 'document', 4),
  ('performance', 'Speed or technical performance', '#10B981', 'bolt', 5),
  ('other', 'General feedback or questions', '#6B7280', 'chat', 6)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 2. FEEDBACK (Core Submission Table)
-- =============================================

CREATE TABLE IF NOT EXISTS feedback (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Privacy-First User Identification
  -- No auth.uid() - uses browser fingerprint + session
  user_fingerprint TEXT NOT NULL, -- Hashed browser fingerprint
  session_id TEXT, -- Optional session identifier
  
  -- Feedback Content
  category_id UUID REFERENCES feedback_categories(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 5000),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  
  -- Context Capture
  page_url TEXT NOT NULL, -- Where the feedback was submitted
  page_title TEXT, -- Page title at time of submission
  user_agent TEXT, -- Browser/device info
  viewport_width INTEGER, -- Screen resolution
  viewport_height INTEGER,
  
  -- Metadata
  contact_email TEXT, -- Optional - user provides if they want followup
  allow_contact BOOLEAN DEFAULT false,
  
  -- Admin Fields
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'archived')),
  admin_notes TEXT, -- Internal notes
  assigned_to TEXT, -- Admin user ID who owns this
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft Delete (GDPR)
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT email_format CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_fingerprint ON feedback(user_fingerprint) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_page_url ON feedback(page_url) WHERE deleted_at IS NULL;

-- =============================================
-- 3. FEEDBACK ATTACHMENTS (Screenshots)
-- =============================================

CREATE TABLE IF NOT EXISTS feedback_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  
  -- File Storage
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880), -- Max 5MB
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attachments_feedback ON feedback_attachments(feedback_id) WHERE deleted_at IS NULL;

-- =============================================
-- 4. UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER feedback_categories_updated_at
  BEFORE UPDATE ON feedback_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;

-- Categories: Public Read
CREATE POLICY "Public can read active categories"
  ON feedback_categories FOR SELECT
  USING (is_active = true);

-- Categories: Admin Only Write
CREATE POLICY "Only admins can modify categories"
  ON feedback_categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Feedback: Anyone Can Insert (Anonymous Submissions)
CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (true);

-- Feedback: Users Can Read Their Own (via fingerprint)
CREATE POLICY "Users can read own feedback via fingerprint"
  ON feedback FOR SELECT
  USING (user_fingerprint = current_setting('request.headers')::json->>'x-user-fingerprint');

-- Feedback: Admins Can Read All
CREATE POLICY "Admins can read all feedback"
  ON feedback FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Feedback: Admins Can Update (Status, Notes)
CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Feedback: Users Can Delete Their Own (GDPR Right to Erasure)
CREATE POLICY "Users can soft-delete own feedback"
  ON feedback FOR UPDATE
  USING (user_fingerprint = current_setting('request.headers')::json->>'x-user-fingerprint')
  WITH CHECK (deleted_at IS NOT NULL);

-- Attachments: Inherit from Feedback
CREATE POLICY "Attachments follow feedback permissions"
  ON feedback_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM feedback
      WHERE feedback.id = feedback_attachments.feedback_id
      AND (
        feedback.user_fingerprint = current_setting('request.headers')::json->>'x-user-fingerprint'
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Anyone can upload attachments for their feedback"
  ON feedback_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedback
      WHERE feedback.id = feedback_attachments.feedback_id
      AND feedback.user_fingerprint = current_setting('request.headers')::json->>'x-user-fingerprint'
    )
  );
