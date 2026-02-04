# Architecture Patterns

**Domain:** Employee Discount Management Platform (MPM Distributors)
**Researched:** 2026-02-04
**Overall Confidence:** HIGH

---

## System Overview

The MPM Employee Discount Platform is a two-role system (Admin, Employee) built on Next.js 15 with Supabase as the backend-as-a-service layer. The architecture follows an **offline-capable PWA** pattern where QR code generation works without connectivity, discount validation runs through Supabase Edge Functions for low-latency checks, and all authorization is enforced at the database level via RLS with JWT custom claims.

```
+---------------------------------------------------+
|                    CLIENTS                         |
|                                                    |
|  +------------------+    +---------------------+   |
|  | Employee PWA     |    | Admin Dashboard     |   |
|  | (Mobile-first)   |    | (Desktop-first)     |   |
|  | - Offline QR gen |    | - Employee mgmt     |   |
|  | - Discount browse|    | - Discount config   |   |
|  | - Usage history  |    | - Analytics/reports |   |
|  +--------+---------+    +---------+-----------+   |
|           |                        |               |
+-----------|------------------------|---------------+
            |                        |
            v                        v
+---------------------------------------------------+
|              NEXT.JS 15 APP ROUTER                 |
|                                                    |
|  +------------------+    +---------------------+   |
|  | Server Components|    | Server Actions      |   |
|  | (data fetching)  |    | (mutations)         |   |
|  +--------+---------+    +---------+-----------+   |
|           |                        |               |
+-----------|------------------------|---------------+
            |                        |
            v                        v
+---------------------------------------------------+
|               SUPABASE LAYER                       |
|                                                    |
|  +-------------+  +--------+  +----------------+   |
|  | PostgreSQL   |  | Auth   |  | Edge Functions |   |
|  | + RLS        |  | + JWT  |  | (validation)   |   |
|  | + DB Funcs   |  | + RBAC |  |                |   |
|  +-------------+  +--------+  +----------------+   |
|                                                    |
+---------------------------------------------------+
            |
            v (Future)
+---------------------------------------------------+
|          POS INTEGRATION LAYER                     |
|  +----------------+  +-----------------------+     |
|  | Webhook Ingest |  | Business Center Cloud |     |
|  | (receive txns) |  | API Adapter           |     |
|  +----------------+  +-----------------------+     |
+---------------------------------------------------+
```

**Key architectural decision:** The system is standalone in v1 -- no POS integration. But the data model and API layer are designed with extensibility so that a future POS adapter can plug in without schema changes.

---

## Data Model

### Entity Relationship Diagram

```
divisions 1---* brands
divisions 1---* discount_rules
brands    1---* discount_rules (optional, for brand-specific overrides)

employees 1---* employee_divisions (many-to-many via junction)
employees 1---* discount_codes
employees 1---* transactions

discount_rules 1---* transactions
discount_codes 1---* transactions (nullable -- manual validation)

employees *---1 profiles (extends auth.users)
```

### Core Tables

#### 1. `profiles` (extends Supabase auth.users)

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null,        -- MPM internal employee ID (e.g., "MPM-0042")
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'employee'    -- 'admin' | 'employee'
    check (role in ('admin', 'employee')),
  is_active boolean not null default true,
  monthly_limit_eur numeric(10,2) not null default 200.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for role-based lookups
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_active on public.profiles(is_active) where is_active = true;
```

**Rationale:** Extends `auth.users` via foreign key rather than modifying the auth schema (Supabase best practice). The `employee_id` is MPM's internal identifier, separate from the UUID. `monthly_limit_eur` is per-employee because some employees may get different caps.

#### 2. `divisions`

```sql
create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- 'Consumer Products', 'Professional Products', etc.
  code text not null unique,               -- 'CPD', 'PPD', 'ACD', 'FASHION'
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

**Seed data:** 4 rows for CPD, PPD, ACD, Fashion & Accessories.

#### 3. `brands`

```sql
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id),
  name text not null,                      -- "L'Oreal Paris", "Garnier", "Swatch", etc.
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(division_id, name)
);

create index idx_brands_division on public.brands(division_id);
```

**Rationale:** Each brand belongs to exactly one division. This enables per-brand discount overrides while keeping division as the primary grouping.

