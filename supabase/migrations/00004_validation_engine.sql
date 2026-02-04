-- MPM Employee Discount Platform: Validation Engine Migration
-- Adds validation functions and indexes for cashier-side code validation

-- =============================================================================
-- 1. Function: Validate and redeem a discount code (atomic)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_and_redeem_code(
  p_code TEXT,
  p_original_amount NUMERIC,
  p_location TEXT DEFAULT NULL,
  p_validated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code RECORD;
  v_employee RECORD;
  v_discount_amount NUMERIC;
  v_final_amount NUMERIC;
  v_monthly_spent NUMERIC;
  v_monthly_limit NUMERIC;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Find the code (by manual_code or by id from QR)
  SELECT dc.*, d.name AS division_name, d.code AS division_code
  INTO v_code
  FROM public.discount_codes dc
  JOIN public.divisions d ON d.id = dc.division_id
  WHERE dc.manual_code = p_code OR dc.id::text = p_code
  LIMIT 1;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code', 'message', 'Code not found');
  END IF;

  -- 2. Check code status
  IF v_code.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used', 'message', 'This code has already been redeemed');
  END IF;

  IF v_code.status = 'expired' OR v_code.expires_at < now() THEN
    -- Mark as expired if not already
    UPDATE public.discount_codes SET status = 'expired' WHERE id = v_code.id AND status = 'active';
    RETURN jsonb_build_object('success', false, 'error', 'expired', 'message', 'This code has expired');
  END IF;

  -- 3. Check employee status
  SELECT p.*,
    COALESCE(p.monthly_spending_limit,
      (SELECT (value)::numeric FROM public.app_settings WHERE key = 'default_monthly_spending_limit')
    ) AS effective_limit
  INTO v_employee
  FROM public.profiles p
  WHERE p.id = v_code.employee_id;

  IF v_employee IS NULL OR NOT v_employee.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive_employee', 'message', 'Employee account is inactive');
  END IF;

  -- 4. Check monthly spending limit
  SELECT COALESCE(SUM(original_amount), 0) INTO v_monthly_spent
  FROM public.transactions
  WHERE employee_id = v_code.employee_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';

  v_monthly_limit := COALESCE(v_employee.effective_limit, 200);

  IF (v_monthly_spent + p_original_amount) > v_monthly_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'over_limit',
      'message', 'Monthly spending limit exceeded',
      'details', jsonb_build_object(
        'limit', v_monthly_limit,
        'spent', v_monthly_spent,
        'remaining', v_monthly_limit - v_monthly_spent,
        'requested', p_original_amount
      )
    );
  END IF;

  -- 5. Calculate discount
  v_discount_amount := ROUND(p_original_amount * (v_code.discount_percentage / 100), 2);
  v_final_amount := p_original_amount - v_discount_amount;

  -- 6. Mark code as used (atomic)
  UPDATE public.discount_codes
  SET status = 'used'
  WHERE id = v_code.id AND status = 'active';

  IF NOT FOUND THEN
    -- Race condition: code was used/expired between check and update
    RETURN jsonb_build_object('success', false, 'error', 'already_used', 'message', 'This code has already been redeemed');
  END IF;

  -- 7. Create transaction
  INSERT INTO public.transactions (
    discount_code_id, employee_id, division_id,
    original_amount, discount_percentage, discount_amount, final_amount,
    location, validated_by
  ) VALUES (
    v_code.id, v_code.employee_id, v_code.division_id,
    p_original_amount, v_code.discount_percentage, v_discount_amount, v_final_amount,
    p_location, p_validated_by
  ) RETURNING id INTO v_transaction_id;

  -- 8. Return success
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'employee_name', COALESCE(v_employee.first_name, '') || ' ' || COALESCE(v_employee.last_name, ''),
    'division_name', v_code.division_name,
    'division_code', v_code.division_code,
    'discount_percentage', v_code.discount_percentage,
    'original_amount', p_original_amount,
    'discount_amount', v_discount_amount,
    'final_amount', v_final_amount,
    'remaining_limit', v_monthly_limit - v_monthly_spent - p_original_amount
  );
END;
$$;

-- Grant execute to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION public.validate_and_redeem_code TO authenticated;
