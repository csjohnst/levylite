-- Migration 00014: Trust Accounting (Phase 3)
-- Tables: chart_of_accounts, financial_years, transactions, transaction_lines,
--         bank_statements, bank_statement_lines, reconciliations
-- Also: adds transaction_id to existing payment_allocations (Phase 2→3 bridge)
-- NOTE: All tables created first, then indexes, then RLS, then policies, then trigger functions, then triggers, then seed data

-- ============================================================
-- 1. CREATE ALL TABLES
-- ============================================================

-- Chart of Accounts (GL structure)
-- scheme_id NULL = org-level defaults (copied to scheme on first use)
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Account identification
  code VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Classification
  account_type TEXT NOT NULL,
  fund_type TEXT,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

  -- Flags
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_account_type CHECK (account_type IN ('asset', 'liability', 'income', 'expense', 'equity')),
  CONSTRAINT valid_coa_fund_type CHECK (fund_type IS NULL OR fund_type IN ('admin', 'capital_works')),
  CONSTRAINT unique_code_per_scheme UNIQUE(scheme_id, code)
);

-- Financial Years (per-scheme FY tracking)
CREATE TABLE public.financial_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Year identification
  year_label VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  is_current BOOLEAN NOT NULL DEFAULT false,

  -- Opening balances
  admin_opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  capital_opening_balance NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_fy_range CHECK (end_date > start_date),
  CONSTRAINT unique_fy_per_scheme UNIQUE(scheme_id, year_label)
);

-- Transactions (the single source of truth for all financial activity)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,

  -- Transaction details
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,
  fund_type TEXT NOT NULL,
  category_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  reference VARCHAR(100),
  payment_method TEXT,

  -- Reconciliation
  bank_statement_id UUID, -- FK added after bank_statements table is created
  is_reconciled BOOLEAN NOT NULL DEFAULT false,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('receipt', 'payment', 'journal')),
  CONSTRAINT valid_txn_fund_type CHECK (fund_type IN ('admin', 'capital_works')),
  CONSTRAINT valid_payment_method CHECK (payment_method IS NULL OR payment_method IN ('eft', 'credit_card', 'cheque', 'cash', 'bpay')),
  CONSTRAINT valid_txn_amount CHECK (amount > 0),
  CONSTRAINT valid_gst_amount CHECK (gst_amount >= 0)
);

-- Transaction Lines (double-entry debit/credit pairs)
CREATE TABLE public.transaction_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,

  -- Debit or credit
  line_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_line_type CHECK (line_type IN ('debit', 'credit')),
  CONSTRAINT valid_line_amount CHECK (amount > 0)
);

-- Bank Statements (uploaded CSV metadata)
CREATE TABLE public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,

  -- Statement details
  fund_type TEXT NOT NULL,
  statement_date DATE NOT NULL,
  opening_balance NUMERIC(10,2) NOT NULL,
  closing_balance NUMERIC(10,2) NOT NULL,

  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_bs_fund_type CHECK (fund_type IN ('admin', 'capital_works'))
);

-- Now add the FK from transactions to bank_statements
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_bank_statement
  FOREIGN KEY (bank_statement_id) REFERENCES public.bank_statements(id) ON DELETE SET NULL;

-- Bank Statement Lines (individual rows parsed from CSV)
CREATE TABLE public.bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,

  -- Line details (from CSV)
  line_date DATE NOT NULL,
  description TEXT,
  debit_amount NUMERIC(10,2) DEFAULT 0,
  credit_amount NUMERIC(10,2) DEFAULT 0,
  running_balance NUMERIC(10,2),

  -- Matching
  matched BOOLEAN NOT NULL DEFAULT false,
  matched_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconciliations (final reconciliation record)
CREATE TABLE public.reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,

  -- Who and when
  reconciled_by UUID NOT NULL REFERENCES auth.users(id),
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Reconciliation balances
  bank_balance NUMERIC(10,2) NOT NULL,
  ledger_balance NUMERIC(10,2) NOT NULL,
  outstanding_deposits NUMERIC(10,2) NOT NULL DEFAULT 0,
  outstanding_withdrawals NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_recon_status CHECK (status IN ('draft', 'reconciled'))
);

-- ============================================================
-- 1b. ALTER EXISTING TABLES (Phase 2→3 bridge)
-- ============================================================