#### 4. `employee_divisions` (junction table)

```sql
create table public.employee_divisions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  division_id uuid not null references public.divisions(id),
  created_at timestamptz not null default now(),
  unique(employee_id, division_id)
);

create index idx_emp_div_employee on public.employee_divisions(employee_id);
create index idx_emp_div_division on public.employee_divisions(division_id);
```

**Rationale:** Employees may have access to discounts across multiple divisions. Admin assigns which divisions each employee can use. If an employee should access all divisions, create 4 rows.

#### 5. `discount_rules`

```sql
create table public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id),
  brand_id uuid references public.brands(id),  -- NULL = applies to entire division
  name text not null,                           -- "CPD Employee Discount", "Swatch Staff Rate"
  discount_type text not null default 'percentage'
    check (discount_type in ('percentage', 'fixed_amount')),
  discount_value numeric(10,2) not null,        -- 20.00 for 20%, or fixed EUR amount
  min_purchase_eur numeric(10,2),               -- optional minimum purchase
  max_discount_eur numeric(10,2),               -- optional cap per transaction
  valid_from date not null default current_date,
  valid_until date,                             -- NULL = no expiry
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_discount_rules_division on public.discount_rules(division_id);
create index idx_discount_rules_brand on public.discount_rules(brand_id);
create index idx_discount_rules_active on public.discount_rules(is_active, valid_from, valid_until);
```

**Rationale:** Two-level specificity -- division-wide rules and optional brand-specific overrides. The `discount_type` supports percentage (primary use case) and fixed amount (for future promotions). `valid_from`/`valid_until` allow time-boxed offers without deleting rules.

#### 6. `discount_codes`

```sql
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  discount_rule_id uuid not null references public.discount_rules(id),
  code text not null unique,               -- 8-char alphanumeric: "MPM-A3F7K2"
  qr_payload text not null,               -- JSON string encoded in QR
  status text not null default 'active'
    check (status in ('active', 'used', 'expired', 'revoked')),
  expires_at timestamptz not null,         -- e.g., 24 hours from generation
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_codes_employee on public.discount_codes(employee_id);
create index idx_codes_status on public.discount_codes(status) where status = 'active';
create index idx_codes_code on public.discount_codes(code);
create index idx_codes_expires on public.discount_codes(expires_at);
```

**Rationale:** Codes are ephemeral -- generated on demand, expire within 24 hours, single-use. This prevents code sharing and replay attacks. The `qr_payload` stores the full data encoded in the QR for offline verification reference.

#### 7. `transactions`

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id),
  discount_rule_id uuid not null references public.discount_rules(id),
  discount_code_id uuid references public.discount_codes(id),  -- NULL if validated via admin manual entry
  division_id uuid not null references public.divisions(id),
  brand_id uuid references public.brands(id),

  -- Financial
  original_amount_eur numeric(10,2) not null,
  discount_amount_eur numeric(10,2) not null,
  final_amount_eur numeric(10,2) not null,

  -- Context
  location text,                           -- store/location name
  validated_by uuid references public.profiles(id),  -- admin/cashier who validated
  validation_method text not null default 'qr'
    check (validation_method in ('qr', 'manual_code', 'admin_override')),
  notes text,

  -- Timestamps
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_txn_employee on public.transactions(employee_id);
create index idx_txn_date on public.transactions(transaction_date);
create index idx_txn_division on public.transactions(division_id);
create index idx_txn_employee_date on public.transactions(employee_id, transaction_date);

-- Composite index for monthly spending calculation (critical for performance)
create index idx_txn_monthly_spend on public.transactions(
  employee_id,
  transaction_date
) include (discount_amount_eur);
```

**Rationale:** The transactions table is the audit trail and the source of truth for spending limit enforcement. The composite index on `(employee_id, transaction_date)` with included `discount_amount_eur` makes monthly spending queries fast without table lookups. `validated_by` tracks who approved the discount at POS. `discount_code_id` is nullable to support admin manual overrides.

#### 8. `monthly_usage` (materialized view or computed)

```sql
-- Database function instead of materialized view (real-time accuracy)
create or replace function public.get_monthly_usage(
  p_employee_id uuid,
  p_month date default date_trunc('month', current_date)::date
)
returns table(
  total_spent numeric,
  total_discount numeric,
  transaction_count bigint,
  remaining_limit numeric
) language sql stable security definer as $$
  select
    coalesce(sum(t.original_amount_eur), 0) as total_spent,
    coalesce(sum(t.discount_amount_eur), 0) as total_discount,
    count(*) as transaction_count,
    p.monthly_limit_eur - coalesce(sum(t.discount_amount_eur), 0) as remaining_limit
  from public.profiles p
  left join public.transactions t
    on t.employee_id = p.id
    and t.transaction_date >= p_month
    and t.transaction_date < (p_month + interval '1 month')::date
  where p.id = p_employee_id
  group by p.monthly_limit_eur;
