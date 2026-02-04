---
phase: 01-foundation
plan: 02
subsystem: authentication
tags: [auth, server-actions, supabase, pkce, zod, react-19, useActionState, dark-theme]
dependency-graph:
  requires: [01-01]
  provides: [auth-pages, auth-server-actions, pkce-callback, email-confirm, logout]
  affects: [01-03, 01-04, 02-01]
tech-stack:
  added: []
  patterns: [useActionState-react-19, progressive-enhancement-forms, generic-error-messages, anti-email-enumeration]
key-files:
  created:
    - src/actions/auth.ts
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/reset-password/page.tsx
    - src/app/(auth)/update-password/page.tsx
    - src/app/auth/callback/route.ts
    - src/app/auth/confirm/route.ts
    - src/components/auth/login-form.tsx
    - src/components/auth/reset-password-form.tsx
    - src/components/auth/update-password-form.tsx
  modified: []
decisions:
  - id: useActionState-over-useFormState
    decision: "Use React 19 useActionState from 'react', not deprecated useFormState from 'react-dom'"
    rationale: "useFormState is deprecated in React 19; useActionState provides isPending natively"
  - id: generic-auth-errors
    decision: "Return generic error messages to client, never raw Supabase errors"
    rationale: "Security: prevents information leakage about internal systems"
  - id: anti-email-enumeration
    decision: "Password reset always returns success regardless of email existence"
    rationale: "Prevents attackers from discovering valid employee emails"
  - id: premium-dark-theme
    decision: "Dark background (#0A0A0B) with gold/amber accent (#D4A853) for auth pages"
    rationale: "MPM distributes luxury brands (L'Oreal, Swatch, Kerastase) -- premium feel"
metrics:
  duration: "~6 minutes"
  completed: "2026-02-04"
---

# Phase 1 Plan 2: Auth Pages & Server Actions Summary

**Login, password reset, and password update pages with four Server Actions, PKCE callback handler, and email confirmation route -- all using React 19 useActionState with premium dark theme.**

## What Was Done

### Task 1: Auth Server Actions and Callback Route Handlers
- **`src/actions/auth.ts`**: Four Server Actions with `'use server'` directive
  - `login`: Zod-validated email/password, `signInWithPassword`, generic "Invalid email or password" error
  - `logout`: `signOut` + redirect to `/login`
  - `requestPasswordReset`: Zod-validated email, `resetPasswordForEmail` with callback URL, always returns success (anti-enumeration)
  - `updatePassword`: Zod-validated password + confirmPassword match check, `updateUser`
- **`src/app/auth/callback/route.ts`**: PKCE code exchange via `exchangeCodeForSession`, redirects to `next` param or `/` on success, `/login?error=auth-code-error` on failure
- **`src/app/auth/confirm/route.ts`**: Email confirmation via `verifyOtp` with `token_hash` and `type` params, redirects to `/` or `/login?error=confirmation-failed`
- Exported `AuthActionState` type for form components to consume

### Task 2: Auth Pages and Form Components
- **`src/app/(auth)/layout.tsx`**: Centered layout with dark background, MPM branding (gold "MPM" + "EMPLOYEE PORTAL" subtext), no navigation
- **`src/components/auth/login-form.tsx`**: Email + password inputs, loading spinner, error display, "Forgot password?" link, no registration link
- **`src/app/(auth)/login/page.tsx`**: Renders LoginForm, shows error banners for `auth-code-error` and `confirmation-failed` URL params
- **`src/components/auth/reset-password-form.tsx`**: Email-only form, shows success message on submit, "Back to login" link
- **`src/app/(auth)/reset-password/page.tsx`**: Renders ResetPasswordForm with description text
- **`src/components/auth/update-password-form.tsx`**: New password + confirm password inputs with loading state
- **`src/app/(auth)/update-password/page.tsx`**: Renders UpdatePasswordForm with description text
- All forms use `useActionState` from `react` (React 19) with `action` attribute for progressive enhancement
- Consistent premium styling: dark backgrounds, gold accents, focus ring transitions, tracking-wide labels

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS -- zero errors |
| `npm run build` | PASS -- all 10 routes compiled |
| `/login` page renders | PASS -- 4.4 kB client JS |
| `/reset-password` page renders | PASS -- 4.41 kB client JS |
| `/update-password` page renders | PASS -- 1.18 kB client JS |
| `/auth/callback` route exists | PASS -- dynamic server route |
| `/auth/confirm` route exists | PASS -- dynamic server route |
| `'use server'` directive in auth.ts | PASS |
| All 4 actions exported | PASS -- login, logout, requestPasswordReset, updatePassword |
| `useActionState` from `react` (not `useFormState`) | PASS -- all 3 form components |
| No "Sign Up" or "Register" links | PASS -- zero matches |
| `exchangeCodeForSession` in callback | PASS |
| `createClient` imported from server.ts | PASS |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **useActionState over useFormState**: React 19's `useActionState` imported from `react` provides `isPending` natively, eliminating need for separate `useFormStatus`
2. **Generic auth errors**: All client-facing errors are generic ("Invalid email or password", "Something went wrong") -- never exposes Supabase internals
3. **Anti-email enumeration**: Password reset always returns `{ success: true }` regardless of whether email exists in the system
4. **Premium dark theme**: Dark background (#0A0A0B) with gold/amber accent (#D4A853) matching MPM's luxury brand portfolio

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| NEXT_PUBLIC_SITE_URL not set for password reset redirects | Will fail silently; documented in .env.example from 01-01 |
| SWC version mismatch warning persists | Non-blocking cosmetic warning, already noted in 01-01 |
| Forms require Supabase project connection for actual auth | Expected -- env vars must be configured first (01-01 prerequisite) |

## Next Phase Readiness

**Ready for 01-03 (Middleware + RBAC)**. All prerequisites met:
- Auth pages and Server Actions are implemented
- PKCE callback route handles code exchange
- Login redirects to `/` (where middleware will route based on role)
- Logout redirects to `/login`
- Form components are self-contained client components ready for any layout
