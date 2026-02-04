# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Employees get instant, trackable discounts across all MPM brands and locations -- replacing a manual, untrackable process.
**Current focus:** Phase 1 COMPLETE (verified 5/5). Ready for Phase 2 - Admin Core.

## Current Position

Phase: 1 of 6 (Foundation) -- COMPLETE
Plan: 4 of 4 in current phase (all done)
Status: Phase complete
Last activity: 2026-02-04 -- Completed 01-04-PLAN.md (Push & Deploy)

Progress: [████░░░░░░] ~33% (4 of ~12 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~12 minutes
- Total execution time: ~0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 4/4 | ~49m | ~12m |

**Recent Trend:**
- Last 5 plans: 01-01 (~15m), 01-02 (~6m), 01-03 (~10m), 01-04 (~18m)
- Trend: Consistent (~12m avg), 01-04 took longer due to Vercel build debugging

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6 phases derived from 31 requirements across 6 categories
- [Roadmap]: Phases 5 and 6 (PWA + Analytics) can execute in parallel after Phase 4
- [Roadmap]: Demo milestone = Phase 4 completion (full employee-to-cashier flow)
- [01-01]: Use await cookies() throughout (Next.js 15 async API, forward-compatible with 16)
- [01-01]: Use getUser() for all server-side auth checks, never getSession()
- [01-01]: SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix
- [01-01]: Enable RLS in same migration as CREATE TABLE
- [01-02]: Use React 19 useActionState (not deprecated useFormState from react-dom)
- [01-02]: Generic auth errors only -- never expose Supabase internals to client
- [01-02]: Anti-email enumeration on password reset (always returns success)
- [01-02]: Premium dark theme (#0A0A0B bg, #D4A853 gold accent) for auth pages
- [01-04]: Pin Tailwind CSS to v4.0.17 (v4.1.x has build bug on Vercel Linux)
- [01-04]: Remove --turbopack from build script (keep for dev only)
- [01-04]: Place favicon.ico in public/ not src/app/

### Pending Todos

- User must configure real Supabase env vars in .env.local before auth testing
- User must run SQL migration against Supabase project
- User must enable Custom Access Token Hook in Supabase Dashboard
- User must set NEXT_PUBLIC_SITE_URL in .env.local for password reset redirects
- User must set Vercel environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL)

### Blockers/Concerns

- [Research]: Phase 5 (PWA) -- Serwist + Next.js 15 App Router integration is recent (2025). Light validation needed during planning.
- [Research]: Confirm Cyprus retail connectivity profile with stakeholder during Phase 5 planning.
- [01-01]: SWC version mismatch warning (15.5.7 vs 15.5.11) -- non-blocking, cosmetic
- [01-04]: Tailwind pinned to v4.0.17. Monitor for v4.1.x fix to upgrade later.

## Key Links

- GitHub: https://github.com/Qualiasolutions/mpm
- Vercel: https://mpm-iota.vercel.app (deployment protection enabled)
- Vercel Dashboard: https://vercel.com/qualiasolutionscy/mpm

## Session Continuity

Last session: 2026-02-04 14:47 UTC
Stopped at: Completed 01-04-PLAN.md -- Phase 1 fully complete
Resume file: None