$$;
```

**Rationale:** A function rather than a materialized view because spending limits must be checked in real-time during validation. The function is `STABLE` (can be optimized by PostgreSQL) and `SECURITY DEFINER` so it can be called from Edge Functions with appropriate permissions. The composite index on `transactions` makes this query fast.

### Schema Diagram (Simplified)

```
auth.users
    |
    | 1:1 (id = id)
    v
profiles ----< employee_divisions >---- divisions
    |                                       |
    |                                       |
    +----< discount_codes                   +----< brands
    |         |                             |
    |         |                             +----< discount_rules
    |         |                                       |
    +----< transactions >-----------------------------+
```

---

## Component Architecture

### Frontend Components

| Component | Type | Responsibility | Data Source |
|-----------|------|---------------|-------------|
| **Auth Layout** | Layout (Server) | Protect routes, redirect unauthenticated | Supabase Auth |
| **Employee Dashboard** | Page (Server) | Show available discounts, usage summary | Server Component fetch |
| **Discount Browser** | Client Component | Browse discounts by division/brand, filter | Client-side state + cached data |
| **QR Generator** | Client Component | Generate QR code for selected discount | Local computation (offline-capable) |
| **Usage History** | Page (Server) | Display transaction history, remaining limit | Server Component fetch |
| **Admin Dashboard** | Page (Server) | Overview analytics, quick actions | Server Component fetch |
| **Employee Manager** | Page (Server) | CRUD employees, assign divisions | Server Actions |
| **Discount Config** | Page (Server) | Configure discount rules per division/brand | Server Actions |
| **Transaction Log** | Page (Server) | View all transactions, filter/export | Server Component fetch |
| **Validation Screen** | Client Component | Scan QR or enter manual code, validate | Edge Function call |
| **Analytics** | Page (Server) | Charts, reports, export to CSV | Server Component fetch + RPC |

### Backend Components

| Component | Technology | Responsibility |
|-----------|-----------|---------------|
| **Supabase Auth** | Supabase Auth + Custom Claims Hook | Authentication, JWT issuance with role claim |
| **RLS Policies** | PostgreSQL RLS | Row-level data isolation (employees see own data, admins see all) |
| **Server Actions** | Next.js Server Actions | Mutations (create employee, update discount rule, record transaction) |
| **Edge Function: validate-discount** | Supabase Edge Functions (Deno) | QR/code validation endpoint -- checks eligibility, limits, marks code used |
| **Database Functions** | PostgreSQL PL/pgSQL | `get_monthly_usage()`, `validate_and_record_transaction()`, `custom_access_token_hook()` |
| **Service Worker** | Custom `sw.js` (or Serwist) | Cache app shell, enable offline QR generation, queue failed requests |

### Component Communication Map

```
Employee PWA
  |
  +-- (reads) --> Supabase via Server Components (discounts, history)
  +-- (generates) --> QR Code locally (qrcode.react, no server needed)
  +-- (offline cache) --> IndexedDB (discount rules, employee profile)
  +-- (validates) --> Edge Function: validate-discount
  |
Admin Dashboard
  |
  +-- (reads) --> Supabase via Server Components (all data)
  +-- (mutates) --> Server Actions (employee CRUD, discount config)
  +-- (validates) --> Edge Function: validate-discount
  +-- (reports) --> Database Functions via RPC
