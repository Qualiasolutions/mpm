-- MPM Employee Discount Platform: Employee Experience Migration
-- Creates discount_codes and transactions tables for code generation and redemption tracking

-- =============================================================================
-- 1. Discount Codes Table (generated codes for redemption)
-- =============================================================================

CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  discount_percentage NUMERIC(5,2) NOT NULL,
  manual_code TEXT NOT NULL UNIQUE,
  qr_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_discount_codes_employee ON public.discount_codes(employee_id);
CREATE INDEX idx_discount_codes_manual_code ON public.discount_codes(manual_code);
CREATE INDEX idx_discount_codes_status ON public.discount_codes(status);
CREATE INDEX idx_discount_codes_expires_at ON public.discount_codes(expires_at);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Employees can view their own codes
CREATE POLICY "Employees can view own discount codes"
  ON public.discount_codes FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Employees can insert their own codes
CREATE POLICY "Employees can create own discount codes"
  ON public.discount_codes FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Admins can view all codes
CREATE POLICY "Admins can view all discount codes"
  ON public.discount_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can update code status (for expiry/usage)
CREATE POLICY "Authenticated can update own code status"
  ON public.discount_codes FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- =============================================================================
-- 2. Transactions Table (completed redemptions)
-- =============================================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  original_amount NUMERIC(10,2) NOT NULL CHECK (original_amount > 0),
  discount_percentage NUMERIC(5,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(10,2) NOT NULL,
  location TEXT,
  validated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_employee ON public.transactions(employee_id);
CREATE INDEX idx_transactions_division ON public.transactions(division_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Employees can view their own transactions
CREATE POLICY "Employees can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions"
  ON public.transactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- 3. Function: Generate unique manual code (MPM-XXXX format)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_manual_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-char alphanumeric code
    new_code := 'MPM-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

    -- Check uniqueness
    SELECT EXISTS (
      SELECT 1 FROM public.discount_codes WHERE manual_code = new_code
    ) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$;

-- =============================================================================
-- 4. Function: Get employee monthly spending
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_employee_monthly_spending(p_employee_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  total_spent NUMERIC;
BEGIN
  SELECT COALESCE(SUM(original_amount), 0) INTO total_spent
  FROM public.transactions
  WHERE employee_id = p_employee_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';

  RETURN total_spent;
END;
$$;

-- =============================================================================
-- 5. Function: Auto-expire discount codes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_discount_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.discount_codes
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$;
