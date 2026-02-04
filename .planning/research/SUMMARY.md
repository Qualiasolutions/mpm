# Project Research Summary

**Project:** MPM Employee Discount Platform
**Domain:** Employee discount management with QR/code-based redemption
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

The MPM Employee Discount Platform is a two-role (Admin + Employee) PWA system for managing discount redemption across 4 divisions (CPD, PPD, ACD, Fashion) for 100+ employees at 10+ retail locations in Cyprus. Expert approaches center on **server-validated, single-use tokens** with cryptographic signing to prevent replay attacks, **atomic database-level spending enforcement** to prevent race conditions, and **offline-capable PWAs** for retail environments with spotty connectivity. The recommended approach uses Next.js 15 + Supabase (PostgreSQL with RLS) + offline PWA architecture, enabling rapid development while maintaining security at the database layer.

The architecture follows an **offline-first display, online-required validation** model: employees can browse discounts and view previously generated QR codes offline, but generating new codes and validating at POS require connectivity. This balances security (no unvalidated offline discounts) with UX (employees aren't blocked by momentary connectivity drops). The core value delivery path is: Auth → Employee Management → Discount Config → QR Generation → Validation Engine → Spending Limits → Analytics. PWA and offline support are polish layers added after the core transactional system works.

The top 3 critical risks are: **(1) QR replay attacks from screenshot sharing** (mitigated by 60-120 second TTL + single-use tokens marked used atomically), **(2) spending cap race conditions** (mitigated by Postgres function with `SELECT ... FOR UPDATE` row locking), and **(3) Supabase RLS misconfiguration** (mitigated by enabling RLS in the same migration that creates each table, never as an afterthought). All three must be addressed in Phase 1 architecture decisions — retrofitting security is a rewrite.

## Key Findings

### Recommended Stack

The research converged on a **Next.js 15 + Supabase + PWA** architecture with offline IndexedDB caching. Next.js 15.5.9 (latest security-patched) with App Router provides SSR/RSC and eliminates the need for a separate backend via Server Actions. Supabase replaces custom Express/FastAPI backends with PostgreSQL + RLS + Edge Functions + built-in Auth. PWA via Serwist (Next.js officially recommended) enables offline app shell and discount browsing. Dexie.js wraps IndexedDB for structured offline storage of discount rules and employee profile. This stack is production-ready for 100 employees without additional infrastructure.

**Core technologies:**
- **Next.js 15.5.9 + React 19**: Full-stack framework with App Router, Server Components, and Server Actions. No separate backend needed. Security patch critical: versions below 15.2.3 have CVE-2025-29927 middleware bypass (CVSS 9.1).
- **Supabase (PostgreSQL + RLS + Auth + Edge Functions)**: All-in-one backend eliminates auth service, API layer, and database hosting. RLS provides row-level security enforced at DB level. Edge Functions for low-latency discount validation. Free tier supports 100 employees.
- **Serwist v9.5**: Service worker + PWA for offline app shell caching and installability. Official Next.js recommendation (successor to next-pwa which is unmaintained).
- **Dexie.js v4.3**: IndexedDB wrapper for offline discount catalog and employee data. Reactive hooks, versioned schema, compound indexes. Far superior to idb-keyval or localForage for structured relational-like queries offline.
- **qrcode.react v4.2**: Client-side QR generation (SVG/Canvas, logo embedding, 2M+ weekly downloads). Zero server dependency — works fully offline once code data is generated.
- **Zustand v5.0**: Global state + offline queue. Lives outside React (critical for service worker communication). Persist middleware supports IndexedDB for offline transaction queue.
- **Zod v4.3.5**: Schema validation for Server Actions and API routes. v4 is 6.5x faster and 57% smaller than v3.
- **Tailwind CSS v4.1.18**: 5x faster builds than v3. CSS-first config, container queries built-in. shadcn/ui for accessible component patterns.

**What NOT to use:**
- **Clerk/Auth0/NextAuth**: Overkill for single-org internal app. Supabase Auth is free and native.
- **Redux/RTK**: Massive overkill. Zustand is 3KB vs Redux's 50KB+ with far simpler API.
- **PowerSync**: Excellent but paid SaaS, unnecessary for 100 employees. DIY with Dexie + sync queue is sufficient.
- **React Native/Capacitor**: PWA covers all requirements without app store overhead.
- **Firebase/Firestore**: NoSQL is poor fit for relational discount data (divisions, brands, rules, limits). Supabase PostgreSQL is correct choice.

### Expected Features

Research identified a **critical path for v1 demo** and clear delineation between table stakes, differentiators, and anti-features (explicitly NOT building).

**Must have (table stakes):**
- **Auth + RBAC**: Email/password login, admin vs employee roles, session persistence, password reset. Without role separation, the system is chaotic.
- **Per-division discount config**: Different divisions have different margins. Admin sets percentage per division. Industry standard for multi-brand programs.
- **QR code generation + manual fallback**: QR is primary redemption; manual code is universal fallback when scanners fail. Every major platform (PerkSpot, Abenity) uses scannable codes.
- **Discount validation**: Real-time check at redemption: active employee, eligible discount, within spending cap. This is the critical path — without validation, system is just a QR printer.
- **Monthly spending caps per employee**: Industry standard for abuse prevention. Without limits, program is a liability. Fond, Empuls, and all platforms enforce caps.
- **Usage tracking + remaining limit display**: Employees must see what they've used and what remains. Transparency builds trust and prevents checkout surprises.
- **Basic admin dashboard**: Usage summary, per-employee view, per-division breakdown, CSV export. Finance teams need spreadsheet data.

**Should have (competitive differentiators):**
- **Offline QR code generation**: Cyprus retail locations may have spotty connectivity. Employees cache discount data locally, generate QR offline. Most SaaS platforms require internet.
- **Time-limited QR codes (60-120 sec expiry)**: Prevents screenshot sharing fraud. Employee must generate fresh code at POS. Major fraud prevention.
- **One-time use codes**: Each code redeemed once and marked used atomically. Prevents reuse/sharing.
- **Bilingual (EN/GR)**: Cyprus-based company, some employees prefer Greek. Shows local attention.
- **Push notifications for new discounts**: Boosts engagement 88% (industry data). Most employees forget to check app.
- **Bulk employee import (CSV)**: 100+ employees is too many to add one-by-one. Critical for onboarding.

**Defer to v2+:**
- Discount scheduling (seasonal offers)
- Division manager role (view-only for their division)
- Audit trail / activity log
- Abuse detection alerts
- Per-location analytics
- POS integration with Business Center Cloud API

**Anti-features (explicitly NOT building):**
- **External vendor marketplace**: MPM sells own brands, not aggregating third-party deals. That's a different product.
- **Points/rewards system**: Adds cognitive load. Simple percentage discounts are transparent.
- **Social recognition / peer rewards**: Employee engagement feature, not discount management. Scope creep.
- **Payment processing / in-app checkout**: Discount applied at POS by cashier. App generates codes, not an e-commerce store. PCI compliance nightmare.
- **Multi-tenant SaaS**: Single customer (MPM). Multi-tenancy adds complexity with zero value.
- **Native mobile apps (iOS/Android)**: App store approval delays, dual maintenance. PWA covers all use cases (offline, installable, push notifications).
- **Gamification (leaderboards, badges)**: Discounts are a benefit, not a competition. Comparative/competitive elements create perverse incentives.

### Architecture Approach

The system follows a **layered offline-capable PWA architecture** with security enforced at the database via RLS and spending limits enforced atomically in Postgres functions. Client layer (Next.js RSC + PWA) fetches data via Supabase client, caches in IndexedDB for offline browsing, and generates QR codes purely client-side. Server layer (Supabase) handles auth (JWT with custom claims for RBAC), validation (Edge Functions calling PL/pgSQL functions), and all mutations via Next.js Server Actions. The architecture is extensible for future POS integration without schema changes: transactions table stores all redemptions regardless of source, validation method is tracked (`qr`, `manual_code`, `admin_override`, future `pos_api`).

**Major components:**

1. **Supabase Auth + Custom Access Token Hook**: JWT contains `user_role` claim (`admin` or `employee`) injected at auth time. RLS policies read from JWT claims (fast, no subquery). Admin creates all employee accounts — no self-registration.

2. **PostgreSQL Schema with RLS**: 7 core tables (`profiles`, `divisions`, `brands`, `employee_divisions`, `discount_rules`, `discount_codes`, `transactions`). RLS enabled on EVERY table in the same migration that creates it. Employees see own data, admins see all. Atomic spending function `validate_and_record_transaction()` uses `SELECT ... FOR UPDATE` to prevent race conditions.

3. **QR Code Flow**: Employee selects discount → Server Action generates single-use code in `discount_codes` table with 24hr expiry → Client receives code + QR payload → qrcode.react renders QR 100% client-side (offline-capable) → Cashier scans → Edge Function validates → Postgres function checks eligibility + limits + marks code used → Returns success/failure.

4. **Offline Layer (PWA + IndexedDB)**: Service worker (Serwist) caches app shell, static assets, API responses (NetworkFirst for API, CacheFirst for assets). Dexie.js stores: employee profile, discount rules, active codes, recent transactions. Updated on every successful fetch. Offline = browse cached discounts + display previously generated QR. Online required for: generate NEW code, validate at POS, admin CRUD.

5. **Validation Engine (Edge Function + Postgres Function)**: `validate-discount` Edge Function receives `{code, original_amount, location}`. Calls `validate_and_record_transaction()` Postgres function (SECURITY DEFINER) which: locks code row (`FOR UPDATE`), checks code status/expiry, checks employee active, checks division eligibility, calculates discount, checks monthly limit, atomically marks code used + inserts transaction, returns structured result. Sub-2-second response for cashier UX.

6. **Admin Dashboard + Server Actions**: All mutations via Server Actions with Zod validation. Auth check FIRST (never rely on middleware alone), role check SECOND, then execute. RLS acts as defense-in-depth. Admins manage employees (CRUD, assign divisions, set caps), configure discount rules (per division/brand, percentage/fixed, valid dates), view usage reports, export CSV.

**Build order (dependency-driven):**
- **Phase 1: Foundation** — Database schema, RLS policies, Custom Access Token Hook, Supabase Auth in Next.js, role-based routing. Everything depends on this.
- **Phase 2: Admin Core** — Employee CRUD, discount rule config, basic tables. Control plane must exist before employees use system.
- **Phase 3: Employee Core** — Discount browsing, QR generation (qrcode.react), manual code display, usage history. Depends on discount rules (Phase 2).
- **Phase 4: Validation Engine** — `validate_and_record_transaction()` function, Edge Function, admin validation screen (camera scan), monthly limit enforcement, transaction recording. Core value delivery. Depends on codes (Phase 3).
- **Phase 5 & 6 (parallel): PWA + Analytics** — Service worker, manifest, IndexedDB caching, install prompt (Phase 5). Charts, reports, CSV export, date filtering (Phase 6). Polish layers after core works.

### Critical Pitfalls

Research surfaced 11 domain-specific pitfalls. The top 5 are:

1. **QR Code Replay / Screenshot Sharing (CRITICAL)**: Static QR codes get screenshotted and shared. Single code used by dozens of non-employees. **Prevention:** Never encode discount in QR. Short TTL tokens (60-120 sec), single-use enforcement (mark used atomically), session binding (token tied to authenticated employee). Regenerate QR on each view. Address in Phase 1 — token model must be correct from start. Retrofitting is a rewrite.

2. **Spending Cap Race Conditions (CRITICAL)**: Two concurrent redemptions both read remaining balance before either writes, exceeding cap. Classic read-modify-write race. **Prevention:** Postgres function (RPC) with `SELECT ... FOR UPDATE` on spending record. Never check balance in JS code. Entire check-approve-deduct flow in single DB transaction. Address in Phase 1 — atomic spending function is most important backend function.

3. **Supabase RLS Misconfiguration (CRITICAL)**: Tables created without RLS enabled. Anon key becomes master key. Employee data exposed. 83% of exposed Supabase databases involve RLS misconfiguration (2025 audit). **Prevention:** Enable RLS in same migration that creates table. Policies check `auth.uid()`, never `user_metadata` (user-modifiable). Never expose `service_role` key client-side. Test RLS with multiple user roles locally. Address in Phase 1 — hard rule from first migration.

4. **Discount Stacking Exploitation (HIGH)**: Multiple discounts applied to same transaction. 20% division + 10% seasonal + loyalty coupon = sold below cost. One retailer lost $250K/year. **Prevention:** v1 simplicity — one discount per transaction. Define max total discount ceiling. Model rules with `stackable: boolean`. Address in Phase 1 data model design.

5. **Offline QR Without Proper Sync (HIGH)**: Offline-generated tokens can't be validated (server unreachable). Either fail-open (exploitable) or fail-closed (frustrating). Sync conflicts when online. **Prevention:** Define offline = viewing only. QR generation requires connectivity (token roundtrip <500ms). Pre-generate small pool of tokens when online for true offline scenarios. Fail-closed is correct default for discount systems. Address in Phase 1 architecture decisions.

Other notable pitfalls: Rigid data model (hardcoded divisions as enum prevents reorg), sweethearting/proxy usage (employees share credentials), month boundary timezone bugs (cap resets at wrong time), poor cashier UX (validation slow/unclear kills adoption), admin scope creep (dashboard takes 3x longer than planned), demo-to-production gap (demo looks great but has no error handling/backups/rate limiting).

## Implications for Roadmap

Based on dependency analysis, security requirements, and demo-first approach, the recommended phase structure is:

### Phase 1: Foundation — Database, Auth, Security
**Rationale:** Everything depends on correct data model and security architecture. RLS, atomic spending enforcement, and token model must be right from day one. Retrofitting security is a rewrite.

**Delivers:**
- Supabase project setup with 7 core tables (`profiles`, `divisions`, `brands`, `employee_divisions`, `discount_rules`, `discount_codes`, `transactions`)
- RLS enabled on every table with role-based policies (`auth.uid()` checks for employees, `user_role = 'admin'` for admins)
- Custom Access Token Hook injecting `user_role` claim into JWT
- Supabase Auth integration in Next.js with cookie-based sessions (@supabase/ssr)
- Atomic spending function `validate_and_record_transaction()` with `SELECT ... FOR UPDATE` row locking
- Basic Next.js app shell with role-based routing (admin routes protected)
- Environment variables for secrets, never hardcoded

**Addresses features:**
- Auth + RBAC (table stakes)
- Per-division discount model (table stakes)
- Monthly spending cap enforcement (table stakes)

**Avoids pitfalls:**
- Pitfall 2 (race conditions) — atomic Postgres function prevents concurrent spending
- Pitfall 3 (RLS misconfiguration) — RLS enabled in same migration, policies tested with multiple roles
- Pitfall 4 (discount stacking) — data model prevents multiple discounts per transaction
- Pitfall 5 (offline sync) — architecture decision: offline = viewing, QR generation online
- Pitfall 8 (month boundaries) — `timestamptz` everywhere, timezone-aware period boundaries

**Research flag:** STANDARD PATTERNS. RLS, JWT claims, Postgres row locking are well-documented. No phase-specific research needed.

---

### Phase 2: Admin Core — Employee & Discount Management
**Rationale:** Admins must configure employees and discount rules before employees can use the system. This is the control plane. Depends on schema (Phase 1).

**Delivers:**
- Admin dashboard layout with role verification
- Employee CRUD: create accounts (Supabase Auth signup), assign divisions, set monthly limits
- Bulk employee import (CSV upload, parse, validate, batch create)
- Discount rule configuration: per-division or per-brand, percentage or fixed, valid date ranges
- Division and brand management (CRUD for `divisions` and `brands` tables)
- Basic data tables with filtering (shadcn/ui Table component)
- Server Actions for all mutations with Zod validation

**Addresses features:**
- Employee management (table stakes)
- Per-division discount config (table stakes)
- Bulk employee import (differentiator)

**Avoids pitfalls:**
- Pitfall 10 (admin scope creep) — 4 screens maximum: employees, discounts, divisions/brands, settings. No report builder, no approval workflows, no complex analytics.
- Pitfall 5 (rigid data model) — divisions as database table, admin can CRUD without code changes

**Research flag:** STANDARD PATTERNS. CRUD with Server Actions, CSV parsing, shadcn/ui forms are well-documented. No phase-specific research needed.

---

### Phase 3: Employee Core — Discount Browsing & QR Generation
**Rationale:** Employees need to see discounts and generate codes. Depends on discount rules existing (Phase 2) and validation function (Phase 1).

**Delivers:**
- Employee dashboard showing available discounts (filtered by assigned divisions via `employee_divisions` join)
- Discount browsing by division/brand with simple filtering
- QR code generation flow: select discount → Server Action creates row in `discount_codes` → returns code + payload → qrcode.react renders SVG QR client-side
- Manual code display (8-char alphanumeric with `MPM-` prefix) alongside QR
- Usage history view (fetch `transactions` where `employee_id = auth.uid()`)
- Monthly usage summary (call `get_monthly_usage()` RPC, display remaining limit prominently)

**Addresses features:**
- Discount browsing (table stakes)
- QR code generation (table stakes)
- Manual code fallback (table stakes)
- Usage history + remaining limit (table stakes)

**Avoids pitfalls:**
- Pitfall 1 (QR replay) — tokens generated server-side with 24hr expiry, single-use status enforced
- Pitfall 6 (offline QR) — generation requires connectivity to create server record. Display of previously generated QR works offline from cached data.

**Research flag:** STANDARD PATTERNS. qrcode.react, Server Actions for code generation, fetching with Supabase client are well-documented. No phase-specific research needed.

---

### Phase 4: Validation Engine — QR Scan & Redemption
**Rationale:** This is the core value — employee gets discount at POS. Depends on codes existing (Phase 3), rules configured (Phase 2), atomic spending function (Phase 1).

**Delivers:**
- `validate-discount` Supabase Edge Function (Deno) calling `validate_and_record_transaction()` Postgres function
- Admin validation screen: lightweight cashier-facing UI with camera QR scanning (html5-qrcode) and manual code entry fallback
- Validation result UI: big green checkmark (valid) or big red X (invalid) with clear error messages
- Transaction recording: every redemption logged with employee, division, amounts, location, validated_by, timestamp
- Structured response: employee name, discount applied, remaining limit, transaction ID on success; specific failure reason (expired, over limit, inactive, etc.) on failure
- Sub-2-second validation performance (Edge Function + indexed queries)

**Addresses features:**
- Discount validation (table stakes)
- Transaction recording (table stakes)
- Time-limited QR codes (differentiator)
- One-time use codes (differentiator)

**Avoids pitfalls:**
- Pitfall 2 (race conditions) — Postgres function with `FOR UPDATE` lock prevents concurrent validation
- Pitfall 1 (QR replay) — single-use enforcement, code marked used atomically
- Pitfall 9 (poor cashier UX) — binary result, audible feedback, <2 sec validation, simple fallback to manual entry

**Research flag:** STANDARD PATTERNS. Edge Functions, html5-qrcode, PL/pgSQL atomic functions are documented. Edge Function calling Postgres verified in Supabase docs. No phase-specific research needed.

---

### Phase 5: PWA & Offline Support
**Rationale:** PWA is a polish layer. Core system must work online first. Adding offline support on top is safer than building offline-first from scratch. Independent of Phase 6 (can be parallel).

**Delivers:**
- Serwist service worker setup for app shell caching (NetworkFirst for API, CacheFirst for static assets)
- Web app manifest for installability (name, icons, theme color, display: standalone)
- Dexie.js IndexedDB schema: `profile`, `discountRules`, `activeCodes`, `recentTransactions`, `syncMeta`
- Sync strategy: fetch fresh data on page load when online, update IndexedDB. Read from IndexedDB when offline.
- Online/offline detection: `navigator.onLine` + fetch probe, UI badge shows connection status
- Install prompt component (A2HS banner)
- Offline fallback page

**Addresses features:**
- Offline QR display (differentiator)
- Installable PWA (table stakes for employee-facing apps)

**Avoids pitfalls:**
- Pitfall 6 (offline sync) — clear separation: offline = viewing cached data. Generation/validation require connectivity.

**Research flag:** NEEDS VALIDATION. Serwist with Next.js 15 App Router is recent (2025). Official Next.js PWA guide confirms Serwist is recommended, but Next.js 15 + Serwist + Dexie integration may need light research for edge cases (cache invalidation strategy, IndexedDB schema versioning). Allocate 1-2 hours for testing caching strategies.

---

### Phase 6: Analytics & Reporting
**Rationale:** Analytics reads from transactions (Phase 4). Valuable but not blocking for demo. Can be built in parallel with Phase 5.

**Delivers:**
- Admin analytics dashboard: total spend this month, per-division breakdown, per-employee summary (Recharts for simple bar/line charts, shadcn/ui chart components)
- Per-employee spending report: filterable table, date range picker, search by employee ID/name
- Per-division usage report: which divisions are most/least used
- CSV export for all reports (simple response with `Content-Type: text/csv`)
- Date range filtering (date-fns for month/year navigation)

**Addresses features:**
- Usage summary dashboard (table stakes)
- Per-employee usage report (table stakes)
- Per-division breakdown (table stakes)
- CSV export (table stakes)

**Avoids pitfalls:**
- Pitfall 10 (admin scope creep) — simple aggregations only, no custom report builder, no BI tool features. Charts are nice-to-have; data export is must-have.

**Research flag:** STANDARD PATTERNS. Recharts, shadcn/ui charts, CSV generation are well-documented. Database aggregations with Supabase are standard. No phase-specific research needed.

---

### Phase Ordering Rationale

**Dependency chain enforced by data flow:**
- Phase 1 (Foundation) is the root — schema, auth, RLS, atomic spending. All other phases depend on this.
- Phase 2 (Admin Core) depends on Phase 1 — uses schema and auth. Creates discount rules that Phase 3 displays.
- Phase 3 (Employee Core) depends on Phase 2 — displays discounts configured by admin. Generates codes that Phase 4 validates.
- Phase 4 (Validation Engine) depends on Phases 1, 2, 3 — validates codes using atomic function from Phase 1, checks rules from Phase 2, consumes codes from Phase 3.
- Phases 5 & 6 are independent and can be parallel — PWA enhances existing views, Analytics reads completed transactions.

**Grouping based on roles:**
- Phases 1-2 are "control plane" (infrastructure + admin setup)
- Phases 3-4 are "data plane" (employee usage + transaction validation — the core value delivery)
- Phases 5-6 are "polish layer" (offline support + insights)

**Risk mitigation via phasing:**
- Critical security (RLS, race conditions, token security) resolved in Phase 1 before any user-facing features. No retrofitting security.
- Demo milestone after Phase 4 — full critical path works: admin configures → employee generates QR → cashier validates → spending tracked. Phases 5-6 are enhancements.
- Cashier UX prioritized in Phase 4 — if validation is slow/unclear at demo time, project approval fails. Designing cashier screen early prevents this.

**Demo-first implications:**
- Phases 1-4 are the MVP demo. Takes ~3-4 weeks with single developer (per complexity analysis).
- Phase 4 completion = working demo showing: employee logs in → sees CPD 20% discount → generates QR → admin scans → validates successfully → employee's remaining cap updates. Full user journey.
- Phases 5-6 add polish for production (offline support, analytics) but are not demo-blocking.

### Research Flags

**Phases with standard patterns (no additional research needed):**
- **Phase 1 (Foundation):** RLS, JWT custom claims, Postgres row locking, Next.js auth — all extensively documented in Supabase and Next.js official docs.
- **Phase 2 (Admin Core):** CRUD with Server Actions, shadcn/ui forms, CSV parsing — standard web dev patterns.
- **Phase 3 (Employee Core):** qrcode.react, Server Actions, Supabase queries — all verified in research, no new patterns.
- **Phase 4 (Validation Engine):** Edge Functions calling Postgres, PL/pgSQL atomic functions, html5-qrcode — verified in official docs and research.
- **Phase 6 (Analytics):** Recharts, CSV export, date filtering — well-documented, no surprises.

**Phases needing validation during planning:**
- **Phase 5 (PWA + Offline):** Light validation needed. Serwist + Next.js 15 App Router integration is recent (2025). Official Next.js docs confirm Serwist is recommended successor to next-pwa. However, specific caching strategies (which routes to cache, when to invalidate) and Dexie.js schema versioning may need 1-2 hours of testing during planning. Confidence: MEDIUM-HIGH (patterns are established, but specific tooling combo is new). Consider allocating time for cache invalidation testing and service worker debugging.

**No phase requires `/gsd:research-phase`** — all patterns are documented. Phase 5 may benefit from brief validation testing but doesn't require dedicated research sprint.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm/official docs as of 2026-02-04. Next.js 15.5.9, Tailwind 4.1.18, Supabase packages, Dexie 4.3, qrcode.react 4.2, Zustand 5.0, Zod 4.3.5 all confirmed latest stable. Critical CVE-2025-29927 patch status verified. |
| Features | HIGH | Table stakes identified from 6+ employee discount platform comparisons (PerkSpot, Fond, Abenity, BenefitHub). QR redemption patterns verified via retail technology sources. Feature dependencies mapped via explicit critical path analysis. Anti-features justified by scope and domain constraints. |
| Architecture | HIGH | Supabase RLS patterns, Custom Access Token Hooks, Edge Functions calling Postgres, atomic row locking — all verified in official Supabase docs and security retro. Next.js 15 Server Actions + App Router patterns confirmed in official docs. qrcode.react client-side generation verified via GitHub + npm (2M+ weekly downloads). PWA strategy (Serwist) confirmed as official Next.js recommendation. |
| Pitfalls | HIGH | Top pitfalls sourced from: Supabase security retro 2025 (RLS misconfiguration = 83% of exposed DBs), retail loss prevention research (discount stacking, sweethearting), financial transaction concurrency literature (race conditions), voucher security standards (QR replay via OASIS SQRAP). Each pitfall includes prevention strategy with confidence assessment. |

**Overall confidence:** HIGH

All four research files have HIGH confidence ratings. Stack versions verified via npm/official registries. Features cross-referenced with 10+ sources (platform comparisons, retail tech, fraud prevention). Architecture patterns confirmed in official documentation (Supabase, Next.js). Pitfalls sourced from industry security retros, CVE databases, and loss prevention case studies. No LOW confidence findings that would block roadmap creation.

### Gaps to Address

**1. Business Center Cloud API specifics:** POS integration deferred to v2+, but the system is designed for extensibility. When MPM provides Business Center Cloud API documentation (currently unavailable), validate that the `transactions` table schema and `validation_method` enum can accommodate POS webhook data without migration. **How to handle:** Phase 1 includes `external_events` table design (deferred implementation) to ensure schema won't break when POS integration is built.

**2. Cyprus-specific connectivity profile:** Research assumes "spotty connectivity" at retail locations based on PROJECT.md requirement for offline support. Actual connectivity reliability affects offline strategy aggressiveness. **How to handle:** During Phase 5 planning, ask MPM stakeholders: "How often do locations lose connectivity? Minutes per day? Hours?" If connectivity is actually reliable, offline support can be simpler (cache-only for speed, not for outages). If truly unreliable, consider pre-generated token pool strategy.

**3. Employee photo availability:** Pitfall 7 (sweethearting) mitigation includes showing employee photo on QR screen. Unknown if MPM has employee photos in HR system. **How to handle:** Phase 2 planning — add optional `photo_url` field to `profiles` table. If photos unavailable, fallback to prominent employee name + ID display. Photo verification is deterrence, not prevention.

**4. Cashier device constraints:** Unknown what devices cashiers use for validation. Affects QR scanning approach. **How to handle:** Phase 4 planning — design validation screen mobile-first (assume cashier's personal phone). If cashiers have dedicated tablets/scanners, adjust camera permissions and scanning library. html5-qrcode works on all modern devices, so risk is low.

**5. Discount calculation precision:** Unknown if MPM wants rounding (e.g., 20% of EUR 7.33 = EUR 1.466). **How to handle:** Phase 2 planning — default to `ROUND(amount * percentage / 100, 2)` (round to nearest cent). Confirm with stakeholder. Add `rounding_mode` config if needed (round up/down/nearest).

No gaps block roadmap creation. All are "validate during phase planning" items, not "research before designing" items.

## Sources

### Primary (HIGH confidence)
- **Official Documentation:**
  - [Next.js 15 Documentation](https://nextjs.org/docs) — App Router, Server Components, Server Actions verified
  - [Supabase Documentation](https://supabase.com/docs) — RLS, Auth, Edge Functions, Custom Hooks verified
  - [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro) — RLS misconfiguration data
  - [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — Serwist recommendation
  - npm registry — all package versions verified as of 2026-02-04

- **Security Standards:**
  - [CVE-2025-29927 (Next.js middleware bypass)](https://nvd.nist.gov/vuln/detail/CVE-2025-29927) — CVSS 9.1, patched in 15.2.3+
  - [CVE-2025-48757 (Supabase RLS exposure)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) — 170+ apps affected
  - [OASIS SQRAP v1.0](https://docs.oasis-open.org/esat/sqrap/v1.0/csd01/sqrap-v1.0-csd01.html) — Secure QR Authentication Protocol

### Secondary (MEDIUM-HIGH confidence)
- **Retail & Loss Prevention:**
  - [Agilence - How to Conquer Discount Fraud](https://blog.agilenceinc.com/how-to-conquer-discount-fraud) — discount stacking cases
  - [Solink - End Discount Abuse Today](https://solink.com/resources/spot-discount-abuse/) — sweethearting statistics
  - [LP Magazine - Discount Fraud Data Analysis](https://losspreventionmedia.com/using-data-to-stop-four-types-of-discount-fraud/)

- **Platform Comparisons:**
  - [SelectHub - PerkSpot vs Fond](https://www.selecthub.com/employee-recognition-software/perkspot-vs-fond/) — feature matrix
  - [Xoxoday - Best Employee Discount Platforms 2026](https://blog.xoxoday.com/empuls/best-employee-discount-platforms/) — 6 platform comparison

- **Technical Patterns:**
  - [Supabase RLS Best Practices](https://www.leanware.co/insights/supabase-best-practices) — verified against official docs
  - [Marmelab - Transactions & RLS in Edge Functions](https://marmelab.com/blog/2025/12/08/supabase-edge-function-transaction-rls.html) — atomic validation pattern
  - [Ketan Bhatt - DB Concurrency Defects Catalogue](https://www.ketanbhatt.com/p/db-concurrency-defects) — race condition patterns

### Tertiary (MEDIUM confidence)
- **PWA & Offline:**
  - [Building Offline-First PWA with Next.js & Supabase](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9) — IndexedDB + Supabase pattern
  - [GTCSys - PWA Offline-First Strategies](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/) — sync conflict patterns

All sources cross-referenced with official documentation where applicable. No findings rely on single-source claims.

---

*Research completed: 2026-02-04*
*Ready for roadmap: YES*

**Next steps for orchestrator:**
1. Proceed to roadmap creation using phase structure from "Implications for Roadmap"
2. Use dependency analysis to validate phase ordering
3. Flag Phase 5 (PWA) for light validation testing during planning (1-2 hours, not a dedicated research sprint)
4. Address gaps during phase planning, not as blockers to roadmap