```

---

## API Design

### Server Actions (Mutations)

All mutations go through Next.js Server Actions with Zod validation and Supabase auth check as the first line.

| Action | Input | Auth | Description |
|--------|-------|------|-------------|
| `createEmployee` | `{email, full_name, employee_id, divisions[], monthly_limit}` | Admin | Create auth user + profile + division assignments |
| `updateEmployee` | `{id, ...partial fields}` | Admin | Update profile, reassign divisions |
| `deactivateEmployee` | `{id}` | Admin | Set `is_active = false`, revoke active codes |
| `createDiscountRule` | `{division_id, brand_id?, name, type, value, ...}` | Admin | Create new discount rule |
| `updateDiscountRule` | `{id, ...partial fields}` | Admin | Update rule parameters |
| `generateDiscountCode` | `{discount_rule_id}` | Employee (self) | Generate single-use code, return QR payload |
| `recordTransaction` | `{code_or_id, amounts, location, ...}` | Admin (validator) | Record discount usage via admin validation screen |

### Edge Function: `validate-discount`

The core validation endpoint. Called when a cashier scans a QR code or enters a manual code.

```typescript
// POST /functions/v1/validate-discount
// Request:
{
  "code": "MPM-A3F7K2",           // from QR scan or manual entry
  "original_amount": 150.00,       // purchase amount in EUR
  "location": "Nicosia Main Store" // optional
}

// Response (success):
{
  "valid": true,
  "employee": { "name": "John Doe", "employee_id": "MPM-0042" },
  "discount": {
    "rule_name": "CPD Employee Discount",
    "division": "Consumer Products",
    "percentage": 20,
    "discount_amount": 30.00,
    "final_amount": 120.00
  },
  "limits": {
    "monthly_limit": 200.00,
    "used_this_month": 85.00,
    "remaining_after": 85.00  // 200 - 85 - 30
  },
  "transaction_id": "uuid-of-recorded-txn"
}

