---
phase: 01-foundation
plan: 01
subsystem: infrastructure
tags: [nextjs, supabase, auth, middleware, database, rls, typescript]
dependency-graph:
  requires: []
  provides: [next-app, supabase-clients, auth-middleware, profiles-table, rls-policies, access-token-hook]
  affects: [01-02, 01-03, 01-04, 02-01]
tech-stack:
  added: [next@15.5.11, react@19.1.0, "@supabase/supabase-js@2.94.0", "@supabase/ssr@0.8.0", jwt-decode@4.0.0, zod@4.3.6, tailwindcss@4, typescript@5]
  patterns: [supabase-ssr-auth, cookie-based-sessions, getUser-not-getSession, rls-same-migration, custom-access-token-hook, security-definer-triggers]
key-files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - eslint.config.mjs
    - .env.local
    - .env.example
    - .gitignore
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/globals.css
    - src/lib/supabase/client.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/supabase/middleware.ts
    - src/middleware.ts
    - supabase/migrations/00001_foundation.sql
  modified: []
decisions:
  - id: use-async-cookies
    decision: "Use await cookies() throughout (Next.js 15 async API)"
    rationale: "Required for Next.js 15; forward-compatible with Next.js 16"
  - id: getuser-over-getsession
    decision: "Use getUser() for all server-side auth checks, never getSession()"
    rationale: "getSession() does not validate the JWT; security requirement"
  - id: service-role-no-next-public
    decision: "SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix"
    rationale: "Prevents exposure of service role key to browser"
  - id: rls-same-migration
    decision: "Enable RLS in same migration as CREATE TABLE"
    rationale: "Prevents window where table exists without RLS protection"
metrics:
  duration: "~15 minutes"
  completed: "2026-02-04"
---

# Phase 1 Plan 1: Project Scaffolding + Supabase Foundation Summary

**Next.js 15.5.11 app with Supabase SSR auth infrastructure, three client utilities, middleware for token refresh, and complete foundation SQL migration (profiles, RLS, triggers, custom access token hook).**

## What Was Done

### Task 1: Scaffold Next.js 15 project and install dependencies
- Scaffolded Next.js 15.5.11 with React 19, TypeScript, Tailwind CSS 4, ESLint
- Installed runtime deps: @supabase/supabase-js, @supabase/ssr, jwt-decode, zod
- Created `.env.local` with Supabase placeholder config (gitignored)
- Created `.env.example` for documentation
- Comprehensive `.gitignore` covering env files, node_modules, .next, Windows artifacts
- Cleaned up default page.tsx to show "MPM Employee Discount Platform" heading
- Updated metadata in layout.tsx

### Task 2: Create Supabase client utilities, middleware, and database migration
- **Browser client** (`src/lib/supabase/client.ts`): Uses `createBrowserClient` from `@supabase/ssr`
- **Server client** (`src/lib/supabase/server.ts`): Uses `createServerClient` with `await cookies()` (Next.js 15 async API), try/catch on setAll for Server Component compatibility
- **Admin client** (`src/lib/supabase/admin.ts`): Uses `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` (no NEXT_PUBLIC_ prefix), disables auto-refresh and session persistence
- **Middleware utility** (`src/lib/supabase/middleware.ts`): `updateSession()` creates server client from request cookies, calls `getUser()` (NOT getSession), redirects unauthenticated users to `/login` except auth pages
- **Root middleware** (`src/middleware.ts`): Calls `updateSession`, matcher excludes static assets
- **Foundation SQL migration** (`supabase/migrations/00001_foundation.sql`):
  - `app_role` enum (admin, employee)
  - `profiles` table (UUID FK to auth.users, role, first_name, last_name, is_active, timestamps)
  - RLS enabled immediately after table creation
  - 4 RLS policies (user view own, admin view all, admin insert, admin update)
  - `handle_new_user()` trigger function (SECURITY DEFINER, search_path = '')
  - `on_auth_user_created` trigger on auth.users
  - `handle_updated_at()` trigger for auto-updating updated_at
  - `custom_access_token_hook()` function (STABLE, embeds user_role in JWT)
  - GRANT/REVOKE permissions for supabase_auth_admin
  - Policy for auth admin to read profiles

## Verification Results

| Check | Result |
|-------|--------|
| `npm run dev` starts | PASS -- Ready in 2.1s, middleware compiled |
| `npx tsc --noEmit` | PASS -- zero errors |
| All 4 Supabase utility files exist | PASS |
| `src/middleware.ts` calls `updateSession` | PASS |
| SQL migration exists with RLS | PASS |
| `.env.local` has correct var names | PASS -- no NEXT_PUBLIC_ on service role key |
| `.gitignore` includes `.env.local` | PASS |
| Migration has `custom_access_token_hook` | PASS |
| Migration has `handle_new_user` trigger | PASS |
| Middleware uses `getUser()` not `getSession()` | PASS |
| Server client uses `await cookies()` | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Use async cookies() pattern**: Forward-compatible with both Next.js 15 and 16
2. **getUser() over getSession()**: Security requirement -- getSession doesn't validate JWT
3. **Service role key without NEXT_PUBLIC_ prefix**: Prevents browser exposure
4. **RLS enabled in same migration as CREATE TABLE**: No security gap window

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| SWC version mismatch warning (15.5.7 vs 15.5.11) | Non-blocking; cosmetic warning from cached SWC binary |
| Placeholder env vars won't connect to Supabase | Expected -- user must configure real values before auth testing |
| Custom Access Token Hook requires dashboard enablement | Documented in plan frontmatter under user_setup |

## Next Phase Readiness

**Ready for 01-02 (Auth pages and Server Actions)**. All prerequisites met:
- Supabase clients are importable and typed
- Middleware is wired for token refresh
- SQL migration is ready to run against a Supabase project
- Route structure is ready for `(auth)`, `(dashboard)`, `(admin)` route groups

**User action required before auth testing:**
1. Create Supabase project and set real values in `.env.local`
2. Run the SQL migration against the Supabase project
3. Enable Custom Access Token Hook in Supabase Dashboard
