# Feature Landscape: Employee Discount Management Platform

**Domain:** Internal employee discount management for multi-division retail/distribution
**Context:** MPM Distributors Ltd -- Cyprus, 100+ employees, 10+ retail locations, 4 divisions, manual discount process today
**Researched:** 2026-02-04
**Overall Confidence:** HIGH (domain is well-established, MPM requirements are clear)

---

## Table Stakes

Features users expect from any employee discount system. Missing any of these makes the platform feel broken or incomplete. These are non-negotiable for v1.

### Authentication & Access Control

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|------------|-------|
| Email/password authentication | Every employee app needs secure login. Industry standard. | Low | Supabase Auth handles this out of the box. |
| Role-based access (Admin vs Employee) | Admins and employees see completely different interfaces. No role separation = chaos. | Low | Two roles sufficient for v1. Supabase RLS enforces at DB level. |
| Session persistence / "stay logged in" | Employees at POS cannot re-authenticate every time. Friction kills adoption. | Low | JWT refresh tokens via Supabase. |
| Password reset flow | Employees will forget passwords. No reset = locked out users flooding HR. | Low | Supabase provides this. |
| Account deactivation (admin-side) | When employees leave, their discount access must be revoked immediately. Security requirement. | Low | Soft delete / active flag on user record. |

### Employee Experience (PWA)

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|------------|-------|
| Browse available discounts by division/brand | Core value proposition. Employee must see what discounts they can use. | Low | Flat list grouped by division. No complex catalog needed. |
| QR code generation for discount redemption | Primary redemption method. Every major platform (PerkSpot, Abenity, Perks at Work) uses scannable codes. Industry standard since 2023+. | Medium | Client-side generation (qrcode.js or similar). Must encode employee ID + discount ID + timestamp. Must work offline. |
| Manual code fallback | QR scanners break, lighting is bad, cashier's phone camera fails. Manual codes are the universal fallback in retail. | Low | Short alphanumeric code displayed alongside QR. |
| View usage history | Employees need to see what they have used. Transparency builds trust and reduces "did my discount work?" support tickets. | Low | Simple list with date, amount, division. |
| View remaining monthly limit | Without this, employees guess and get frustrated at checkout when limits are exceeded. Every platform with limits shows remaining balance. | Low | Simple calculation: limit minus used amount. |
| Mobile-first responsive design | 100% of employee usage happens on phones at POS. Desktop is irrelevant for employees. | Medium | PWA with mobile-optimized layout. |
| Installable PWA (add to home screen) | Reduces friction vs opening browser every time. Standard for employee-facing apps in 2025+. | Low | Web app manifest + service worker. Next.js PWA plugins handle this. |

### Discount Management (Admin)

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|------------|-------|
| Per-division discount rate configuration | MPM's core requirement. Different divisions have different margins (CPD vs Fashion vs ACD). Every multi-brand program (H&M, GM, etc.) supports variable rates. | Medium | Admin sets percentage per division. Stored as config, not hardcoded. |
| Monthly spending cap per employee | Industry standard for abuse prevention. Without limits, the program is a liability. Fond, Empuls, Pimsical, and virtually all platforms enforce caps. | Medium | Track cumulative monthly spend per employee. Reset on month boundary. |
| Employee management (add, edit, deactivate) | Admin must control who has access. Table stakes for any user management system. | Medium | CRUD operations on employee records. Assign division, set status. |
| Discount validation at redemption | The code/QR must be validated against: active employee, eligible discount, remaining limit. Without validation, the system is just a QR printer. | High | Real-time check on scan/entry. Must handle edge cases (expired, over limit, deactivated). This is the critical path. |

### Analytics & Reporting (Admin)

| Feature | Why Expected | Complexity | Notes |
|---------|-------------|------------|-------|
| Usage summary dashboard | Admin needs at-a-glance view: total discounts used, total value, active employees. Every platform from Abenity to BenefitHub provides this. | Medium | Aggregate queries on usage data. Simple charts/numbers. |
| Per-employee usage report | HR/finance needs to see individual usage for compliance and audit. Standard in all enterprise discount platforms. | Low | Filterable table of employee usage. |
| Per-division usage breakdown | With 4 divisions at different rates, management needs to see cost per division. Standard for multi-division orgs. | Low | Group-by on division field. |
| Export to CSV/Excel | Finance teams live in spreadsheets. Every reporting tool exports. Non-negotiable for business users. | Low | Simple CSV generation from report data. |

---

## Differentiators

Features that set this platform apart from "just a spreadsheet with QR codes." Not expected on day one, but each adds meaningful value. Prioritize based on MPM's specific needs.

