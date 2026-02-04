---
phase: 01-foundation
plan: 04
subsystem: deployment
tags: [github, vercel, deployment, tailwind-fix, production]
dependency-graph:
  requires: [01-01, 01-02, 01-03]
  provides: [github-repo, vercel-deployment, production-url]
  affects: [02-01]
tech-stack:
  added: []
  patterns: [vercel-cli-deploy, tailwind-v4-pinning]
key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - public/favicon.ico (moved from src/app/)
    - src/app/globals.css
decisions:
  - id: tailwind-pin-v4017
    decision: "Pin Tailwind CSS to v4.0.17 instead of ^4"
    rationale: "Tailwind v4.1.x has a bug causing 'Invalid code point' error on Vercel Linux build environment. 4.0.17 is stable."
  - id: favicon-in-public
    decision: "Place favicon.ico in public/ instead of src/app/"
    rationale: "Prevents Tailwind from scanning binary files during PostCSS processing"
  - id: no-turbopack-build
    decision: "Remove --turbopack from build script (keep for dev)"
    rationale: "Turbopack build mode has PostCSS/Tailwind v4 compatibility issues"
metrics:
  duration: "~18 minutes"
  completed: "2026-02-04"
---

# Phase 1 Plan 4: Push & Deploy Summary

**All Phase 1 code pushed to GitHub (Qualiasolutions/mpm), deployed to Vercel production at mpm-iota.vercel.app after fixing Tailwind v4.1.x build bug by pinning to v4.0.17.**

## What Was Done

### Task 1: Commit and push to GitHub
- Staged remaining Phase 1 files: updated ROADMAP.md, 01-04-PLAN.md, favicon.ico
- Verified `.env.local`, `nul`, and `node_modules/` are all gitignored
- Committed and pushed all 16 commits (12 prior + 4 new) to `Qualiasolutions/mpm` on GitHub
- Remote: `https://github.com/Qualiasolutions/mpm.git`

### Task 2: Deploy to Vercel
- Vercel CLI v50.1.0 already installed and project linked (`qualiasolutionscy/mpm`)
- **Build failure**: Tailwind v4.1.18 `markUsedVariable` function threw `RangeError: Invalid code point 11945233` on Vercel Linux build environment
- **Root cause**: Tailwind v4.1.x regression in the CSS variable scanning code that only manifests on Vercel's Linux build (works fine locally on Windows)
- **Fix applied**: Pinned `tailwindcss` and `@tailwindcss/postcss` to `4.0.17` (last stable v4.0.x)
- **Additional fixes**: Removed `--turbopack` from build script, moved favicon.ico to `public/`
- Deployment succeeded with `--force` (no cache) after pinning
- Production URL: `https://mpm-iota.vercel.app`
- Deployment aliases: `mpm-qualiasolutionscy.vercel.app`, `mpm-qualiasolutions-qualiasolutionscy.vercel.app`

**Note**: Vercel deployment protection (team SSO) is enabled, so URLs return 401 for unauthenticated requests. This is expected -- the app is accessible when logged into the Vercel team dashboard.

**Note**: Environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL) are NOT yet configured on Vercel. The app will not fully function until these are set via `vercel env add` or the Vercel dashboard.

## Verification Results

| Check | Result |
|-------|--------|
| `git status` shows clean working tree | PASS |
| `git log --oneline -1` shows latest commit | PASS |
| GitHub repo has latest code | PASS |
| `.env.local` NOT in any commit | PASS |
| No secrets in git history | PASS |
| Vercel deployment status "Ready" | PASS |
| Production URL returns response | PASS (401 from deployment protection) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tailwind v4.1.18 build failure on Vercel**
- **Found during:** Task 2
- **Issue:** `RangeError: Invalid code point 11945233` in Tailwind's `markUsedVariable` during PostCSS processing on Vercel's Linux build environment
- **Fix:** Pinned `tailwindcss` and `@tailwindcss/postcss` to `4.0.17`
- **Files modified:** `package.json`, `package-lock.json`
- **Commits:** `d96b8fd`, `e01a053`, `3d51e9b`, `e770e41`

**2. [Rule 3 - Blocking] Build script incompatibility**
- **Found during:** Task 2
- **Issue:** `next build --turbopack` caused additional PostCSS errors on Vercel
- **Fix:** Removed `--turbopack` from build script (kept for dev)
- **Files modified:** `package.json`
- **Commit:** `d96b8fd`

**3. [Rule 3 - Blocking] Favicon location causing Tailwind scan issues**
- **Found during:** Task 2
- **Issue:** `src/app/favicon.ico` was in Tailwind's auto-scan path
- **Fix:** Moved to `public/favicon.ico` (standard Next.js static asset location)
- **Files modified:** `public/favicon.ico` (created), `src/app/favicon.ico` (removed)
- **Commit:** `3d51e9b`

## Commits

| Hash | Message |
|------|---------|
| `6f74f00` | chore(01-04): stage remaining Phase 1 artifacts |
| `d96b8fd` | fix(01-04): remove --turbopack from build script |
| `e01a053` | fix(01-04): add Tailwind source directives to exclude binary files |
| `3d51e9b` | fix(01-04): move favicon to public/ and fix Vercel build |
| `e770e41` | fix(01-04): pin Tailwind to v4.0.17 to fix Vercel build |

## Pending User Actions

1. **Set Vercel environment variables** (required for app to function):
   ```bash
   npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
   npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
   npx vercel env add NEXT_PUBLIC_SITE_URL production
   ```
2. After setting env vars, redeploy: `npx vercel --prod`
3. Consider disabling deployment protection for public access (or add custom domain)

## Next Phase Readiness

**Phase 1 Foundation is COMPLETE.** Ready for Phase 2 (Discount Engine).

All Phase 1 deliverables:
1. Next.js 15 project with Supabase integration
2. Database migration with profiles, RLS policies, access token hook
3. Auth pages: login, password reset, update password
4. Role-based route groups with server-side auth guards
5. Admin employee creation flow
6. Code on GitHub, deployed to Vercel production