-- Add transaction_id to payment_allocations for linking Phase 2 payments to Phase 3 transactions
ALTER TABLE public.payment_allocations
  ADD COLUMN transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- chart_of_accounts indexes
CREATE INDEX idx_coa_scheme ON public.chart_of_accounts(scheme_id);
CREATE INDEX idx_coa_parent ON public.chart_of_accounts(parent_id);
CREATE INDEX idx_coa_account_type ON public.chart_of_accounts(account_type);
CREATE INDEX idx_coa_fund_type ON public.chart_of_accounts(fund_type);
CREATE INDEX idx_coa_code ON public.chart_of_accounts(code);
CREATE INDEX idx_coa_active ON public.chart_of_accounts(scheme_id) WHERE is_active = true;

-- financial_years indexes
CREATE INDEX idx_fy_scheme ON public.financial_years(scheme_id);
CREATE INDEX idx_fy_current ON public.financial_years(scheme_id) WHERE is_current = true;
CREATE UNIQUE INDEX unique_current_fy_per_scheme ON public.financial_years(scheme_id) WHERE is_current = true;
CREATE INDEX idx_fy_dates ON public.financial_years(start_date, end_date);

-- transactions indexes
CREATE INDEX idx_txn_scheme ON public.transactions(scheme_id);
CREATE INDEX idx_txn_lot ON public.transactions(lot_id);
CREATE INDEX idx_txn_date ON public.transactions(transaction_date);
CREATE INDEX idx_txn_type ON public.transactions(transaction_type);
CREATE INDEX idx_txn_fund_type ON public.transactions(fund_type);
CREATE INDEX idx_txn_category ON public.transactions(category_id);
CREATE INDEX idx_txn_reconciled ON public.transactions(is_reconciled);
CREATE INDEX idx_txn_bank_statement ON public.transactions(bank_statement_id);
CREATE INDEX idx_txn_scheme_date ON public.transactions(scheme_id, transaction_date);
CREATE INDEX idx_txn_scheme_fund ON public.transactions(scheme_id, fund_type);
CREATE INDEX idx_txn_not_deleted ON public.transactions(scheme_id) WHERE deleted_at IS NULL;

-- transaction_lines indexes
CREATE INDEX idx_txl_transaction ON public.transaction_lines(transaction_id);
CREATE INDEX idx_txl_account ON public.transaction_lines(account_id);
CREATE INDEX idx_txl_line_type ON public.transaction_lines(line_type);

-- bank_statements indexes
CREATE INDEX idx_bs_scheme ON public.bank_statements(scheme_id);
CREATE INDEX idx_bs_fund_type ON public.bank_statements(fund_type);
CREATE INDEX idx_bs_date ON public.bank_statements(statement_date);
CREATE INDEX idx_bs_scheme_fund ON public.bank_statements(scheme_id, fund_type);

-- bank_statement_lines indexes
CREATE INDEX idx_bsl_statement ON public.bank_statement_lines(bank_statement_id);
CREATE INDEX idx_bsl_matched ON public.bank_statement_lines(matched);
CREATE INDEX idx_bsl_matched_txn ON public.bank_statement_lines(matched_transaction_id);
CREATE INDEX idx_bsl_date ON public.bank_statement_lines(line_date);

-- reconciliations indexes
CREATE INDEX idx_recon_statement ON public.reconciliations(bank_statement_id);
CREATE INDEX idx_recon_status ON public.reconciliations(status);

-- payment_allocations: index the new transaction_id column
CREATE INDEX idx_payment_allocations_transaction ON public.payment_allocations(transaction_id);

