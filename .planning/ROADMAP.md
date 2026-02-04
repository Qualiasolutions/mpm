# Roadmap: MPM Employee Discount Platform

## Overview

The MPM Employee Discount Platform delivers a mobile-first PWA for 100+ employees to access and redeem discounts across 4 divisions, paired with an admin dashboard for configuration and analytics. The build follows a strict dependency chain: database and auth foundation first, then admin control plane (employees must exist before they can use discounts), then employee-facing features, then the validation engine that delivers the core value (discount at POS), and finally polish layers (PWA offline support and analytics reporting). Phases 1-4 constitute the demo-ready MVP; Phases 5-6 add production polish and can execute in parallel.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Database schema, authentication, security architecture, and role-based access
- [ ] **Phase 2: Admin Core** - Employee management, division/brand CRUD, and discount rule configuration
- [ ] **Phase 3: Employee Experience** - Discount browsing, QR code generation, manual codes, and usage tracking
- [ ] **Phase 4: Validation Engine** - QR scanning, code validation, transaction recording, and spending limit enforcement
- [ ] **Phase 5: PWA & Offline** - Installable PWA, service worker caching, offline browsing, and connectivity indicators
- [ ] **Phase 6: Analytics & Reporting** - Usage dashboards, per-employee and per-division reports, CSV export

## Phase Details

### Phase 1: Foundation
**Goal**: Employees and admins can securely authenticate, and the system enforces role-based access with a correct data model that prevents security exploits from day one
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Employee can log in with email/password and remain authenticated across browser sessions (closing and reopening the app)
  2. Employee can reset a forgotten password by receiving an email link and setting a new password
  3. Employee can log out from any page in the application and be redirected to the login screen
  4. Admin can create a new employee account (employees cannot self-register)
  5. Navigating to an admin route as an employee shows access denied; navigating to an employee route as an unauthenticated user redirects to login
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding, Supabase clients, middleware, database migration
- [x] 01-02-PLAN.md -- Auth pages (login, password reset, update password) and Server Actions
- [x] 01-03-PLAN.md -- Role-based access layouts, admin employee creation, navigation
- [x] 01-04-PLAN.md -- Push to GitHub and deploy to Vercel

### Phase 2: Admin Core
**Goal**: Admins can fully manage the employee roster, organizational structure, and discount rules so the system is ready for employees to use
**Depends on**: Phase 1
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, DISC-01, DISC-02, DISC-03
**Success Criteria** (what must be TRUE):
  1. Admin can add a new employee, edit their details, and deactivate their account from the dashboard
  2. Admin can assign an employee to one or more divisions and remove division assignments
  3. Admin can create, edit, and delete divisions and brands in the system
  4. Admin can upload a CSV file to bulk-import multiple employee accounts at once
  5. Admin can set a discount percentage per division (e.g., 20% for CPD, 15% for Fashion) and a monthly spending cap per employee
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Employee Experience
**Goal**: Employees can browse their available discounts, generate redemption codes, and track their spending against monthly limits
**Depends on**: Phase 2
**Requirements**: EMP-01, EMP-02, EMP-03, EMP-04, EMP-05
**Success Criteria** (what must be TRUE):
  1. Employee sees only discounts for divisions they are assigned to, with clear division/brand filtering
  2. Employee can generate a time-limited QR code (60-120 second expiry) for a selected discount
  3. Employee can see a manual code (MPM-XXXX format) displayed alongside the QR code as a fallback
  4. Employee can view a history of their past discount transactions
  5. Employee can see their remaining monthly spending limit prominently on their dashboard
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Validation Engine
**Goal**: Cashiers can validate employee discount codes at POS, and every redemption is atomically recorded with spending limits enforced in real time
**Depends on**: Phase 1, Phase 2, Phase 3
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, DISC-04
**Success Criteria** (what must be TRUE):
  1. Cashier can scan an employee QR code using a camera on the validation screen and see the result within 2 seconds
  2. Cashier can enter a manual code as fallback when scanner is unavailable, with the same validation result
  3. Validation screen shows a clear success state (employee name, discount percentage, amount saved, remaining monthly limit) or a clear failure state (specific reason: expired, already used, over limit, inactive employee)
  4. Each generated code can only be redeemed once -- attempting to reuse a code shows "already used" error
  5. Every successful redemption is recorded as a transaction with employee, division, amounts, location, and timestamp
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: PWA & Offline
**Goal**: Employees can install the app on their phones and continue browsing discounts even with spotty connectivity at retail locations
**Depends on**: Phase 3
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04
**Success Criteria** (what must be TRUE):
  1. Employee can install the app to their phone's home screen via browser install prompt (Android and iOS)
  2. Employee can browse previously loaded discounts when the device has no internet connection
  3. App displays a visible online/offline status indicator so the employee knows their connectivity state
  4. Previously generated QR codes are viewable from cache when offline
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Analytics & Reporting
**Goal**: Admins can understand discount program usage through dashboards and exportable reports for finance and HR
**Depends on**: Phase 4
**Requirements**: ADM-05, ADM-06, ADM-07, ADM-08
**Success Criteria** (what must be TRUE):
  1. Admin can view a usage summary dashboard showing total spend, number of active employees, and discounts redeemed this month
  2. Admin can view a per-employee spending report and filter it by date range
  3. Admin can view a per-division usage breakdown showing which divisions have the most/least discount activity
  4. Admin can export any report view to a CSV file for use in spreadsheets
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases 1 through 4 execute sequentially (dependency chain). Phases 5 and 6 can execute in parallel after their dependencies are met.

1 -> 2 -> 3 -> 4 -> 5 (parallel with 6) -> 6 (parallel with 5)

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation | 4/4 | Complete | 2026-02-04 |
| 2. Admin Core | 0/TBD | Not started | - |
| 3. Employee Experience | 0/TBD | Not started | - |
| 4. Validation Engine | 0/TBD | Not started | - |
| 5. PWA & Offline | 0/TBD | Not started | - |
| 6. Analytics & Reporting | 0/TBD | Not started | - |
