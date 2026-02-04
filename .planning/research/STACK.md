# Technology Stack

**Project:** MPM Employee Discount Platform
**Researched:** 2026-02-04
**Overall Confidence:** HIGH

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.5.9 | Full-stack React framework | Latest patched v15 stable. App Router + RSC for SSR/SSG. Turbopack for fast dev. Note: Next.js 16 exists but v15 is LTS and battle-tested. Stick with 15 unless there is a specific v16 feature needed. | HIGH |
| React | 19.x | UI library | Ships with Next.js 15. Server Components, Actions, `use` hook, improved hydration. | HIGH |
| TypeScript | 5.5+ | Type safety | Required by Zod 4, shadcn/ui, and Supabase types. Strict mode mandatory. | HIGH |

**Version rationale:** Next.js 15.5.9 is the latest security-patched release in the v15 line. A critical CVE (CVE-2025-29927, CVSS 9.1) affected middleware in Next.js versions through 15.2.2 -- the 15.5.9 patch addresses this. Do NOT use any version below 15.2.3.

### Database & Backend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase (hosted) | Latest cloud | PostgreSQL + Auth + RLS + Realtime + Edge Functions + Storage | All-in-one backend. RLS provides row-level security without custom middleware. Realtime subscriptions for live dashboard updates. Edge Functions for server-side discount validation logic. Free tier generous enough for 100 employees. | HIGH |
| @supabase/supabase-js | 2.90.1 | JavaScript client | Isomorphic client for both browser and server. Requires Node.js 20+. | HIGH |
| @supabase/ssr | 0.8.0 | Server-side auth | Cookie-based auth for Next.js App Router. Replaces deprecated @supabase/auth-helpers-nextjs. Creates separate browser and server clients. | HIGH |

**RLS strategy for this project:**
- Single-tenant (MPM only), so no `tenant_id` needed in v1
- RLS policies based on `auth.uid()` and role (admin vs employee)
- Index `user_id` columns used in policies
- Store role in JWT custom claims for fast policy evaluation without subqueries
- Enable RLS on every table from day one -- never retroactive

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Supabase Auth | Built-in | Email/password auth | Native to Supabase, zero additional dependencies. Supports email/password (the requirement), plus magic links and OAuth if needed later. Cookie-based sessions via @supabase/ssr work cleanly with Next.js middleware. | HIGH |

**What NOT to use for auth:**
- **Clerk/Auth0/NextAuth** -- overkill for a single-org app with 100 users. Adds cost and complexity when Supabase Auth handles this natively with RLS integration.
- **@supabase/auth-helpers-nextjs** -- deprecated, replaced by @supabase/ssr.

### PWA & Offline Support

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @serwist/next | 9.5.0 | Service worker + PWA | Official Next.js docs recommend Serwist. Successor to next-pwa (unmaintained). Built on Workbox. Handles caching, offline fallback, install prompt. | HIGH |
| serwist | 9.5.0 | Service worker runtime (dev dep) | Required alongside @serwist/next for building the service worker. | HIGH |
| Dexie.js | 4.3.0 | IndexedDB wrapper for offline data | Best-in-class IndexedDB wrapper. Versioned schema migrations, reactive hooks (dexie-react-hooks), compound indexes, promise-based API. Used by 100K+ sites. Far superior to raw IndexedDB or idb-keyval for structured data like discount records and usage history. | HIGH |
| dexie-react-hooks | 4.2.0 | React hooks for Dexie | `useLiveQuery()` for reactive IndexedDB reads in components. | HIGH |

**Offline strategy:**
1. **Service worker (Serwist)** caches the app shell, static assets, and API responses
2. **Dexie.js** stores discount catalog and employee profile locally in IndexedDB
3. **QR codes generate offline** from locally cached discount data (no network needed)
4. **Sync queue** (Zustand persist middleware + Dexie) queues discount redemptions made offline
5. **Background sync** replays queued operations when connectivity restores

**Critical Serwist configuration:**
- Set `reloadOnOnline: false` -- prevents losing form data when going online
- Only enable Serwist in production builds to avoid "cache hell" during dev
- Requires Webpack for build (not Turbopack): use `next build --webpack` if on turbopack default
- Next.js 15 still uses Webpack by default, so no issue

