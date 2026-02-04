# Phase 2: Admin Core — Context & Decisions

## Phase Goal

Admins can fully manage the employee roster, organizational structure, and discount rules so the system is ready for employees to use.

## Existing State

From Phase 1:
- `profiles` table: id, role (admin/employee), first_name, last_name, is_active, created_at, updated_at
- `createEmployee` server action: creates auth user + profile via admin client, sends magic link
- Admin layout with auth guard at `(admin)/layout.tsx`
- Employee management page with create form (no list yet)
- Admin dashboard with placeholder cards for Divisions and Discount Rules
- NavBar with admin navigation: Dashboard, Employees, Employee View
- Design system: #0A0A0B bg, #D4A853 gold accent, dark theme throughout
- Form pattern: useActionState + Zod validation + admin auth check

## Decisions

### 1. Employee Management UX

**Employee list**: Server-rendered data table on `/admin/employees`. Columns: Name, Email, Divisions (colored tags), Status (active/inactive badge), Actions (edit, toggle status).
- ~100 employees: load all server-side, client-side search/filter with `useState`
- Search: by name or email (client-side filter)
- Filter: All / Active / Inactive status tabs
- No pagination needed at 100 employees

**Edit flow**: Slide-over panel from the right side (not a separate page, not a modal). Opens when clicking Edit on a row. Keeps list visible underneath.
- Fields: first_name, last_name, email (read-only), role (select), division assignments (multi-select checkboxes), employee_id (optional text), phone (optional text)
- Save via server action with Zod validation

**Deactivation**: Toggle `is_active` with inline confirmation. Deactivated employees appear dimmed in the list. Can be reactivated. No hard delete ever.

**New profile fields**: Add `employee_id` (TEXT, nullable — MPM internal reference number) and `phone` (TEXT, nullable). Minimal — not an HR system.

### 2. Division & Brand Structure

**Divisions**: Pre-seed the 4 known divisions in migration:
1. Consumer Products Division (CPD) — L'Oreal Paris, Garnier, Maybelline, NYX, Essie, etc.
2. Professional Products Division (PPD) — Kerastase, L'Oreal Professionnel, Redken, Shu Uemura
3. Active Cosmetics Division (ACD) — Vichy, La Roche-Posay, CeraVe, SkinCeuticals
4. Fashion & Accessories — FOX Kids & Baby, Swatch

Admin can add new divisions and edit existing ones. Divisions cannot be deleted if they have assigned employees or brands (soft-delete via `is_active`).

**Divisions table schema**:
- `id` UUID PK default gen_random_uuid()
- `name` TEXT NOT NULL UNIQUE
- `code` TEXT NOT NULL UNIQUE (e.g., 'CPD', 'PPD', 'ACD', 'FASHION')
- `description` TEXT
- `is_active` BOOLEAN default true
- `created_at` TIMESTAMPTZ default now()
- `updated_at` TIMESTAMPTZ default now()

**Brands table schema**:
- `id` UUID PK default gen_random_uuid()
- `name` TEXT NOT NULL
- `division_id` UUID NOT NULL REFERENCES divisions(id)
- `is_active` BOOLEAN default true
- `created_at` TIMESTAMPTZ default now()
- `updated_at` TIMESTAMPTZ default now()
- UNIQUE(name, division_id)

Relationship: Brand belongs to exactly ONE division (1:many). No brand spans divisions.

**Employee-Division relationship**: Many-to-many junction table:
- `employee_divisions` table
- `employee_id` UUID REFERENCES profiles(id) ON DELETE CASCADE
- `division_id` UUID REFERENCES divisions(id) ON DELETE CASCADE
- PRIMARY KEY (employee_id, division_id)
- `assigned_at` TIMESTAMPTZ default now()

Admin page: `/admin/divisions` — table of divisions, each expandable to show brands. Inline add/edit.

### 3. CSV Bulk Import

**Expected CSV columns**:
```
first_name,last_name,email,role,divisions
John,Smith,j.smith@mpm.com,employee,"CPD,PPD"
Jane,Doe,j.doe@mpm.com,admin,ACD
```
- `role`: optional, defaults to 'employee'
- `divisions`: optional, comma-separated division codes

