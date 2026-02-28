-- Platform Admins: global site administrators with cross-tenant access
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Self-read only (admin actions use service-role client)
CREATE POLICY "platform_admins_self_read" ON public.platform_admins
  FOR SELECT USING (user_id = auth.uid());

-- Helper: check if current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Audit trigger (reuse existing function)
CREATE TRIGGER platform_admins_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- Add 'suspended' to valid subscription statuses for admin suspend/unsuspend
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS valid_subscription_status;
ALTER TABLE public.subscriptions ADD CONSTRAINT valid_subscription_status CHECK (
  status IN ('trialing', 'active', 'past_due', 'canceled', 'paused', 'free', 'suspended')
);

-- Seed Chris as super_admin
INSERT INTO public.platform_admins (user_id, role)
SELECT id, 'super_admin' FROM auth.users
WHERE email = 'chris@johnstone.id.au'
ON CONFLICT (user_id) DO NOTHING;