### Employee Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Offline QR code generation | Retail locations may have spotty connectivity (MPM requirement). QR generation is 100% client-side, so offline support is achievable with proper service worker caching. Differentiator because most SaaS platforms require connectivity. | Medium | Cache-first strategy for app shell + QR library. Pre-cache employee's discount data on login. Service worker intercepts and serves from cache. |
| Push notifications for new discounts/offers | Push notifications boost app engagement by 88% (industry data). Most employees forget to check the app. Notifications about seasonal offers or limit resets drive usage. | Medium | Web Push API via service worker. Supabase Edge Functions can trigger. Requires notification permission UX. |
| Bilingual support (English + Greek) | Cyprus-based company. Some employees may prefer Greek. Shows attention to local context. Most global platforms only support English or major languages. | Medium | i18n setup with next-intl or similar. Two language files. UI language toggle. |
| Savings tracker ("You've saved X this month/year") | Gamification element. Shows employees the value of the program. Fond and Empuls highlight savings prominently. Drives program satisfaction and retention. | Low | Simple calculation from usage history. Display prominently on dashboard. |
| Favorite brands/divisions quick access | Employees in PPD probably only care about Kerastase and L'Oreal Professionnel. Quick access reduces browsing time at POS. | Low | Save preferred divisions per employee. Show at top of discount list. |

### Admin & Management

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Discount scheduling (seasonal/temporary offers) | MPM can run holiday promotions, product launch discounts, or clearance offers. Adds flexibility beyond static per-division rates. | Medium | Start/end dates on discount rules. Cron or Edge Function checks expiry. |
| Division manager role (view-only for their division) | Gives division heads visibility into their team's usage without full admin access. Principle of least privilege. | Medium | Third role with filtered data access. RLS policy scoped to division. |
| Bulk employee import (CSV upload) | 100+ employees is too many to add one by one. One-time setup but critical for onboarding. | Low | Parse CSV, validate, create accounts in batch. Send invitation emails. |
| Audit trail / activity log | Every action (discount created, limit changed, employee deactivated) is logged with who/when. Critical for compliance and fraud investigation. Industry best practice per loss prevention research. | Medium | Append-only log table. Triggered on admin actions. Immutable records. |
| Configurable limit periods (monthly, quarterly, annual) | Some companies prefer quarterly or annual caps instead of monthly. Adds flexibility. | Low | Period type field on limit config. Adjust reset logic accordingly. |
| Per-location usage analytics | MPM has 10+ locations. Knowing which locations use discounts most helps with inventory and staffing decisions. | Medium | Requires location tracking on redemption. Either cashier selects location or GPS-based. |

### Discount Validation & Security

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Time-limited QR codes (expire after X minutes) | Prevents screenshot sharing. Employee must generate fresh code at POS. Major fraud prevention measure. | Low | Encode timestamp in QR. Validation rejects codes older than threshold (e.g., 5 minutes). |
| One-time use codes | Each generated code can only be redeemed once. Prevents reuse/sharing. | Medium | Mark code as used in database on redemption. Check before applying. |
| Cashier validation interface (simple scan + confirm) | Dedicated lightweight page for cashiers to scan QR and see "VALID" or "INVALID" with discount details. Faster than admin dashboard. | Medium | Separate route, minimal UI, camera access for scanning. No admin login needed -- uses location-based auth or PIN. |
| Abuse detection alerts | Flag employees with unusual patterns: too many redemptions per day, approaching limits suspiciously fast, redemptions at odd hours. | High | Threshold-based alerting. Admin notification when patterns detected. Requires defining "normal" baselines. |

---

## Anti-Features