// Response (failure):
{
  "valid": false,
  "reason": "monthly_limit_exceeded" | "code_expired" | "code_already_used"
            | "employee_inactive" | "division_not_eligible" | "invalid_code",
  "details": "Employee has EUR 15.00 remaining this month but discount would be EUR 30.00"
}
```

**Validation logic (in order):**

1. Look up code in `discount_codes` table
2. Check code status is `'active'` and not expired
3. Check employee `is_active = true`
4. Check employee has access to the discount's division (via `employee_divisions`)
5. Fetch discount rule, calculate discount amount
6. Check monthly spending limit: `get_monthly_usage()` + proposed discount <= limit
7. If all pass: mark code as `'used'`, insert transaction, return success
8. If any fail: return failure with specific reason

**Critical:** Steps 6-7 must be atomic (use a database transaction or a single PL/pgSQL function) to prevent race conditions where two validations pass simultaneously and exceed the limit.

```sql
-- Database function for atomic validation + recording
create or replace function public.validate_and_record_transaction(
  p_code text,
  p_original_amount numeric,
  p_location text default null,
  p_validated_by uuid default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_code record;
  v_employee record;
  v_rule record;
  v_monthly_usage numeric;
  v_discount_amount numeric;
  v_txn_id uuid;
begin
  -- Lock the code row to prevent concurrent validation
  select * into v_code from public.discount_codes
    where code = p_code
    for update;

  if v_code is null then
    return jsonb_build_object('valid', false, 'reason', 'invalid_code');
  end if;

  if v_code.status != 'active' then
    return jsonb_build_object('valid', false, 'reason', 'code_already_used');
  end if;

  if v_code.expires_at < now() then
    update public.discount_codes set status = 'expired' where id = v_code.id;
    return jsonb_build_object('valid', false, 'reason', 'code_expired');
  end if;

  -- Check employee
  select * into v_employee from public.profiles
    where id = v_code.employee_id;

  if not v_employee.is_active then
    return jsonb_build_object('valid', false, 'reason', 'employee_inactive');
  end if;

  -- Check discount rule
  select * into v_rule from public.discount_rules
    where id = v_code.discount_rule_id
    and is_active = true
    and valid_from <= current_date
    and (valid_until is null or valid_until >= current_date);

  if v_rule is null then
    return jsonb_build_object('valid', false, 'reason', 'discount_rule_inactive');
  end if;

  -- Check division eligibility
  if not exists (
    select 1 from public.employee_divisions
    where employee_id = v_code.employee_id
    and division_id = v_rule.division_id
  ) then
    return jsonb_build_object('valid', false, 'reason', 'division_not_eligible');
  end if;

  -- Calculate discount
  if v_rule.discount_type = 'percentage' then
    v_discount_amount := p_original_amount * (v_rule.discount_value / 100.0);
  else
    v_discount_amount := v_rule.discount_value;
  end if;

  -- Apply per-transaction cap if exists
  if v_rule.max_discount_eur is not null and v_discount_amount > v_rule.max_discount_eur then
    v_discount_amount := v_rule.max_discount_eur;
  end if;

  -- Check monthly limit
  select coalesce(sum(discount_amount_eur), 0) into v_monthly_usage
    from public.transactions
    where employee_id = v_code.employee_id
    and transaction_date >= date_trunc('month', current_date)::date;

  if (v_monthly_usage + v_discount_amount) > v_employee.monthly_limit_eur then
    return jsonb_build_object(
      'valid', false,
      'reason', 'monthly_limit_exceeded',
      'details', format('Remaining: EUR %.2f, Discount: EUR %.2f',
        v_employee.monthly_limit_eur - v_monthly_usage, v_discount_amount)
    );
  end if;

  -- All checks passed -- record transaction atomically
  update public.discount_codes
    set status = 'used', used_at = now()
    where id = v_code.id;

  insert into public.transactions (
    employee_id, discount_rule_id, discount_code_id, division_id, brand_id,
    original_amount_eur, discount_amount_eur, final_amount_eur,
    location, validated_by, validation_method, transaction_date
  ) values (
    v_code.employee_id, v_rule.id, v_code.id, v_rule.division_id, v_rule.brand_id,
    p_original_amount, v_discount_amount, p_original_amount - v_discount_amount,
    p_location, p_validated_by, 'qr', current_date
  ) returning id into v_txn_id;

  return jsonb_build_object(
    'valid', true,
    'transaction_id', v_txn_id,
    'employee', jsonb_build_object('name', v_employee.full_name, 'employee_id', v_employee.employee_id),
    'discount', jsonb_build_object(
      'rule_name', v_rule.name,
      'percentage', v_rule.discount_value,
      'discount_amount', v_discount_amount,
      'final_amount', p_original_amount - v_discount_amount
    ),
    'limits', jsonb_build_object(
      'monthly_limit', v_employee.monthly_limit_eur,
      'used_this_month', v_monthly_usage + v_discount_amount,
      'remaining', v_employee.monthly_limit_eur - v_monthly_usage - v_discount_amount
    )
  );
end;
$$;
```

### Read Patterns (Server Components)

| Query | Used By | Implementation |
|-------|---------|---------------|
| List available discounts for employee | Employee Dashboard | Server Component: fetch `discount_rules` joined with `employee_divisions` for current user |
| Employee usage history | Employee History | Server Component: fetch `transactions` where `employee_id = auth.uid()` |
| Monthly usage summary | Employee Dashboard | RPC call to `get_monthly_usage()` |
| All employees list | Admin Employee Manager | Server Component: fetch `profiles` (admin RLS allows all) |
| All transactions | Admin Transaction Log | Server Component: fetch `transactions` with joins (admin RLS) |
| Analytics aggregates | Admin Analytics | RPC calls to custom database functions |

---

## QR Code Flow

### Generation (Client-Side, Offline-Capable)

```
Employee selects discount
        |
        v
Server Action: generateDiscountCode()
  - Creates row in discount_codes table
  - Returns { code: "MPM-A3F7K2", qr_payload: {...}, expires_at: ... }
        |
        v
Client receives code
  - Stores in IndexedDB (for offline display)
  - Renders QR using qrcode.react
        |
        v
QR encodes JSON payload:
{
  "c": "MPM-A3F7K2",     // code (compact key)
  "e": "MPM-0042",        // employee ID
  "d": "CPD",             // division code
  "x": 1738800000         // expiry unix timestamp
}
```

**Offline QR display:** Once a code is generated (requires connectivity), the QR can be displayed offline from IndexedDB cache. The QR image itself is rendered client-side by `qrcode.react` -- no server needed.

**Library choice:** `qrcode.react` v4.x -- built-in TypeScript types, SVG rendering (sharp on all screens), zero runtime dependencies, 100% client-side computation. HIGH confidence (verified via npm registry and GitHub, 2M+ weekly downloads).

### Validation (Requires Connectivity)

```
Cashier/Admin scans QR or enters code manually
        |
        v
Admin Validation Screen parses QR payload
  - Extracts code, shows employee preview
        |
        v
Calls Edge Function: validate-discount
  - Sends: { code, original_amount, location }
        |
        v
Edge Function calls DB function: validate_and_record_transaction()
  - Atomic: check eligibility + limits + record in single transaction
  - Uses SELECT ... FOR UPDATE to prevent race conditions
        |
        v
Returns validation result to Admin screen
  - Success: shows discount applied, receipt details
  - Failure: shows specific reason (expired, over limit, etc.)
```

**QR scanning:** Use the device camera via `html5-qrcode` or `@zxing/browser` library. These run entirely in the browser. The admin validation screen needs a camera-capable device or falls back to manual code entry.

---

## Offline Strategy

### What Works Offline

| Feature | Offline? | How |
|---------|----------|-----|
| View app (shell) | YES | Service worker caches app shell (HTML, JS, CSS) |
| Browse discounts | YES | Discount rules cached in IndexedDB on last sync |
| Display previously generated QR | YES | Code + QR payload stored in IndexedDB |
| View usage history | YES | Last-fetched history cached in IndexedDB |
| Generate NEW discount code | NO | Requires server to create code in database |
| Validate a discount code | NO | Requires real-time limit check against database |
| Admin CRUD operations | NO | Mutations require server connectivity |

### Architecture Layers

```
Layer 1: Service Worker (sw.js)
  - Caches app shell (Next.js static assets, HTML routes)
  - Cache strategy: NetworkFirst for API, CacheFirst for static assets
  - Serves fallback offline page when no cache hit

Layer 2: IndexedDB (via idb library)
  - Stores: employee profile, discount rules, active codes, recent transactions
  - Updated on every successful server fetch (write-through cache)
  - Read from IndexedDB when offline

Layer 3: Network Detection Hook
  - useOnlineStatus() hook monitors navigator.onLine + fetch probe
  - UI adapts: shows "offline" badge, disables generation/validation buttons
  - Queues sync when connectivity returns (for non-critical updates)
```

### Service Worker Strategy

Use a custom `public/sw.js` (not next-pwa, which has App Router compatibility issues). Alternatively, use **Serwist** which Next.js officially recommends and has proper App Router support.

```javascript
// Simplified sw.js strategy
const CACHE_NAME = 'mpm-v1';
const OFFLINE_URL = '/offline';

// Cache app shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/offline',
        '/employee/dashboard',
        // Static assets auto-cached by build
      ])
    )
  );
});

