# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MPM Employee Discount Platform — a PWA where company employees receive and redeem discount codes at retail stores. Admins manage employees, divisions, discount rules, and validate codes at POS. Employees view their discounts, generate time-limited codes (QR + manual), and track spending.

## Commands

```bash
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

No test framework is configured.

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `NEXT_PUBLIC_SITE_URL` — App URL (used in auth callbacks)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only admin key

## Architecture

**Next.js 15 App Router** with route groups for role-based layouts:

- `(auth)/` — Login, password reset (public routes)
- `(admin)/admin/` — Admin panel: employees, divisions, discounts, analytics, validation terminal
- `(dashboard)/` — Employee dashboard: discount list, code generator, spending summary, transaction history

**Root page** (`/`) acts as a router — redirects to `/admin` or `/dashboard` based on the user's JWT role claim.

### Auth & Route Protection

1. **Middleware** (`src/lib/supabase/middleware.ts`) runs on every request — validates JWT via `getUser()` (never `getSession()`), redirects unauthenticated users to `/login`
2. **Admin layout** does a server-side role check — non-admins get redirected to `/access-denied`
3. **Roles** are embedded in JWT via a Postgres trigger (`custom_access_token_hook`) that reads `profiles.role`

Two roles: `admin` and `employee`.

### Supabase Clients (3 variants)

| Client | File | Use |
|--------|------|-----|
| Server | `lib/supabase/server.ts` | Server Components & Actions (anon key, cookie-based session) |
| Browser | `lib/supabase/client.ts` | Client Components (anon key, browser context) |
| Admin | `lib/supabase/admin.ts` | Server Actions only (service role key, bypasses RLS) |

**Never import the admin client in client code.**

### Server Actions (`src/actions/`)

All data mutations go through `'use server'` actions with Zod validation. Pattern:

- Validate input with `safeParse()`
- Check auth via `supabase.auth.getUser()` — admin actions use a `requireAdmin()` helper
- Return `ActionState` (`{ error?, success?, message? } | null`)
- Critical operations use Supabase RPC functions for atomicity

Key action files:
- `auth.ts` — login, logout, password reset/update
- `admin.ts` — employee CRUD, divisions, discount rules, CSV import
- `employee.ts` — discount code generation, code lookup, spending/transactions
- `validation.ts` — code validation & redemption (calls `validate_and_redeem_code` RPC)
- `analytics.ts` — reports, exports, trends

### Discount Code Flow

1. Employee generates a code → RPC `generate_manual_code()` creates `MPM-XXXXXX` + QR payload
2. Code expires after **90 seconds**
3. Admin scans QR or enters manual code at validation terminal
4. RPC `validate_and_redeem_code()` atomically: checks expiry, employee status, monthly spending limit → creates transaction + marks code as `used`

### Spending Limits

- Per-employee override: `profiles.monthly_spending_limit`
- Global fallback: `app_settings.default_monthly_spending_limit`
- Calculated via RPC `get_employee_monthly_spending()` — sums `transactions.final_amount` for the current month

### Database (Supabase)

Migrations in `supabase/migrations/` (4 files, applied in order):
1. `00001_foundation.sql` — profiles, RLS, auth trigger
2. `00002_admin_core.sql` — divisions, brands, discount rules
3. `00003_employee_experience.sql` — discount codes, transactions
4. `00004_validation_engine.sql` — RPC functions for validation

Key tables: `profiles`, `divisions`, `brands`, `employee_divisions`, `discount_rules`, `discount_codes`, `transactions`, `app_settings`

**RLS is enabled on all tables.** Policies use `auth.uid()` for row-level isolation.

### PWA (Serwist)

- Service worker: `src/sw.ts` → compiled to `public/sw.js`
- Disabled in development (`next.config.ts`)
- Precaches static assets, uses `navigationPreload` + `defaultCache`
- Install prompt component shown to employees on dashboard

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Types**: All entity types defined in `src/types/index.ts`
- **Styling**: Tailwind CSS 4 with a light theme + teal accent palette
- **Validation**: Zod schemas inline in action files (not extracted)
- **`discount_rules`** may arrive from PostgREST as either an object or an array — handle both shapes (see latest commit)