**What NOT to use:**
- **next-pwa** -- last updated 2+ years ago, unmaintained
- **@ducanh2912/next-pwa** -- predecessor to Serwist, use Serwist directly
- **PowerSync** -- excellent but overkill for this use case. Adds a paid managed service. DIY with Dexie + sync queue is sufficient for 100 employees with simple data structures
- **idb-keyval** -- too simplistic (key-value only). Discount data has relations and needs querying
- **localForage** -- legacy API, no schema support, no reactive hooks

### QR Code

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| qrcode.react | 4.2.0 | QR code generation | Most popular React QR library (1,151 dependents). SVG + Canvas rendering. Logo embedding support. Works entirely client-side (offline-capable). Zero network calls. | HIGH |
| html5-qrcode | Latest | QR code scanning (admin/POS side) | Cross-platform camera-based QR scanner. Supports all browsers and devices. Fallback barcode support. Will be used by cashiers to validate discount codes. | MEDIUM |

**QR code architecture:**
- Employee's app generates QR containing a signed, time-limited discount token
- Token includes: employee_id, discount_id, timestamp, HMAC signature
- Cashier scans QR with html5-qrcode (or enters manual code)
- Server validates signature, checks limits, records redemption
- QR generation is purely client-side -- works offline

**What NOT to use:**
- **react-qr-code** -- smaller ecosystem, no logo embedding, choose qrcode.react instead
- **qr-code-styling** -- focused on branded/styled QR codes, unnecessary complexity
- **KendoReact QR** -- commercial license, unnecessary cost

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.10 | Global state + offline queue | Store lives outside React (critical for service worker communication and background sync). Built-in persist middleware supports IndexedDB/localStorage. Tiny bundle (~3KB). Perfect for offline queue pattern: intercept mutations when offline, replay on reconnection. | HIGH |

**Zustand usage in this project:**
- **Auth store** -- current user, role, session
- **Offline queue store** -- pending discount redemptions (persisted to IndexedDB via Dexie)
- **UI store** -- sidebar state, active filters, toast notifications

**What NOT to use:**
- **Redux/RTK** -- massive overkill for a 100-employee internal app
- **Jotai** -- great for atomic UI state but lives inside React tree. Zustand's external store is better for offline sync where you need to access state from service workers
- **React Context alone** -- no persist middleware, causes re-render cascade, no devtools

### Input Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | 4.3.5 | Schema validation | 6.5x faster than v3, 57% smaller bundle. TypeScript-first. Use for Server Action inputs, API route validation, form schemas. Integrates with React Hook Form. | HIGH |

**What NOT to use:**
- **Zod 3.x** -- v4 is stable since July 2025. No reason to use v3 in a new project.
- **Yup** -- larger bundle, weaker TypeScript inference
- **joi** -- Node.js only, not isomorphic

### Forms

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Hook Form | Latest | Form state management | Uncontrolled forms = fewer re-renders. @hookform/resolvers integrates Zod schemas directly. Ideal for admin dashboard forms (discount config, employee management). | HIGH |

### UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.1.18 | Utility-first CSS | CSS-first config with @theme. 5x faster builds. Container queries built-in. Auto content detection (no config needed). | HIGH |
| shadcn/ui | Latest | Component library | Not an npm dependency -- copy-paste components you own. Built on Radix UI (accessible by default). Full Tailwind v4 + React 19 support. Tables, forms, dialogs, dropdowns -- covers 90% of admin dashboard UI needs. | HIGH |
| @tailwindcss/postcss | 4.x | PostCSS plugin | In Tailwind v4, the PostCSS plugin is a separate package (was built into tailwindcss in v3). | HIGH |
| tw-animate-css | Latest | Animations | Replaces tailwindcss-animate for Tailwind v4 compatibility. Used by shadcn/ui components. | MEDIUM |
| Framer Motion | Latest | Complex animations | Page transitions, layout animations, gesture support. Use sparingly -- only for key UX moments (QR code reveal, success animations). | MEDIUM |

**What NOT to use:**
- **Tailwind CSS 3.x** -- v4 is stable since Jan 2025 with massive performance gains
- **tailwindcss-animate** -- incompatible with Tailwind v4, use tw-animate-css
- **Material UI / Chakra UI / Ant Design** -- heavy, opinionated, fight with Tailwind. shadcn/ui gives you the same components without the framework lock-in
- **CSS Modules** -- unnecessary complexity when Tailwind handles everything