Features to deliberately NOT build. These are common mistakes in this domain that add complexity without proportional value, or actively harm the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **External vendor marketplace** | MPM is not building PerkSpot. They sell their OWN brands. An external marketplace (restaurants, gyms, travel) is an entirely different product with vendor management, negotiation, and content curation overhead. | Focus exclusively on MPM's own brands/divisions. The discount catalog IS the company's product lines. |
| **Points/rewards system** | Fond and Empuls use points because they span hundreds of vendors. MPM has simple percentage discounts on their own products. Points add cognitive load ("how many points is this worth?") and backend complexity (point ledger, redemption rules, expiry). | Use straightforward percentage discounts with monetary caps. Simple, transparent, no conversion math. |
| **Social recognition / peer-to-peer rewards** | This is an employee engagement platform feature (Fond, WorkTango), not a discount management feature. Combining them creates a Frankenstein product that does neither well. | Keep scope tight: discounts only. Recognition is a separate initiative. |
| **Payment processing / in-app checkout** | Discounts are applied at POS by cashiers. The app is NOT an e-commerce store. Adding payment processing introduces PCI compliance, payment gateway integration, and massive complexity. | App generates validation codes. Cashier applies discount in existing POS system (Business Center Cloud). |
| **Inventory management / product catalog** | MPM already has Business Center Cloud for inventory. Duplicating product data creates sync nightmares and maintenance burden. | Discounts are per-division or per-brand, not per-SKU. No need for product catalog. |
| **Complex approval workflows** | The intake form explicitly states approval workflow: "No one." Adding manager approvals for every discount use adds friction and defeats the purpose of instant employee discounts. | Auto-approve within configured limits. Admin sets the rules upfront; system enforces automatically. |
| **Multi-tenant SaaS architecture** | This is a custom build for MPM. Building multi-tenant adds auth complexity, data isolation, tenant management, and pricing tiers -- none of which delivers value to this single customer. | Single-tenant. One database, one deployment, one customer. |
| **Native mobile apps (iOS/Android)** | App store approval takes weeks. Updates require re-submission. PWA covers 100% of the use cases (offline, installable, push notifications) without app store overhead. 100 employees does not justify dual native app maintenance. | PWA with service worker for offline support, web push for notifications, and add-to-home-screen for native feel. |
| **Real-time chat / support ticketing** | 100 employees at a company that has HR. Support requests go to HR via existing channels (email, in-person). Building a support system inside the discount app is over-engineering. | Add a simple "Contact HR" link with email/phone. |
| **Gamification (leaderboards, badges, streaks)** | Employee discounts are a benefit, not a competition. Leaderboards for "who used the most discount" creates perverse incentives and potential morale issues. | Simple personal savings tracker is sufficient. No comparative/competitive elements. |

---

## Feature Dependencies

Understanding which features must be built before others is critical for phase planning.

```
Authentication (must be first)
  |
  +-- Employee Management (requires auth system)
  |     |
  |     +-- Division Assignment (requires employee records)
  |           |
  |           +-- Per-Division Discount Config (requires divisions)
  |                 |
  |                 +-- Discount Browsing (requires discount config)
  |                       |
  |                       +-- QR Code Generation (requires discount selection)
  |                             |
  |                             +-- Discount Validation (requires QR/code + limits)
  |                                   |
  |                                   +-- Usage Tracking (requires validated redemptions)
  |                                         |
  |                                         +-- Analytics & Reporting (requires usage data)
  |                                         |
  |                                         +-- Monthly Limit Enforcement (requires usage tracking)
  |
  +-- PWA Setup (independent, can be parallel with above)
  |     |
  |     +-- Offline Support (requires PWA service worker)
  |     |
  |     +-- Push Notifications (requires service worker + permission)
  |
  +-- Audit Trail (can be added at any point, best early)
```

**Critical path:** Auth -> Employee Mgmt -> Discount Config -> QR Generation -> Validation -> Usage Tracking -> Limits -> Analytics

**Parallel work:** PWA setup, offline support, and UI design can happen alongside backend data modeling.

---

## MVP Recommendation

For the demo-first approach (present to MPM stakeholders), prioritize the complete critical path:

### Must Have (Demo)

1. **Authentication** -- Employee login, admin login, role separation
2. **Employee management** -- Admin adds/manages employees with division assignment
3. **Discount configuration** -- Per-division percentage rates, monthly spending caps
4. **Discount browsing** -- Employee sees available discounts by division
5. **QR code generation** -- Employee generates code for selected discount
6. **Manual code fallback** -- Alphanumeric code alongside QR
7. **Discount validation** -- Cashier scans/enters code, system validates
8. **Usage tracking** -- Every redemption logged with employee, division, amount, timestamp
9. **Remaining limit display** -- Employee sees how much of their monthly cap remains
10. **Basic admin dashboard** -- Usage summary, per-employee view, per-division view

### Should Have (v1 post-demo)

- PWA installability (add to home screen)
- Offline QR generation
- CSV export for reports
- Bulk employee import
- Time-limited QR codes (fraud prevention)
- Usage history for employees

### Nice to Have (v2+)

- Push notifications
- Bilingual (EN/GR)
- Division manager role
- Discount scheduling (seasonal offers)
- Audit trail
- Abuse detection alerts
- Per-location analytics
- POS integration with Business Center Cloud API

---

## Competitive Feature Matrix

How MPM's custom platform compares to off-the-shelf solutions for this specific use case:

| Feature | Fond/PerkSpot/Abenity | MPM Custom Build | Why Custom Wins |
|---------|----------------------|------------------|-----------------|
| Per-division discount rates | Not supported (external vendors only) | Core feature | MPM's divisions have different margins; generic platforms cannot model this |
| Monthly spending caps | Some support | Full control | Custom limits per employee, per division, configurable reset periods |
| Own-brand discounts | Not designed for this | Purpose-built | These platforms aggregate external vendor deals, not internal product discounts |
| QR validation at own POS | Not applicable | Core feature | Off-the-shelf platforms have no concept of MPM's retail locations |
| Offline capability | Requires internet | PWA with offline QR | Cyprus retail locations may have connectivity gaps |
| Cost | $250-$1500/mo + per-employee fees | One-time build | 100 employees at $3-6/user/month = $3,600-$7,200/year indefinitely |
| Customization | Limited to platform config | Unlimited | Any feature MPM needs can be built exactly as specified |
| Data ownership | Vendor-controlled | MPM-owned (Supabase) | Full control over employee data, usage data, and analytics |
| POS integration potential | None with Business Center Cloud | Future roadmap | Custom build can integrate with Business Center Cloud API when available |

**Verdict:** Off-the-shelf platforms (Fond, PerkSpot, Abenity) solve a different problem -- they aggregate external vendor discounts for employees. MPM needs to manage discounts on their own products across their own retail locations. A custom build is not just preferable; it is the only viable approach for this specific use case.

---

## Sources

### Platform Features & Comparisons
- [PerkSpot vs Fond Comparison (SelectHub)](https://www.selecthub.com/employee-recognition-software/perkspot-vs-fond/)
- [PerkSpot Reviews & Features 2026 (SpotSaaS)](https://www.spotsaas.com/product/perkspot)
- [Abenity Employee Perks Program](https://abenity.com/)
- [Top 6 Best Employee Discount Platforms 2026 (Xoxoday)](https://blog.xoxoday.com/empuls/best-employee-discount-platforms/)
- [Top 10 Employee Discount Programs (Corporate Offers)](https://corporateoffers.com/hr-professionals/articles/top-employee-discount-programs)
- [20 Best Employee Perks Programs 2026 (People Managing People)](https://peoplemanagingpeople.com/tools/best-employee-perks-program/)
- [BenefitHub Discount Marketplace](https://www.benefithub.com/benefithub-solutions/discount-marketplace)

### QR Code & Retail Redemption
- [QR Codes in Retail 2025 Guide (Shopify)](https://www.shopify.com/blog/qr-codes-in-retail)
- [Coupon QR Code Redemption Tracking (QRTRAC)](https://qrtrac.com/solutions/coupon-qr-code/)
- [QR Code Scanning Trends in Retail 2026 (QR Code Tiger)](https://www.qrcode-tiger.com/qr-code-scanning-trends-in-retail-and-ecommerce)
- [QR Code Coupons: Design, Distribute & Manage (PassKit)](https://passkit.com/blog/qr-code-coupon/)

### Fraud Prevention & Compliance
- [End Discount Abuse with Technology 2025 (Solink)](https://solink.com/resources/spot-discount-abuse/)
- [How to Conquer Discount Fraud (Agilence)](https://blog.agilenceinc.com/how-to-conquer-discount-fraud)
- [Using Data to Stop Discount Fraud (LP Magazine)](https://losspreventionmedia.com/using-data-to-stop-four-types-of-discount-fraud/)
- [How to Detect & Prevent Employee Fraud 2025 (Teramind)](https://www.teramind.co/blog/employee-fraud/)

### Policy & Audit
- [Employee Discount Policy Best Practices (ChangeEngine)](https://www.changeengine.com/articles/employee-discount-and-perks-policy-guide-best-practices)
- [Employee Discount Policy Template (Monitask)](https://www.monitask.com/en/forms/employee-discount-policy-template)
- [Audit Trail Requirements & Best Practices (InScope)](https://www.inscopehq.com/post/audit-trail-requirements-guidelines-for-compliance-and-best-practices)

### PWA & Offline
- [PWA Offline Functionality: Caching Strategies (ZeePalm)](https://www.zeepalm.com/blog/pwa-offline-functionality-caching-strategies-checklist)
- [Offline-First PWAs: Service Worker Caching (MagicBell)](https://www.magicbell.com/blog/offline-first-pwas-service-worker-caching-strategies)
- [Progressive Web App Tutorial 2025 (MarkAICode)](https://markaicode.com/progressive-web-app-tutorial-2025-service-worker-offline/)

### Notifications & Engagement
- [Push Notifications for Employee Benefits (Backstitch)](https://www.backstitch.io/blog/3-ways-to-use-push-notifications-to-communicate-employee-benefits)
- [Push Notifications for Internal Communication (Staffbase)](https://staffbase.com/blog/why-how-and-what-to-use-push-notifications-for-in-internal-communication)
- [Case for Push Notifications: Employee Experience (TheEmployeeApp)](https://theemployeeapp.com/blog/the-case-for-push-notifications-improving-employee-experience/)
