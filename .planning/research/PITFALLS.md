# Domain Pitfalls: Employee Discount Management Platform

**Domain:** Employee discount management (QR/code-based redemption, spending caps, multi-division)
**Context:** MPM Distributors, Cyprus, 100+ employees, 10+ locations, 4 brand divisions
**Researched:** 2026-02-04

---

## Critical Pitfalls

Mistakes that cause security breaches, financial loss, or require rewrites.

---

### Pitfall 1: QR Code Replay / Screenshot Sharing

**What goes wrong:** Static QR codes get screenshotted and shared. An employee generates a QR code, screenshots it, and sends it to a friend or family member who presents it at a different location. Or worse, a single QR code gets posted in a group chat and dozens of non-employees use it.

**Why it happens:** Teams encode the discount directly into the QR (e.g., `DISCOUNT_20_CPD`) or use a long-lived token that remains valid for hours/days. The QR itself becomes the "key" rather than a pointer to a server-validated session.

**Consequences:**
- Unauthorized discount usage by non-employees
- Spending caps bypassed because the system tracks the QR, not the person
- Financial losses that are invisible until someone audits transaction volumes
- Entire discount program credibility undermined with management

**Prevention:**
1. **Never encode the discount in the QR.** The QR is a gateway, not the coupon. It should contain only an opaque, single-use token ID.
2. **Short TTL tokens (60-120 seconds).** Generate a server-side token with cryptographic randomness, embed only the token ID in the QR. Token expires quickly, forcing regeneration.
3. **Single-use enforcement.** Once a token is scanned/redeemed, it is immediately invalidated server-side. Subsequent scans return "already used."
4. **Session binding.** Token must be tied to the authenticated employee's session. Even if someone has the token ID, redemption checks that the originating user is still authenticated.
5. **Regenerating QR on each view.** When the employee opens the QR screen, generate a fresh token. Previous token is invalidated.

**Detection (warning signs):**
- Multiple redemptions from the same QR token
- Redemptions from different locations within minutes for the same employee
- Redemption attempts after token expiry spikes

**Which phase should address it:** Phase 1 (core architecture). The token model must be designed correctly from the start. Retrofitting single-use tokens onto a static QR system is a rewrite.

**Confidence:** HIGH -- well-documented pattern in coupon/voucher security literature.