-- ============================================================
-- 3. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- chart_of_accounts: scheme_id -> schemes.organisation_id OR scheme_id IS NULL (org-level defaults)
-- Org-level defaults (scheme_id IS NULL) are visible to all authenticated users in the org
CREATE POLICY "coa_select" ON public.chart_of_accounts
  FOR SELECT USING (
    scheme_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = chart_of_accounts.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "coa_insert" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "coa_update" ON public.chart_of_accounts
  FOR UPDATE USING (
    scheme_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = chart_of_accounts.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "coa_delete" ON public.chart_of_accounts
  FOR DELETE USING (
    scheme_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = chart_of_accounts.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- financial_years: scheme_id -> schemes.organisation_id
CREATE POLICY "fy_select" ON public.financial_years
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = financial_years.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "fy_insert" ON public.financial_years
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "fy_update" ON public.financial_years
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = financial_years.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "fy_delete" ON public.financial_years
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = financial_years.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- transactions: scheme_id -> schemes.organisation_id
CREATE POLICY "txn_select" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = transactions.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "txn_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "txn_update" ON public.transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = transactions.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "txn_delete" ON public.transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = transactions.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- transaction_lines: chain through transaction_id -> transactions.scheme_id -> schemes.organisation_id
CREATE POLICY "txl_select" ON public.transaction_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      JOIN public.schemes ON schemes.id = transactions.scheme_id
      WHERE transactions.id = transaction_lines.transaction_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "txl_insert" ON public.transaction_lines
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "txl_update" ON public.transaction_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      JOIN public.schemes ON schemes.id = transactions.scheme_id
      WHERE transactions.id = transaction_lines.transaction_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "txl_delete" ON public.transaction_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      JOIN public.schemes ON schemes.id = transactions.scheme_id
      WHERE transactions.id = transaction_lines.transaction_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- bank_statements: scheme_id -> schemes.organisation_id
CREATE POLICY "bs_select" ON public.bank_statements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = bank_statements.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "bs_insert" ON public.bank_statements
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "bs_update" ON public.bank_statements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = bank_statements.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "bs_delete" ON public.bank_statements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.schemes
      WHERE schemes.id = bank_statements.scheme_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- bank_statement_lines: chain through bank_statement_id -> bank_statements.scheme_id -> schemes.organisation_id
CREATE POLICY "bsl_select" ON public.bank_statement_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = bank_statement_lines.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "bsl_insert" ON public.bank_statement_lines
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "bsl_update" ON public.bank_statement_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = bank_statement_lines.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "bsl_delete" ON public.bank_statement_lines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = bank_statement_lines.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- reconciliations: chain through bank_statement_id -> bank_statements.scheme_id -> schemes.organisation_id
CREATE POLICY "recon_select" ON public.reconciliations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = reconciliations.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "recon_insert" ON public.reconciliations
  FOR INSERT WITH CHECK (
    public.user_organisation_id() IS NOT NULL
  );

CREATE POLICY "recon_update" ON public.reconciliations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = reconciliations.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

CREATE POLICY "recon_delete" ON public.reconciliations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements
      JOIN public.schemes ON schemes.id = bank_statements.scheme_id
      WHERE bank_statements.id = reconciliations.bank_statement_id
      AND schemes.organisation_id = public.user_organisation_id()
    )
  );

-- ============================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================

-- auto_create_transaction_lines: AFTER INSERT on transactions
-- For receipt: DEBIT trust account, CREDIT income category
-- For payment: DEBIT expense category, CREDIT trust account
-- For journal: no auto-lines (application must supply them manually)
-- Must be SECURITY DEFINER because it inserts into RLS-protected transaction_lines
CREATE OR REPLACE FUNCTION public.auto_create_transaction_lines()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_trust_account_id UUID;
  v_trust_account_code VARCHAR(10);
  v_total_debits NUMERIC(10,2);
  v_total_credits NUMERIC(10,2);
BEGIN
  -- Journal entries: lines are managed by the application, skip auto-creation
  IF NEW.transaction_type = 'journal' THEN
    RETURN NEW;
  END IF;

  -- Determine the trust account based on fund_type
  IF NEW.fund_type = 'admin' THEN
    v_trust_account_code := '1100';
  ELSIF NEW.fund_type = 'capital_works' THEN
    v_trust_account_code := '1200';
  END IF;

  -- Look up trust account: first try scheme-specific, then org-level default
  SELECT id INTO v_trust_account_id
  FROM public.chart_of_accounts
  WHERE code = v_trust_account_code
    AND (scheme_id = NEW.scheme_id OR scheme_id IS NULL)
  ORDER BY scheme_id NULLS LAST
  LIMIT 1;

  IF v_trust_account_id IS NULL THEN
    RAISE EXCEPTION 'Trust account % not found for scheme %', v_trust_account_code, NEW.scheme_id;
  END IF;

  IF NEW.category_id IS NULL THEN
    RAISE EXCEPTION 'category_id is required for receipt and payment transactions';
  END IF;

  IF NEW.transaction_type = 'receipt' THEN
    -- Receipt: money coming in
    -- DEBIT trust account (asset increases)
    INSERT INTO public.transaction_lines (transaction_id, account_id, line_type, amount, description)
    VALUES (NEW.id, v_trust_account_id, 'debit', NEW.amount, NEW.description);

    -- CREDIT income category
    INSERT INTO public.transaction_lines (transaction_id, account_id, line_type, amount, description)
    VALUES (NEW.id, NEW.category_id, 'credit', NEW.amount, NEW.description);

  ELSIF NEW.transaction_type = 'payment' THEN
    -- Payment: money going out
    -- DEBIT expense category
    INSERT INTO public.transaction_lines (transaction_id, account_id, line_type, amount, description)
    VALUES (NEW.id, NEW.category_id, 'debit', NEW.amount, NEW.description);

    -- CREDIT trust account (asset decreases)
    INSERT INTO public.transaction_lines (transaction_id, account_id, line_type, amount, description)
    VALUES (NEW.id, v_trust_account_id, 'credit', NEW.amount, NEW.description);
  END IF;

  -- Validate: SUM(debits) must equal SUM(credits)
  SELECT
    COALESCE(SUM(CASE WHEN line_type = 'debit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN line_type = 'credit' THEN amount ELSE 0 END), 0)
  INTO v_total_debits, v_total_credits
  FROM public.transaction_lines
  WHERE transaction_id = NEW.id;

  IF v_total_debits != v_total_credits THEN
    RAISE EXCEPTION 'Transaction % is unbalanced: debits (%) != credits (%)',
      NEW.id, v_total_debits, v_total_credits;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-create transaction lines on insert
CREATE TRIGGER auto_create_transaction_lines
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_transaction_lines();

-- updated_at triggers (reuse existing function)
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_coa_updated_at
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log triggers (reuse existing function)
CREATE TRIGGER chart_of_accounts_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER financial_years_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_years
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER transactions_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER transaction_lines_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.transaction_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER bank_statements_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_statements
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER bank_statement_lines_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_statement_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER reconciliations_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================
-- 7. SEED DATA: Default Chart of Accounts (org-level, scheme_id IS NULL)
-- ============================================================

INSERT INTO public.chart_of_accounts (scheme_id, code, name, account_type, fund_type, is_system, is_active) VALUES
  -- Asset accounts (trust accounts)
  (NULL, '1100', 'Trust Account - Admin Fund',          'asset',   'admin',         true, true),
  (NULL, '1200', 'Trust Account - Capital Works Fund',   'asset',   'capital_works', true, true),

  -- Income accounts
  (NULL, '4100', 'Levy Income - Admin',                  'income',  'admin',         true, true),
  (NULL, '4200', 'Levy Income - Capital Works',          'income',  'capital_works', true, true),
  (NULL, '4300', 'Interest Income',                      'income',  NULL,            true, true),
  (NULL, '4400', 'Other Income',                         'income',  NULL,            true, true),

  -- Expense accounts (admin fund)
  (NULL, '6100', 'Maintenance - General',                'expense', 'admin',         true, true),
  (NULL, '6110', 'Maintenance - Plumbing',               'expense', 'admin',         true, true),
  (NULL, '6120', 'Maintenance - Electrical',             'expense', 'admin',         true, true),
  (NULL, '6130', 'Maintenance - Gardening',              'expense', 'admin',         true, true),
  (NULL, '6200', 'Insurance - Building',                 'expense', 'admin',         true, true),
  (NULL, '6210', 'Insurance - Public Liability',         'expense', 'admin',         true, true),
  (NULL, '6300', 'Utilities - Water',                    'expense', 'admin',         true, true),
  (NULL, '6310', 'Utilities - Electricity',              'expense', 'admin',         true, true),
  (NULL, '6320', 'Utilities - Gas',                      'expense', 'admin',         true, true),
  (NULL, '6400', 'Management Fees',                      'expense', 'admin',         true, true),
  (NULL, '6500', 'Legal & Professional',                 'expense', 'admin',         true, true),
  (NULL, '6600', 'Administration',                       'expense', 'admin',         true, true),
  (NULL, '6700', 'Other Expenses',                       'expense', 'admin',         true, true),

  -- Expense accounts (capital works fund)
  (NULL, '6150', 'Capital Works Projects',               'expense', 'capital_works', true, true);
