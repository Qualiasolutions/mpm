# MPM Employee Discount Platform

## What This Is

A custom employee discount management platform for MPM Distributors Ltd (Cyprus). MPM is an 80+ year old trading, distribution, and retail organization managing international brands (L'Oréal, Garnier, Vichy, Kérastase, Swatch, etc.) across 4 divisions with 100+ employees and 10+ retail locations.

The platform digitizes their currently manual employee discount process, enabling employees to access and use discounts across all MPM brands and divisions via a mobile-friendly PWA and providing administrators with a web dashboard for discount configuration and analytics.

## Core Value

**Employees get instant, trackable discounts across all MPM brands and locations — replacing a manual, untrackable process.**

The ONE thing that must work: Employee opens app → sees available discounts → generates QR/code → discount is validated and tracked.

## Who It's For

### Primary Users

1. **Employees (100+)** — Access discounts via PWA on their phones. View available offers, generate QR codes or manual codes at point of sale, track their usage history and remaining limits.

2. **Admins (HR/Management)** — Configure discount rules per division/brand, manage employee accounts, set spending limits, view usage analytics and reports via web dashboard.

### Stakeholder

- **Christiana Kalli** — Project Manager at MPM Imports LTD (c.kalli@mpmimports.com.cy, +357 99947041)

## Business Context

### Company Structure

MPM Distributors operates across 4 divisions:

1. **Consumer Products Division (CPD)** — L'Oréal Paris, Garnier, Maybelline, NYX, Essie, Baby Planet, Baylis & Harding, etc.
2. **Professional Products Division (PPD)** — Kérastase, L'Oréal Professionnel, Redken, Shu Uemura
3. **Active Cosmetics Division (ACD)** — Vichy, La Roche-Posay, CeraVe, SkinCeuticals
4. **Fashion & Accessories** — FOX Kids & Baby, Swatch

Each division has different margin profiles, requiring per-division discount rate configuration.

### Current State

- Discounts handled **manually** — no tracking, no limits enforcement, no analytics
- POS: **Business Center Cloud** — wholesale/retail sales modules
- POS integration is **future scope** — v1 is standalone

### Project Type

- **Custom build** for MPM specifically (not SaaS)
- **Demo-first** — fully functional demo to present to MPM stakeholders
- Future: POS integration with Business Center Cloud API

## How It Works

### Employee Flow
1. Employee logs into PWA (mobile-optimized web app)
2. Views available discounts by division/brand
3. Selects discount → generates QR code or manual code
4. Shows QR at POS (or gives code verbally) — cashier validates
5. Discount applied and tracked against employee's limits
6. Employee can view usage history and remaining monthly allowance

### Admin Flow
1. Admin logs into web dashboard
2. Manages employee accounts (add, deactivate, assign divisions)
3. Configures discount rules per division/brand (percentage, spending caps)
4. Sets monthly/annual spending limits per employee
5. Views usage analytics — per employee, per division, per location
6. Generates reports for finance/HR

### Discount Validation
- **QR Code scan** — primary method, fast checkout
- **Manual code entry** — fallback when scanner unavailable
- Both methods validate against: employee status, discount eligibility, remaining limits

### Discount Limits (Best Practice)
- **Per-division discount rates** — different percentages per division (e.g., 20% CPD, 15% Fashion)
- **Monthly spending cap** — per employee (e.g., €200/month max discounted purchases)
- Limits reset monthly, configurable by admin

## Constraints

- **No POS integration in v1** — standalone system, POS integration is future
- **Cyprus-based** — EUR currency, English + Greek language consideration
- **Mobile-first** — employees primarily use phones at retail locations
- **PWA, not native** — no app store deployment, web-based install
- **Must work offline** — retail locations may have spotty connectivity (QR generation should work offline)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **Deployment**: Vercel
- **QR Generation**: Client-side library (offline-capable)
- **PWA**: next-pwa or similar for installability and offline support

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Employee authentication (email/password)
- [ ] Employee PWA with discount browsing
- [ ] QR code generation for discount redemption
- [ ] Manual code fallback for discount redemption
- [ ] Admin dashboard with employee management
- [ ] Per-division discount rate configuration
- [ ] Monthly spending limit enforcement
- [ ] Discount usage tracking and history
- [ ] Usage analytics and reporting
- [ ] Role-based access (Admin, Employee)

### Out of Scope

- POS API integration — future milestone after Business Center Cloud API is available
- Native mobile apps — PWA covers mobile needs without app store overhead
- Multi-tenant/SaaS — custom build for MPM only
- Payment processing — discounts are applied at POS, not in-app
- Inventory management — handled by existing POS system

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA over native app | Faster deployment, no app store review, works across devices | Pending |
| Supabase for backend | Auth, RLS, real-time, Edge Functions — all needed, minimal infra | Pending |
| Per-division discount rates | MPM's 4 divisions have different margins | Pending |
| Monthly spending caps | Industry standard for employee discount programs | Pending |
| QR + manual code | QR for speed, manual as fallback — covers all POS scenarios | Pending |
| Standalone v1 (no POS) | De-risks demo, POS integration can come after validation | Pending |
| Two roles only (Admin/Employee) | Sufficient for v1, division-level managers can come later | Pending |

---
*Last updated: 2026-02-04 after initialization*