// Network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    // Network first -- fall back to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
```

### IndexedDB Schema

```typescript
// Using idb library for clean Promise-based API
interface MPMDatabase {
  profile: {
    key: string;       // 'current'
    value: EmployeeProfile;
  };
  discountRules: {
    key: string;       // rule UUID
    value: DiscountRule;
    indexes: { 'by-division': string };
  };
  activeCodes: {
    key: string;       // code string
    value: DiscountCode;
    indexes: { 'by-expiry': number };
  };
  recentTransactions: {
    key: string;       // transaction UUID
    value: Transaction;
    indexes: { 'by-date': string };
  };
  syncMeta: {
    key: string;       // 'lastSync'
    value: { timestamp: number; version: number };
  };
}
```

**Sync pattern:** On every page load (when online), fetch fresh data and update IndexedDB. When offline, read from IndexedDB. No write-back queue needed because all mutations (code generation, validation) require real-time server interaction for data integrity.

---

## Security Model

### Authentication

- **Supabase Auth** with email/password (primary)
- Admin creates employee accounts -- no self-registration
- Custom Access Token Hook injects `user_role` claim into JWT

```sql
-- Custom Access Token Hook
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  user_role text;
begin
  select role into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  else
    claims := jsonb_set(claims, '{user_role}', '"employee"');
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
```

### Row Level Security Policies

Every table has RLS enabled. Policies follow this pattern:

```sql
-- profiles: employees see own, admins see all
alter table public.profiles enable row level security;

create policy "Employees read own profile"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or (auth.jwt() ->> 'user_role') = 'admin'
  );