### Analytics & Charts

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | 3.6.0 | Dashboard charts | 9.5M weekly downloads, battle-tested. SVG-based, React-native composable API. Used for discount usage trends, per-division analytics, spending limit tracking. shadcn/ui has chart components built on Recharts. | HIGH |

**What NOT to use:**
- **Tremor** -- built on top of Recharts anyway. Adds an abstraction layer without adding value when you already have shadcn/ui
- **Chart.js** -- Canvas-based, less composable with React
- **D3** -- too low-level for dashboard charts, massive overkill
- **ApexCharts** -- heavier than Recharts, less React-idiomatic

### Date & Time

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| date-fns | Latest | Date formatting, manipulation | Functional API, excellent tree-shaking (only import what you use). Immutable. Fastest in benchmarks. Needed for: monthly limit reset calculations, usage history display, report date ranges. | HIGH |

**What NOT to use:**
- **Moment.js** -- deprecated, massive bundle (330KB)
- **Day.js** -- good but less tree-shakeable. date-fns is faster and smaller when tree-shaken

### Email (Notifications)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | Latest | Email delivery | Developer-friendly API, free tier (100 emails/day is plenty for 100 employees). | MEDIUM |
| @react-email/components | Latest | Email templates | Build emails as React components. Used for: welcome emails, monthly usage summaries, limit warnings. | MEDIUM |

**Alternative:** Supabase Auth handles transactional auth emails (password reset, email verification) natively. Resend is only needed for business emails (reports, notifications). Can be deferred to later phases.

### Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | N/A | Hosting + CDN + Edge | Native Next.js hosting. Automatic preview deployments. Edge middleware for auth checks. Generous free tier. Cyprus users served from European edge nodes. | HIGH |
| Vercel Analytics | Built-in | Web vitals monitoring | Free for Hobby tier. Core Web Vitals, real-user monitoring. | MEDIUM |

### Developer Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | 9.x | Linting | Flat config format in v9. Use with @next/eslint-plugin-next. | HIGH |
| Prettier | Latest | Code formatting | Consistent style. Use prettier-plugin-tailwindcss for class sorting. | HIGH |
| Supabase CLI | 2.72.8+ | Local dev, migrations, type generation | Local Postgres for dev. Generate TypeScript types from schema. Git-based schema differencing. | HIGH |

---

## Complete Installation Commands

```bash
# Initialize Next.js 15 project
npx create-next-app@15 mpm-discount-platform --typescript --tailwind --eslint --app --src-dir

# Core Supabase
npm install @supabase/supabase-js@^2.90.1 @supabase/ssr@^0.8.0

# PWA & Offline
npm install @serwist/next@^9.5.0 dexie@^4.3.0 dexie-react-hooks@^4.2.0
npm install -D serwist@^9.5.0

# QR Code
npm install qrcode.react@^4.2.0

# State Management
npm install zustand@^5.0.10

# Validation & Forms
npm install zod@^4.3.5 react-hook-form @hookform/resolvers

# Charts & Data
npm install recharts@^3.6.0 date-fns

# UI (shadcn/ui is added via CLI, not npm)
npx shadcn@latest init

# Animations
npm install tw-animate-css framer-motion

# Email (defer to Phase 3+)
# npm install resend @react-email/components

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss
```

---

## Architecture-Relevant Stack Decisions

### Why NOT a Separate Backend

Supabase replaces the need for a custom Express/Fastify backend:
- **Auth** -- Supabase Auth with RLS
- **Database** -- Supabase PostgreSQL with typed client
- **Server logic** -- Next.js Server Actions + Supabase Edge Functions
- **Realtime** -- Supabase Realtime subscriptions
- **File storage** -- Supabase Storage (if needed for employee photos, reports)

A separate backend adds deployment complexity, CORS management, and auth token forwarding -- none of which are needed for 100 employees.

### Why NOT React Native / Capacitor

- PWA covers the use case: installable, offline-capable, camera access for QR scanning
- No app store deployment needed (explicitly out of scope)
- One codebase, one deployment, one URL
- Employees install via "Add to Home Screen"

### Why NOT Firebase

- Supabase is PostgreSQL (relational) -- discount rules, employee-division mappings, spending limits are inherently relational data
- RLS is more powerful than Firestore security rules for complex access patterns
- Edge Functions run server-side TypeScript (same language as frontend)
- No vendor lock-in -- standard Postgres, can migrate if needed

