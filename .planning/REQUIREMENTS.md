# MPM Employee Discount Platform -- Requirements

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Employee can log in with email/password and stay logged in across sessions
- [x] **AUTH-02**: Employee can reset password via email link
- [x] **AUTH-03**: Employee can log out from any page
- [x] **AUTH-04**: Admin can create employee accounts (no self-registration)
- [x] **AUTH-05**: System enforces role-based access (Admin sees admin routes, Employee sees employee routes)

### Employee Experience

- [ ] **EMP-01**: Employee can browse available discounts filtered by their assigned divisions
- [ ] **EMP-02**: Employee can generate a time-limited QR code (60-120 sec expiry) for discount redemption
- [ ] **EMP-03**: Employee can view a manual code (MPM-XXXX format) as fallback alongside QR
- [ ] **EMP-04**: Employee can view their usage history (past transactions)
- [ ] **EMP-05**: Employee can see their remaining monthly spending limit prominently displayed

### Discount Management

- [ ] **DISC-01**: Admin can configure discount percentages per division (e.g., 20% CPD, 15% Fashion)
- [ ] **DISC-02**: Admin can set monthly spending caps per employee
- [ ] **DISC-03**: System enforces one discount per transaction (no stacking)
- [ ] **DISC-04**: Generated codes are single-use (marked used atomically on redemption)

### Validation & POS

- [ ] **VAL-01**: Cashier can scan employee QR code via camera on admin validation screen
- [ ] **VAL-02**: Cashier can enter manual code as fallback when scanner unavailable
- [ ] **VAL-03**: System validates discount in <2 seconds (active employee, eligible discount, within spending cap)
- [ ] **VAL-04**: Validation screen shows clear success/failure with employee name, discount applied, remaining limit
- [ ] **VAL-05**: Every redemption is recorded as a transaction (employee, division, amounts, location, timestamp)

### Admin Dashboard

- [ ] **ADM-01**: Admin can add, edit, and deactivate employee accounts
- [ ] **ADM-02**: Admin can assign employees to one or more divisions
- [ ] **ADM-03**: Admin can manage divisions and brands (CRUD)
- [ ] **ADM-04**: Admin can bulk import employees via CSV upload
- [ ] **ADM-05**: Admin can view usage summary dashboard (total spend, active employees, discounts this month)
- [ ] **ADM-06**: Admin can view per-employee spending report with date filtering
- [ ] **ADM-07**: Admin can view per-division usage breakdown
- [ ] **ADM-08**: Admin can export any report to CSV

### PWA & Offline

- [ ] **PWA-01**: App is installable as PWA on mobile devices
- [ ] **PWA-02**: Employee can browse cached discounts when offline
- [ ] **PWA-03**: App shows online/offline status indicator
- [ ] **PWA-04**: Previously generated QR codes viewable offline from cache

---

## v2 Requirements (Deferred)

- Discount scheduling (seasonal offers with start/end dates)
- Division manager role (view-only access for their division)
- Audit trail / activity log (who changed what, when)
- Abuse detection alerts (flagging unusual usage patterns)
- Per-location analytics (usage broken down by retail location)
- POS integration with Business Center Cloud API
- Push notifications for new discounts
- Bilingual support (English + Greek)

## Out of Scope

- **External vendor marketplace** -- MPM sells own brands, not aggregating third-party deals
- **Points/rewards system** -- Simple percentage discounts are transparent, no gamification
- **Social recognition / peer rewards** -- Employee engagement feature, not discount management
- **Payment processing / in-app checkout** -- Discounts applied at POS by cashier, not an e-commerce store
- **Multi-tenant SaaS** -- Custom build for MPM only
- **Native mobile apps (iOS/Android)** -- PWA covers all use cases
- **Gamification (leaderboards, badges)** -- Discounts are a benefit, not a competition

## Traceability

| REQ ID | Phase | Status |
|--------|-------|--------|
| AUTH-01 | Phase 1: Foundation | Complete |
| AUTH-02 | Phase 1: Foundation | Complete |
| AUTH-03 | Phase 1: Foundation | Complete |
| AUTH-04 | Phase 1: Foundation | Complete |
| AUTH-05 | Phase 1: Foundation | Complete |
| EMP-01 | Phase 3: Employee Experience | Pending |
| EMP-02 | Phase 3: Employee Experience | Pending |
| EMP-03 | Phase 3: Employee Experience | Pending |
| EMP-04 | Phase 3: Employee Experience | Pending |
| EMP-05 | Phase 3: Employee Experience | Pending |
| DISC-01 | Phase 2: Admin Core | Pending |
| DISC-02 | Phase 2: Admin Core | Pending |
| DISC-03 | Phase 2: Admin Core | Pending |
| DISC-04 | Phase 4: Validation Engine | Pending |
| VAL-01 | Phase 4: Validation Engine | Pending |
| VAL-02 | Phase 4: Validation Engine | Pending |
| VAL-03 | Phase 4: Validation Engine | Pending |
| VAL-04 | Phase 4: Validation Engine | Pending |
| VAL-05 | Phase 4: Validation Engine | Pending |
| ADM-01 | Phase 2: Admin Core | Pending |
| ADM-02 | Phase 2: Admin Core | Pending |
| ADM-03 | Phase 2: Admin Core | Pending |
| ADM-04 | Phase 2: Admin Core | Pending |
| ADM-05 | Phase 6: Analytics & Reporting | Pending |
| ADM-06 | Phase 6: Analytics & Reporting | Pending |
| ADM-07 | Phase 6: Analytics & Reporting | Pending |
| ADM-08 | Phase 6: Analytics & Reporting | Pending |
| PWA-01 | Phase 5: PWA & Offline | Pending |
| PWA-02 | Phase 5: PWA & Offline | Pending |
| PWA-03 | Phase 5: PWA & Offline | Pending |
| PWA-04 | Phase 5: PWA & Offline | Pending |

---
*31 v1 requirements across 6 categories*
*Last updated: 2026-02-04*