create policy "Admins manage all profiles"
  on public.profiles for all
  to authenticated
  using ((auth.jwt() ->> 'user_role') = 'admin')
  with check ((auth.jwt() ->> 'user_role') = 'admin');

-- transactions: employees see own, admins see all
alter table public.transactions enable row level security;

create policy "Employees read own transactions"
  on public.transactions for select
  to authenticated
  using (
    employee_id = auth.uid()
    or (auth.jwt() ->> 'user_role') = 'admin'
  );

create policy "Only system can insert transactions"
  on public.transactions for insert
  to authenticated
  using ((auth.jwt() ->> 'user_role') = 'admin');

-- discount_rules: all authenticated can read, admins can mutate
alter table public.discount_rules enable row level security;

create policy "All authenticated read discount rules"
  on public.discount_rules for select
  to authenticated
  using (true);

create policy "Admins manage discount rules"
  on public.discount_rules for all
  to authenticated
  using ((auth.jwt() ->> 'user_role') = 'admin')
  with check ((auth.jwt() ->> 'user_role') = 'admin');

-- discount_codes: employees see own, admins see all
alter table public.discount_codes enable row level security;

create policy "Employees manage own codes"
  on public.discount_codes for select
  to authenticated
  using (
    employee_id = auth.uid()
    or (auth.jwt() ->> 'user_role') = 'admin'
  );

create policy "Employees generate own codes"
  on public.discount_codes for insert
  to authenticated
  with check (employee_id = auth.uid());
```

### Discount Code Security

- Codes are **single-use** -- status changes to `'used'` atomically during validation
- Codes **expire** within 24 hours of generation
- Codes are **8-character alphanumeric** with `MPM-` prefix for easy verbal communication
- QR payload includes employee ID for cross-verification
- Validation uses `SELECT ... FOR UPDATE` to prevent concurrent use
- The `validate_and_record_transaction` function runs as `SECURITY DEFINER` so it bypasses RLS and executes with elevated permissions -- this is intentional because the function enforces its own security checks

### Server Action Security

Every Server Action follows this pattern:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  // ... validation
})

export async function createEmployee(input: unknown) {
  // 1. Auth check FIRST
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')

  // 3. Input validation
  const validated = schema.parse(input)

  // 4. Execute mutation
  // ...
}
```

---

## Future POS Integration Extensibility

### Design for POS Without Building POS

The architecture anticipates Business Center Cloud API integration without coupling to it:

**1. Transaction recording is abstracted.** The `transactions` table stores all discount usage regardless of source. A future POS adapter would insert transactions through the same `validate_and_record_transaction()` function.

**2. Validation method is tracked.** The `validation_method` column (`'qr'`, `'manual_code'`, `'admin_override'`) can be extended with `'pos_api'` when POS integration arrives.

**3. Edge Function as API gateway.** The `validate-discount` Edge Function already acts as an HTTP API. A POS system could call this same endpoint directly, providing the code and purchase amount.

**4. Webhook support.** Add an `external_events` table later for receiving POS webhooks:

```sql
-- Future: POS integration table
create table public.external_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                -- 'business_center_cloud'
  event_type text not null,            -- 'transaction_completed'
  payload jsonb not null,
  processed boolean default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz default now()
);
```

**5. No POS-specific code in v1.** The architecture is extensible without premature abstraction. When POS integration comes, add:
- A new Edge Function `pos-webhook` that receives events from Business Center Cloud
- An adapter module that maps POS data to the existing transaction format
- An `external_events` table for idempotent processing

---

## Build Order

The build order follows dependency chains -- each phase depends on what came before.

### Phase 1: Foundation (Database + Auth + Core UI Shell)

**Build:**
- Supabase project setup
- Database schema (all tables, indexes, RLS policies)
- Custom Access Token Hook for RBAC
- Supabase Auth integration in Next.js
- Basic app shell with role-based routing

**Why first:** Everything else depends on the data model and auth. Getting RLS right early prevents security retrofitting.

**Dependencies:** None (greenfield)

### Phase 2: Admin Core (Employee + Discount Management)

**Build:**
- Admin dashboard layout
- Employee CRUD (create accounts, assign divisions, set limits)
- Discount rule configuration (per-division, per-brand)
- Basic data tables with filtering