---

## Version Verification Sources

| Technology | Version | Source | Date Verified |
|------------|---------|--------|---------------|
| Next.js | 15.5.9 | [nextjs.org/blog](https://nextjs.org/blog) | 2026-02-04 |
| Tailwind CSS | 4.1.18 | [npm tailwindcss](https://www.npmjs.com/package/tailwindcss) | 2026-02-04 |
| @supabase/supabase-js | 2.90.1 | [npm @supabase/supabase-js](https://www.npmjs.com/package/@supabase/supabase-js) | 2026-02-04 |
| @supabase/ssr | 0.8.0 | [npm @supabase/ssr](https://www.npmjs.com/package/@supabase/ssr) | 2026-02-04 |
| @serwist/next | 9.5.0 | [npm @serwist/next](https://www.npmjs.com/package/@serwist/next) | 2026-02-04 |
| Dexie.js | 4.3.0 | [npm dexie](https://www.npmjs.com/package/dexie) | 2026-02-04 |
| qrcode.react | 4.2.0 | [npm qrcode.react](https://www.npmjs.com/package/qrcode.react) | 2026-02-04 |
| Zustand | 5.0.10 | [npm zustand](https://www.npmjs.com/package/zustand) | 2026-02-04 |
| Zod | 4.3.5 | [npm zod](https://www.npmjs.com/package/zod) | 2026-02-04 |
| Recharts | 3.6.0 | [npm recharts](https://www.npmjs.com/package/recharts) | 2026-02-04 |
| Supabase CLI | 2.72.8 | [npm supabase](https://www.npmjs.com/package/supabase) | 2026-02-04 |
| shadcn/ui | Latest (CLI) | [ui.shadcn.com](https://ui.shadcn.com/docs/installation/next) | 2026-02-04 |

---

## Anti-Recommendations Summary

| Category | Do NOT Use | Reason |
|----------|-----------|--------|
| Auth | Clerk, Auth0, NextAuth | Overkill for single-org, 100-user internal app. Supabase Auth is free and integrated. |
| Auth | @supabase/auth-helpers-nextjs | Deprecated. Use @supabase/ssr. |
| PWA | next-pwa | Unmaintained for 2+ years. |
| PWA | PowerSync | Paid service, overkill for simple offline needs. |
| Offline DB | idb-keyval | Too simplistic -- key-value only, no schema, no queries. |
| Offline DB | localForage | Legacy, no schema support, no reactive hooks. |
| QR | react-qr-code | Smaller ecosystem, no logo embedding. |
| State | Redux/RTK | Massive overkill, excessive boilerplate. |
| State | Jotai | Lives inside React tree, cannot access from service workers. |
| Charts | Tremor | Abstraction on Recharts -- use Recharts directly with shadcn/ui chart components. |
| Charts | D3 | Too low-level for dashboard charts. |
| UI | Material UI, Chakra, Ant Design | Heavy, fight with Tailwind. shadcn/ui is lighter and fully customizable. |
| CSS | Tailwind 3.x | v4 is stable, 5x faster, modern CSS features. |
| CSS | tailwindcss-animate | Incompatible with Tailwind v4. |
| Dates | Moment.js | Deprecated, 330KB bundle. |
| Validation | Zod 3.x | v4 is 6.5x faster and 57% smaller. |
| Backend | Express/Fastify | Unnecessary with Supabase + Next.js Server Actions. |
| Mobile | React Native / Capacitor | PWA covers all requirements without app store overhead. |
| Database | Firebase/Firestore | Relational data (discounts, limits, divisions) needs PostgreSQL, not NoSQL. |

---

## Security-Critical Notes

1. **Next.js version:** Must be >= 15.2.3 to patch CVE-2025-29927 (middleware bypass). Using 15.5.9.
2. **Node.js version:** Must be >= 20. Supabase dropped Node 18 support in v2.79.0. Node 18 EOL was April 2025.
3. **Supabase keys:** NEVER expose `service_role` key client-side. Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for browser, `SUPABASE_SERVICE_ROLE_KEY` for server only.
4. **RLS mandatory:** Enable on EVERY table. No exceptions. Test policies by connecting as different user roles.
5. **QR token signing:** Use HMAC-SHA256 with a server-side secret to sign QR payloads. Validate server-side before recording redemption.
