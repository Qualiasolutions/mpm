-- MPM Employee Discount Platform: Admin Core Migration
-- Creates divisions, brands, employee_divisions, discount_rules, app_settings
-- Adds employee_id, phone, monthly_spending_limit to profiles

-- =============================================================================
-- 1. Alter profiles table (add new fields)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS monthly_spending_limit NUMERIC(10,2) DEFAULT 200.00;

-- =============================================================================
-- 2. Divisions Table
-- =============================================================================

CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage divisions"
  ON public.divisions FOR ALL
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

-- All authenticated users can read active divisions
CREATE POLICY "Authenticated users can view active divisions"
  ON public.divisions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Auto-update updated_at
CREATE TRIGGER on_division_updated
  BEFORE UPDATE ON public.divisions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. Brands Table
-- =============================================================================

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, division_id)
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage brands"
  ON public.brands FOR ALL
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

-- All authenticated users can read active brands
CREATE POLICY "Authenticated users can view active brands"
  ON public.brands FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Auto-update updated_at
CREATE TRIGGER on_brand_updated
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. Employee-Division Junction Table
-- =============================================================================

CREATE TABLE public.employee_divisions (
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, division_id)
);

ALTER TABLE public.employee_divisions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins can manage employee divisions"
  ON public.employee_divisions FOR ALL
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

-- Employees can view their own assignments
CREATE POLICY "Employees can view own division assignments"
  ON public.employee_divisions FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- =============================================================================
-- 5. Discount Rules Table
-- =============================================================================

CREATE TABLE public.discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL UNIQUE REFERENCES public.divisions(id) ON DELETE CASCADE,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage discount rules
CREATE POLICY "Admins can manage discount rules"
  ON public.discount_rules FOR ALL
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

-- All authenticated users can read active discount rules
CREATE POLICY "Authenticated users can view active discount rules"
  ON public.discount_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Auto-update updated_at
CREATE TRIGGER on_discount_rule_updated
  BEFORE UPDATE ON public.discount_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 6. App Settings Table
-- =============================================================================

CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
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

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can view app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 7. Seed Data: Divisions
-- =============================================================================

INSERT INTO public.divisions (name, code, description) VALUES
  ('Consumer Products Division', 'CPD', 'L''Oreal Paris, Garnier, Maybelline, NYX, Essie, Baby Planet, Baylis & Harding'),
  ('Professional Products Division', 'PPD', 'Kerastase, L''Oreal Professionnel, Redken, Shu Uemura'),
  ('Active Cosmetics Division', 'ACD', 'Vichy, La Roche-Posay, CeraVe, SkinCeuticals'),
  ('Fashion & Accessories', 'FASHION', 'FOX Kids & Baby, Swatch');

-- =============================================================================
-- 8. Seed Data: Brands (using division references)
-- =============================================================================

-- CPD brands
INSERT INTO public.brands (name, division_id)
SELECT b.name, d.id FROM (
  VALUES ('L''Oreal Paris'), ('Garnier'), ('Maybelline'), ('NYX'), ('Essie'), ('Baby Planet'), ('Baylis & Harding')
) AS b(name)
CROSS JOIN public.divisions d WHERE d.code = 'CPD';

-- PPD brands
INSERT INTO public.brands (name, division_id)
SELECT b.name, d.id FROM (
  VALUES ('Kerastase'), ('L''Oreal Professionnel'), ('Redken'), ('Shu Uemura')
) AS b(name)
CROSS JOIN public.divisions d WHERE d.code = 'PPD';

-- ACD brands
INSERT INTO public.brands (name, division_id)
SELECT b.name, d.id FROM (
  VALUES ('Vichy'), ('La Roche-Posay'), ('CeraVe'), ('SkinCeuticals')
) AS b(name)
CROSS JOIN public.divisions d WHERE d.code = 'ACD';

-- Fashion brands
INSERT INTO public.brands (name, division_id)
SELECT b.name, d.id FROM (
  VALUES ('FOX Kids & Baby'), ('Swatch')
) AS b(name)
CROSS JOIN public.divisions d WHERE d.code = 'FASHION';

-- =============================================================================
-- 9. Seed Data: Default Discount Rules (one per division)
-- =============================================================================

INSERT INTO public.discount_rules (division_id, discount_percentage)
SELECT d.id, CASE d.code
  WHEN 'CPD' THEN 20.00
  WHEN 'PPD' THEN 25.00
  WHEN 'ACD' THEN 20.00
  WHEN 'FASHION' THEN 15.00
END
FROM public.divisions d;

-- =============================================================================
-- 10. Seed Data: Default App Settings
-- =============================================================================

INSERT INTO public.app_settings (key, value) VALUES
  ('default_monthly_spending_limit', '200.00'::jsonb),
  ('app_name', '"MPM Employee Discount Platform"'::jsonb),
  ('currency', '"EUR"'::jsonb);