**Why second:** Admins must configure employees and discount rules before employees can use the system. This is the "control plane."

**Dependencies:** Phase 1 (schema, auth, RLS)

### Phase 3: Employee Core (Discount Browsing + QR Generation)

**Build:**
- Employee dashboard with available discounts
- Discount browsing by division/brand
- QR code generation (`qrcode.react`)
- Manual code display
- Usage history view

**Why third:** Employees need to see discounts and generate codes. Depends on discount rules existing (Phase 2).

**Dependencies:** Phase 2 (discount rules, employee accounts)

### Phase 4: Validation Engine (QR Scan + Limit Enforcement)

**Build:**
- `validate_and_record_transaction()` database function
- `validate-discount` Edge Function
- Admin validation screen (camera scan + manual entry)
- Monthly limit enforcement
- Transaction recording

**Why fourth:** Validation is the core value -- "employee gets discount at POS." It depends on codes existing (Phase 3) and rules configured (Phase 2).

**Dependencies:** Phase 3 (discount codes), Phase 2 (rules), Phase 1 (schema)

### Phase 5: PWA + Offline

**Build:**
- Service worker for app shell caching
- Web app manifest for installability
- IndexedDB caching layer for offline browsing
- Online/offline detection and UI adaptation
- Install prompt component

**Why fifth:** PWA is a polish layer. The core system must work online first. Adding offline support on top is safer than building offline-first from scratch.

**Dependencies:** Phase 3 (employee views to cache), Phase 4 (validation to queue)

### Phase 6: Analytics + Reporting

**Build:**
- Admin analytics dashboard (charts, summaries)
- Per-employee spending reports
- Per-division usage reports
- CSV export
- Date range filtering

**Why last:** Analytics reads from transactions (Phase 4). It is valuable but not blocking for the demo.

**Dependencies:** Phase 4 (transaction data to report on)

### Dependency Graph

```
Phase 1: Foundation
    |
    v
Phase 2: Admin Core
    |
    v
Phase 3: Employee Core
    |
    v
Phase 4: Validation Engine
    |         |
    v         v
Phase 5    Phase 6
(PWA)      (Analytics)
```

Phases 5 and 6 are independent of each other and can be built in parallel.

---

## Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| QR generation | `qrcode.react` v4.x | React-native component, TypeScript, SVG+Canvas, 2M+ weekly downloads, zero deps |
| QR scanning | `html5-qrcode` | Browser camera API, works on mobile, MIT license |
| PWA service worker | Custom `sw.js` or Serwist | Next.js officially recommends Serwist; custom SW gives full control |
| Offline storage | `idb` (IndexedDB wrapper) | Promise-based, lightweight, well-maintained |
| Validation endpoint | Supabase Edge Function calling PL/pgSQL | Atomic transaction, low latency, globally distributed |
| RBAC | Custom Access Token Hook + JWT claims | No subquery needed in RLS policies -- performance at scale |
| Code format | 8-char alphanumeric with `MPM-` prefix | Short enough to read verbally, prefix identifies system |
| Monthly limit check | Database function with `FOR UPDATE` lock | Prevents race conditions, atomic with transaction recording |

---

## Sources

### HIGH Confidence (Official Documentation)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Edge Functions: Connect to Postgres](https://supabase.com/docs/guides/functions/connect-to-postgres)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [qrcode.react on npm](https://www.npmjs.com/package/qrcode.react)
- [qrcode.react on GitHub](https://github.com/zpao/qrcode.react)

### MEDIUM Confidence (Verified with Official Sources)
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)
- [Building Offline-First PWA with Next.js, IndexedDB, and Supabase](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9)
- [Offline-First PWA with Next.js & IndexedDB](https://www.wellally.tech/blog/build-offline-first-pwa-nextjs-indexeddb)
- [Transactions and RLS in Supabase Edge Functions](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html)

### LOW Confidence (WebSearch Only, Needs Validation)
- [POS API Integration Patterns (Shopify)](https://www.shopify.com/retail/pos-api-integrations) -- general patterns, not specific to Business Center Cloud
- [Microsoft Dynamics POS API patterns](https://learn.microsoft.com/en-us/dynamics365/commerce/dev-itpro/pos-apis) -- reference architecture only