**Error handling**: Partial import. Process all valid rows, skip invalid ones. Return results: X imported, Y skipped with per-row error reasons.

**Auth accounts**: Auto-create Supabase auth user for each imported row. Send password setup email (magic link to /update-password).

**Duplicate detection**: By email. Skip existing emails with warning "already exists", don't error the whole file.

**UX flow**:
1. Upload CSV file (drag-and-drop or click)
2. Preview parsed data in table (show first 10 rows + count)
3. Validation results shown inline (green = valid, red = error with reason)
4. Confirm button to import valid rows
5. Results summary: "Created X employees, Y skipped"

Location: Tab or section on `/admin/employees` page, not a separate page.

### 4. Discount Rule Configuration

**Granularity**: Per-division discount percentage only. No per-brand rates in v1.

**Discount rules table schema**:
- `discount_rules` table
- `id` UUID PK default gen_random_uuid()
- `division_id` UUID NOT NULL UNIQUE REFERENCES divisions(id)
- `discount_percentage` NUMERIC(5,2) NOT NULL CHECK (0 <= val <= 100)
- `is_active` BOOLEAN default true
- `created_at` TIMESTAMPTZ default now()
- `updated_at` TIMESTAMPTZ default now()

One rule per division (UNIQUE on division_id). Pre-seed with defaults during migration.

**Spending cap**: Global monthly cap per employee, stored on `profiles` table:
- Add `monthly_spending_limit` NUMERIC(10,2) DEFAULT 200.00 to profiles
- Single cap across all divisions (not per-division)
- Admin can override per-employee (edit in employee detail panel)
- System-wide default set in an `app_settings` table:
  - `key` TEXT PK
  - `value` JSONB
  - Seed: `default_monthly_spending_limit = 200.00`

**Rule changes**: New discount percentage applies to future transactions only. Cap changes apply immediately — if employee spent 150 of 200 and cap changes to 100, they're over limit for the rest of the month.

**Pause discounts**: Toggle `is_active` on discount_rules. When inactive, no new codes can be generated for that division.

**Admin page**: `/admin/discounts` — table showing each division with its discount %, active status toggle, and an edit button. Separate section for default spending cap.

### 5. Navigation Updates

Add to admin NavBar:
- Dashboard → /admin
- Employees → /admin/employees
- Divisions → /admin/divisions
- Discounts → /admin/discounts

Mobile menu: same links in dropdown.

### 6. Admin Dashboard Updates

Replace placeholder cards with active links:
- Employee Management → /admin/employees (already active)
- Division Management → /admin/divisions (new)
- Discount Rules → /admin/discounts (new)

Add summary stats to dashboard:
- Total employees (active count)
- Total divisions
- Active discount rules count

## Deferred Ideas

- Per-brand discount rates (Phase 2 is per-division only)
- Employee photo/avatar upload
- Department/team grouping within divisions
- Audit log for admin actions
- Division-level spending caps (v1 is global only)

## RLS Requirements

All new tables MUST have RLS enabled in the same migration:
- `divisions`: admins can CRUD, authenticated employees can SELECT active divisions
- `brands`: admins can CRUD, authenticated employees can SELECT active brands in their divisions
- `employee_divisions`: admins can CRUD, employees can SELECT their own assignments
- `discount_rules`: admins can CRUD, authenticated employees can SELECT active rules
- `app_settings`: admins can CRUD, all authenticated can SELECT

## Migration Strategy

Single migration file `00002_admin_core.sql` that:
1. Adds new columns to profiles (employee_id, phone, monthly_spending_limit)
2. Creates divisions table with RLS
3. Creates brands table with RLS
4. Creates employee_divisions table with RLS
5. Creates discount_rules table with RLS
6. Creates app_settings table with RLS
7. Pre-seeds 4 divisions with codes and descriptions
8. Pre-seeds known brands per division
9. Pre-seeds default discount rules (one per division)
10. Pre-seeds default app_settings