**Sources:**
- [Voucherify - QR coupons that don't get screenshot-abused](https://www.voucherify.io/blog/use-qr-codes-to-integrate-promotions-in-your-mobile-app)
- [OASIS Secure QR Code Authentication Protocol (SQRAP)](https://docs.oasis-open.org/esat/sqrap/v1.0/csd01/sqrap-v1.0-csd01.html)

---

### Pitfall 2: Spending Cap Race Conditions

**What goes wrong:** An employee has EUR 10 remaining on their monthly cap. They open the app on two devices (or two browser tabs) simultaneously and generate two discount codes for EUR 8 each. Both requests read the current balance as EUR 10 remaining, both pass the check, and both get approved -- exceeding the cap by EUR 6.

**Why it happens:** The classic "read-modify-write" race condition. The spending limit check and the spending deduction are not atomic. Two concurrent requests both read the "remaining" value before either writes the update.

**Consequences:**
- Spending caps are systematically bypassable
- Monthly budgets blown, potentially costing thousands across 100+ employees
- Management loses trust in the system's enforcement capability
- Accounting discrepancies between system reports and actual spending

**Prevention:**
1. **Use a Postgres function (RPC) for all spending operations.** Wrap the check-and-debit in a single atomic database function called via Supabase `.rpc()`.
2. **Use `SELECT ... FOR UPDATE` on the employee's spending record.** This acquires a row-level lock, preventing concurrent reads of stale data.
3. **Alternative: Postgres advisory locks.** `pg_advisory_xact_lock(employee_id)` ensures only one spending operation per employee executes at a time.
4. **Never do the check in application code.** Don't read the balance in JavaScript, check it, then write. The entire check-approve-deduct flow must execute within a single database transaction.

**Example (correct pattern):**
```sql
CREATE OR REPLACE FUNCTION redeem_discount(
  p_employee_id UUID,
  p_amount DECIMAL,
  p_division_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_remaining DECIMAL;
  v_cap DECIMAL;
BEGIN
  -- Lock the employee's spending record
  SELECT monthly_cap, monthly_cap - current_spend
  INTO v_cap, v_remaining
  FROM employee_spending
  WHERE employee_id = p_employee_id
    AND period = date_trunc('month', NOW())
  FOR UPDATE;

  IF v_remaining < p_amount THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cap_exceeded', 'remaining', v_remaining);
  END IF;

  -- Atomic deduction
  UPDATE employee_spending
  SET current_spend = current_spend + p_amount
  WHERE employee_id = p_employee_id
    AND period = date_trunc('month', NOW());

  -- Record the transaction
  INSERT INTO discount_transactions (employee_id, amount, division_id, redeemed_at)
  VALUES (p_employee_id, p_amount, p_division_id, NOW());

  RETURN jsonb_build_object('success', true, 'remaining', v_remaining - p_amount);
END;
$$ LANGUAGE plpgsql;
```

**Detection (warning signs):**
- Any spending limit check that involves a separate SELECT then UPDATE
- Application-level (JavaScript/TypeScript) balance checks before database writes
- Unit tests that only test sequential operations, never concurrent ones

**Which phase should address it:** Phase 1 (data model and core functions). The spending enforcement must be atomic from day one. This is the single most important backend function in the system.

**Confidence:** HIGH -- standard database concurrency problem with well-known solutions.

**Sources:**
- [Sourcery - Race Condition Vulnerabilities in Financial Transactions](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions)
- [Ketan Bhatt - DB Concurrency Defects Catalogue](https://www.ketanbhatt.com/p/db-concurrency-defects)
- [SupaExplorer - Advisory Locks Best Practice](https://supaexplorer.com/best-practices/supabase-postgres/lock-advisory/)

---

### Pitfall 3: Supabase RLS Misconfiguration Exposing Employee Data

**What goes wrong:** Tables are created without RLS enabled, or RLS is enabled but policies are missing or incorrectly written. An authenticated employee can read other employees' spending data, discount usage, or personal information. Or worse, the anon key (exposed in client-side code) grants unrestricted access to the database.

**Why it happens:** Supabase creates tables with RLS disabled by default. During rapid development, teams create tables, build features, and forget to add policies. Supabase auto-generates REST APIs from the schema -- without RLS, the anon key becomes a master key to the entire database.

**Consequences:**
- Employee personal data exposed (GDPR violation in EU/Cyprus context)
- Employees can see each other's spending and discount usage
- Malicious users can manipulate their own spending records
- 83% of exposed Supabase databases involve RLS misconfigurations (2025 audit)

**Prevention:**
1. **Enable RLS in the same migration that creates each table.** Never create a table without immediately enabling RLS and adding at least a deny-all policy.
2. **Write policies that check `auth.uid()`.** Employees should only see their own records. Admins need separate policies with role checks.
3. **Never use `user_metadata` in RLS policies.** It can be modified by authenticated users. Use a separate `profiles` or `user_roles` table with server-controlled data.
4. **Never expose `service_role` key to client code.** It bypasses ALL RLS.
5. **Views bypass RLS by default.** If you use views, set `security_invoker = true` (Postgres 15+).
6. **Security definer functions bypass RLS.** Never create them in the `public` schema exposed via the API.
7. **Test RLS locally with the Supabase CLI.** Create test users and verify they cannot access other users' data.

**Detection (warning signs):**
- Any migration file that creates a table without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- RLS policies using `user_metadata` claims
- `service_role` key appearing in any `.env` file with `NEXT_PUBLIC_` prefix
- Views without `security_invoker = true`

**Which phase should address it:** Phase 1 (database setup). RLS must be a hard rule from the first migration. Every table, every time.

**Confidence:** HIGH -- documented in Supabase's own security retro and multiple CVEs.

**Sources:**
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro)
- [170+ Apps Exposed by Missing RLS (CVE-2025-48757)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

### Pitfall 4: Discount Stacking and Policy Gap Exploitation

**What goes wrong:** The system allows multiple discounts to be applied to the same transaction, or discount rules interact in unintended ways. For example: an employee gets 20% CPD division discount, plus a 10% seasonal promotion, plus a loyalty coupon -- items end up sold at 90% below cost.

**Why it happens:** Discount rules are modeled as independent entities without interaction constraints. The system checks "is this discount valid?" for each one individually but never asks "what's the total discount on this transaction?"

**Consequences:**
- Items sold far below cost (one retailer lost $250,000 annually from a single stacking exploit)
- Margin erosion that's invisible until quarterly financial review
- Creates perverse incentives where employees game the system

**Prevention:**
1. **Define a maximum total discount percentage per transaction.** Hardcode a ceiling (e.g., no transaction can exceed 40% total discount).
2. **Implement a "best offer wins" policy.** When multiple discounts could apply, the system selects the best single discount, not a combination.
3. **v1 simplicity: one discount type per transaction.** For MPM's standalone v1, an employee gets their division rate and nothing else. No stacking, no coupons, no promotions layered on top.
4. **Model discount rules with explicit interaction constraints.** The `discount_rules` table should include `stackable: boolean` and `max_combined_discount: decimal` fields.
5. **Discount application order matters.** If you ever allow stacking: percentage discounts must apply before fixed-amount discounts. The reverse gives larger total discounts.

**Detection (warning signs):**
- No `max_discount` ceiling in the data model
- Multiple discount types without interaction rules
- Discount logic that applies each discount independently in a loop

**Which phase should address it:** Phase 1 (data model design). Even if v1 only has one discount type per division, the data model should enforce non-stacking from the start.

**Confidence:** HIGH -- extensively documented in retail loss prevention literature.

**Sources:**
- [Agilence - How to Conquer Discount Fraud](https://blog.agilenceinc.com/how-to-conquer-discount-fraud)
- [Solink - End Discount Abuse Today](https://solink.com/resources/spot-discount-abuse/)

---

## Moderate Pitfalls

Mistakes that cause significant rework, poor adoption, or ongoing technical debt.

---

### Pitfall 5: Rigid Data Model for Multi-Division Hierarchy

**What goes wrong:** The data model hardcodes the 4 divisions as an enum or static configuration. When MPM reorganizes (new division, merged divisions, sub-brands getting their own rates), the schema requires migration and code changes rather than admin configuration.

**Why it happens:** Teams model the known current state (4 divisions) rather than the general concept (a configurable organizational hierarchy with discount rules). Adjacency list / self-referencing models are harder to build initially.

**Consequences:**
- Every organizational change requires a developer
- Admin dashboard cannot adapt without code deploys
- Sub-brand or location-specific discount rules become impossible without refactoring

**Prevention:**
1. **Model divisions/brands as a database table, not an enum.** `divisions` table with admin CRUD, not `type Division = 'CPD' | 'PPD' | 'ACD' | 'FASHION'`.
2. **Use a flexible hierarchy.** Division -> Brand -> Product Category as a tree structure (adjacency list with `parent_id`). Discount rules can attach at any level.
3. **Discount rules reference the division/brand table via foreign key.** Admin creates/modifies divisions and their discount rates through the dashboard, zero code changes.
4. **Keep it simple for v1 but extensible.** Start with a flat divisions table. The adjacency list parent_id can be added later without breaking existing data.

**Detection (warning signs):**
- Division names or IDs in TypeScript enums or constants files
- Hardcoded division logic in business rules (if/switch statements)
- No admin UI for managing divisions

**Which phase should address it:** Phase 1 (data model). The divisions table is foundational. Get it right early.

**Confidence:** HIGH -- standard data modeling knowledge.

---

### Pitfall 6: Offline QR Generation Without Proper Sync

**What goes wrong:** The PWA generates QR codes offline (per PROJECT.md requirement), but the tokens cannot be validated because the server is unreachable. Options are bad: either the cashier accepts an unvalidated QR (fail-open, exploitable) or rejects it (fail-closed, frustrating). When connectivity returns, offline-generated tokens may conflict with server state.

**Why it happens:** "Must work offline" is listed as a constraint, but the security model (single-use server-validated tokens) fundamentally requires server communication. These two requirements are in direct tension.

**Consequences:**
- Fail-open: employees (or anyone with a screenshot) get unvalidated discounts
- Fail-closed: employees frustrated when they can't use discounts during connectivity issues
- Sync conflicts: offline transactions may exceed spending caps when reconciled
- Double-spending: same offline token used at multiple locations before sync

**Prevention:**
1. **Clearly define what "offline" means for this system.** Recommendation: offline means the employee can VIEW their discount rates and history. QR GENERATION requires connectivity (even brief -- the token roundtrip takes <500ms).
2. **If truly offline QR is required:** Pre-generate a small pool of time-limited tokens when online. Store them locally (IndexedDB). Each offline QR uses one pre-generated token. When the pool is empty, employee must go online.
3. **Fail-closed is the right default for a discount system.** Unlike e-commerce where lost sales cost money, an employee discount that can't validate right now can wait 30 seconds for connectivity. The cost of fraud exceeds the cost of brief inconvenience.
4. **Manual code fallback for true offline.** If the QR can't be generated, the cashier can manually enter the employee's ID. The cashier's POS records the transaction for later reconciliation. This requires trust in the cashier but mirrors the current manual process.
5. **Offline spending buffer.** If offline transactions are allowed, deduct from a conservative "offline budget" (e.g., EUR 20) that's much lower than the actual monthly cap. This limits exposure.

**Detection (warning signs):**
- No clear decision document on offline behavior
- QR tokens generated purely client-side without server interaction
- No distinction between "offline viewing" and "offline transacting"

**Which phase should address it:** Phase 1 (architecture decisions). The offline strategy must be decided before building the QR flow. It affects the entire token model.

**Confidence:** MEDIUM -- the specific tradeoff between offline capability and security validation is context-dependent. The prevention strategies are well-established patterns, but the right choice for MPM depends on how reliable connectivity is at their 10+ locations.

**Sources:**
- [GTCSys - Data Synchronization in PWAs: Offline-First Strategies](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [Monterail - PWA Offline Dynamic Data](https://www.monterail.com/blog/pwa-offline-dynamic-data)

---

### Pitfall 7: Sweethearting and Proxy Usage

**What goes wrong:** Employees share their login credentials with friends/family, or generate discount codes for non-employees to use. Unlike QR replay (Pitfall 1), this is an authorized user intentionally misusing the system. The code is legitimately generated -- it's the person presenting it who's unauthorized.

**Why it happens:** Without POS integration, there's no way to verify that the person at the register is the employee who generated the code. The cashier is the only verification layer, and cashiers may not know all 100+ employees.

**Consequences:**
- Discount program costs balloon as non-employees use discounts
- Spending caps appear to be working (tracking to the employee) but actual beneficiaries are unauthorized
- Most common form of employee discount abuse in retail

**Prevention:**
1. **Accept this risk explicitly for v1.** Without POS integration, perfect prevention is impossible. The current manual system has the same problem.
2. **Employee photo on the QR screen.** When the QR is displayed, show the employee's name and photo. Cashier does a visual check. Low-tech but effective deterrent.
3. **Location-based validation.** If the employee's phone GPS shows them at the store when the QR is generated, it's more likely legitimate. Not foolproof but raises the bar.
4. **Analytics-based detection.** Flag employees whose spending patterns are anomalous: consistently hitting cap, purchasing across unusual categories, redeeming at locations where they don't work.
5. **Policy acknowledgment.** Require employees to accept terms that misuse results in termination of discount privileges. Deterrence, not prevention.

**Detection (warning signs):**
- No employee identity verification at point of redemption
- No photo or identifying information on the QR display screen
- No anomaly detection in spending analytics

**Which phase should address it:** Phase 2 (after core is working). The photo-on-QR-screen is simple and should be early. Analytics-based detection is a Phase 3 feature.

**Confidence:** HIGH -- sweethearting is the most documented form of employee discount abuse.

**Sources:**
- [Solink - 60 Best Loss Prevention Tips for 2025](https://solink.com/resources/loss-prevention-tips/)
- [Solink - End Discount Abuse Today](https://solink.com/resources/spot-discount-abuse/)

---

### Pitfall 8: Monthly Cap Reset Edge Cases

**What goes wrong:** The monthly spending cap resets at midnight on the 1st. But transactions initiated on Jan 31 at 23:58 that complete on Feb 1 at 00:02 get counted in the wrong month. Or timezone differences between server (UTC) and Cyprus (EET/EEST, UTC+2/+3) cause caps to reset at the wrong time for employees.

**Why it happens:** Date/time boundary logic is deceptively tricky. Developers use `date_trunc('month', NOW())` without considering timezones, or store timestamps in local time without timezone info.

**Consequences:**
- Employees get "free" extra spending at month boundaries
- Cap resets at 2am or 3am Cyprus time (confusing for employees)
- Reports show different totals depending on which timezone is used for aggregation
- DST transitions cause caps to reset an hour early or late twice per year

**Prevention:**
1. **Store all timestamps as `timestamptz` (with timezone).** Postgres stores these in UTC internally.
2. **Define cap periods in Cyprus timezone explicitly.** `date_trunc('month', NOW() AT TIME ZONE 'Europe/Nicosia')` for period boundaries.
3. **Lock spending to the period when the token was GENERATED, not redeemed.** If an employee generates a token at 23:58 on Jan 31, it counts against January regardless of when the cashier scans it.
4. **Add a small grace period.** Tokens generated in the last 5 minutes of a month are still valid but count against the old period.
5. **Test DST transitions explicitly.** Cyprus observes daylight saving time. Write tests for the last Sunday of March and October.

**Detection (warning signs):**
- `timestamp` columns instead of `timestamptz`
- No timezone specification in date_trunc calls
- No tests for month-boundary behavior
- Cap period defined as "last 30 days" instead of calendar month

**Which phase should address it:** Phase 1 (data model). Getting timestamps and period boundaries right from the start prevents data migration headaches later.

**Confidence:** HIGH -- timezone and date boundary bugs are among the most common in any system dealing with periodic limits.

---

## Minor Pitfalls

Mistakes that cause friction, poor UX, or require cleanup but don't break the system.

---

### Pitfall 9: Poor Cashier Experience Kills Adoption

**What goes wrong:** The system works perfectly for employees and admins but the cashier -- the critical human in the middle -- has a terrible experience. Scanning is slow, validation results are unclear, error messages are cryptic, and the cashier holds up the line.

**Why it happens:** The cashier interface is treated as an afterthought. Development focuses on the employee PWA and admin dashboard. But in a standalone system without POS integration, the cashier's validation step IS the entire enforcement mechanism.

**Consequences:**
- Cashiers start skipping validation to avoid checkout delays
- Manual workarounds emerge (cashiers just apply discount without scanning)
- System becomes "installed but not used" -- worst possible outcome
- Reversion to the old manual process

**Prevention:**
1. **Design the cashier validation screen first, not last.** It's the most time-sensitive interface in the system.
2. **Binary result: big green checkmark or big red X.** No ambiguous states, no reading required. Show discount percentage, employee name, and division in large text.
3. **Validation must complete in <2 seconds.** If it takes longer, cashiers will stop using it.
4. **Audible feedback.** Success/failure sounds so the cashier doesn't need to stare at the screen.
5. **Simple fallback flow.** If QR scan fails, "Enter code manually" is one tap away with a numeric keypad.

**Detection (warning signs):**
- No dedicated cashier-facing interface in the wireframes
- Cashier uses the same app/interface as the employee
- No performance budget for validation response time
- No UX testing with actual cashiers

**Which phase should address it:** Phase 1. If the cashier experience is bad at demo time, the project won't get approved.

**Confidence:** HIGH -- universal UX principle, reinforced by retail technology adoption patterns.

---

### Pitfall 10: Admin Dashboard Overengineered for v1

**What goes wrong:** The admin dashboard tries to do everything: real-time analytics, complex reporting, bulk employee imports, configurable notification rules, approval workflows. Development takes 3x longer than planned, the demo gets delayed, and 80% of admin features go unused.

**Why it happens:** Admin dashboards are scope magnets. Every stakeholder has "just one more thing" they want to see. Without strict MVP discipline, the dashboard becomes the longest phase.

**Consequences:**
- Demo delayed by weeks/months
- Admin features built that are never used
- Core employee experience gets less attention
- Budget exhausted before POS integration phase

**Prevention:**
1. **v1 admin dashboard: 4 screens maximum.**
   - Employee management (list, add, deactivate)
   - Discount configuration (division rates, spending caps)
   - Usage overview (simple table with filters, not a BI tool)
   - Settings (basic system config)
2. **No custom report builder.** CSV export of raw data is sufficient for v1. HR can use Excel.
3. **No approval workflows.** Admin adds employee, employee is active. Simple.
4. **Analytics = simple aggregations.** Total spend this month, per division, per employee. No charts needed for v1 demo.
5. **Defer: bulk import, email notifications, audit logs, role-based admin permissions.**

**Detection (warning signs):**
- Admin dashboard has more screens planned than the employee app
- Charting libraries in the v1 dependency list
- "Reporting" as a major phase rather than a simple data export
- Multiple admin role types being discussed for v1

**Which phase should address it:** Phase planning. Explicitly define what's in v1 admin vs. deferred.

**Confidence:** HIGH -- universal product development pattern.

---

### Pitfall 11: Ignoring the Demo-to-Production Gap

**What goes wrong:** The demo uses seed data, runs on localhost or a free Supabase tier, skips error handling, and has no monitoring. It looks great in the presentation. Then the stakeholder says "ship it" and the team realizes the demo IS the production system with no observability, no backup strategy, no rate limiting, and no error tracking.

**Why it happens:** PROJECT.md says "demo-first." The temptation is to build the demo as a throwaway prototype. But with Next.js + Supabase + Vercel, the demo architecture IS the production architecture -- there's no "rewrite for production" step.

**Consequences:**
- Scramble to add production basics after approval
- Data loss from no backup strategy
- Security vulnerabilities from skipped hardening
- Performance issues under real load (100+ employees, multiple locations)

**Prevention:**
1. **Build the demo AS the production system.** With this stack (Next.js, Supabase, Vercel), there's no reason to throw away the demo code. The demo should be the production app with seed data.
2. **Production checklist from Phase 1:**
   - RLS on every table (see Pitfall 3)
   - Environment variables for all secrets (never hardcoded)
   - Error boundaries in React (user-friendly error states)
   - Supabase daily backups enabled
   - Rate limiting on auth endpoints
   - Basic logging (Vercel's built-in is sufficient for v1)
3. **Seed data strategy.** Create a seed script that generates realistic test data. Same script works for demo and development.
4. **No "demo hacks."** If something needs a workaround for the demo, log it as tech debt. Don't ship `// TODO: fix before production` comments.

**Detection (warning signs):**
- Separate "demo" and "production" branches
- Hardcoded API keys or test data in source code
- No error handling in API routes
- No backup configuration on Supabase project
- `// TODO` or `// HACK` comments in shipped code

**Which phase should address it:** All phases. Production readiness is not a phase -- it's a standard applied to every phase.

**Confidence:** HIGH -- documented extensively in MVP-to-production literature.

**Sources:**
- [N-iX - MVP Development Challenges: 7 Common Pitfalls](https://www.n-ix.com/mvp-development-challenges/)
- [DEV Community - From MVP to Production: Lessons Learned](https://dev.to/wmdn9116/from-mvp-to-production-lessons-learned-building-systems-that-scale-3895)

---

## Phase-Specific Warning Matrix

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Database schema design | Rigid division model (5), timestamps without timezone (8) | High | Model divisions as configurable table, use `timestamptz` everywhere |
| Auth and RLS setup | Missing RLS policies (3), user_metadata in policies | Critical | RLS in every migration, test with multiple user roles |
| QR/code generation | Static QR replay (1), offline token conflict (6) | Critical | Single-use tokens with short TTL, define offline strategy before building |
| Spending cap logic | Race conditions (2), month boundary bugs (8) | Critical | Atomic Postgres function with row-level lock, timezone-aware period boundaries |
| Cashier validation | Poor UX kills adoption (9) | High | Design cashier screen first, 2-second performance budget |
| Admin dashboard | Scope creep (10) | Medium | 4 screens max for v1, CSV export instead of report builder |
| Discount rules | Stacking exploits (4) | High | One discount per transaction in v1, max discount ceiling |
| PWA/offline | Over-promising offline (6), sync conflicts | High | Define offline = viewing only, QR generation requires connectivity |
| Demo presentation | Demo-to-production gap (11) | Medium | Build demo as production from day one |
| Employee adoption | Sweethearting (7), complex redemption flow | Medium | Photo on QR screen, simple 3-tap redemption flow |

---

## Confidence Assessment

| Pitfall | Confidence | Reasoning |
|---------|------------|-----------|
| QR Replay (1) | HIGH | Well-documented in voucher security, verified with Voucherify and OASIS SQRAP |
| Race Conditions (2) | HIGH | Standard database concurrency problem, verified with multiple technical sources |
| RLS Misconfiguration (3) | HIGH | Documented in Supabase's own security retro, CVE-2025-48757 |
| Discount Stacking (4) | HIGH | Retail loss prevention literature, Agilence case studies |
| Rigid Data Model (5) | HIGH | Standard data modeling knowledge |
| Offline Sync (6) | MEDIUM | Patterns are well-known, but optimal strategy depends on MPM's actual connectivity |
| Sweethearting (7) | HIGH | Most-documented form of employee discount abuse |
| Month Boundaries (8) | HIGH | Universal timezone/date boundary problem |
| Cashier UX (9) | HIGH | Universal UX principle for time-sensitive workflows |
| Admin Scope (10) | HIGH | Universal product development pattern |
| Demo-to-Prod (11) | HIGH | Extensively documented in MVP literature |

---

## Key Sources

- [Voucherify - QR Coupons Anti-Abuse Playbook](https://www.voucherify.io/blog/use-qr-codes-to-integrate-promotions-in-your-mobile-app)
- [OASIS SQRAP - Secure QR Authentication Protocol](https://docs.oasis-open.org/esat/sqrap/v1.0/csd01/sqrap-v1.0-csd01.html)
- [Sourcery - Race Condition Vulnerabilities in Financial Transactions](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions)
- [Ketan Bhatt - DB Concurrency Defects Catalogue](https://www.ketanbhatt.com/p/db-concurrency-defects)
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [170+ Supabase Apps Exposed (CVE-2025-48757)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Agilence - How to Conquer Discount Fraud](https://blog.agilenceinc.com/how-to-conquer-discount-fraud)
- [Solink - Loss Prevention Tips 2025](https://solink.com/resources/loss-prevention-tips/)
- [Solink - End Discount Abuse](https://solink.com/resources/spot-discount-abuse/)
- [GTCSys - PWA Offline-First Strategies](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [N-iX - MVP Development Challenges](https://www.n-ix.com/mvp-development-challenges/)
- [SupaExplorer - Advisory Locks Best Practice](https://supaexplorer.com/best-practices/supabase-postgres/lock-advisory/)
