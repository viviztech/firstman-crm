# Human Resource Management (HRM) Implementation Plan

**Status:** Phases 1–4 complete; Phase 5 hardening remains
**Application:** FirstMan CRM
**Last updated:** 2026-09-23

### Implementation progress

Completed in the first implementation slice:

- HR and payroll capability schema with super-admin assignment controls;
- department, designation, and work-location masters;
- employee code, reporting manager, organization, employment status/category, employment dates,
  contact fields, and payroll eligibility on `staff_profiles`;
- backward-compatible migration that marks existing `staff_profiles` active and makes only their
  internal employees payroll-eligible; users without a profile remain pending HR review;
- audited and service-enforced employee profile administration;
- employee-safe self profile and public workplace directory projections;
- HR dashboard, employee roster/detail editor, organization setup, and navigation;
- integration tests for authorization, capability delegation, auditing, safe projections, and
  reporting-line validation.
- formal status transitions with immutable history, reasons, and effective dates;
- exit protection requiring open CRM work to be reassigned, plus atomic account ban, session
  revocation, delegated-HR-access removal, and payroll exclusion;
- immediate session validation after revocation and middleware protection of `/hr`.
- encrypted employee demographic/address records and up to three emergency contacts, with
  self/HR read permissions, HR-only writes, and private-access audit entries;
- automatic HR encryption using a key derived from the existing auth secret when no dedicated
  `HR_DATA_ENCRYPTION_KEY` is configured;
- encrypted employee bank-account records, payroll-only maintenance, employee full-number self-view,
  and audit entries without bank values.
- HR-only upload of employee documents into private storage, employee/HR metadata and download
  access, checksum verification, and read/download audit entries.
- rehire workflow that validates a new employment period, restores account access, resets exit
  dates, preserves the prior join date in status history, and does not restore HR capabilities.
- employee CSV import for existing CRM accounts: strict UTF-8 template, row-level preview,
  all-or-nothing commit, short-lived one-use batch receipt, and revalidation at commit.
- encrypted PAN, UAN, ESI, Aadhaar-last-four and statutory eligibility records, with payroll-only
  masked administration and employee full-value self-view;
- super-admin HR ciphertext recovery/rotation across private details, emergency contacts, bank,
  and statutory records using a temporary previous auth secret.

Phases 1 and 2 are complete. Phase 2 includes the production leave workflow: leave-type and location
holiday configuration, calendar-year ledger balances, full/half-day employee requests, weekend
and holiday calculation, overlap and paid-balance validation, direct-manager/HR decisions,
employee cancellation, immutable debits/reversals/adjustments, team calendar, lifecycle in-app
notifications, effective-dated policies, join/exit proration, and daily idempotent entitlement and
carry-forward reconciliation.
The employee profile editor and CSV importer cannot change employment status;
the lifecycle workflow owns all transitions. Phase 4 now includes salary components and
structures, effective employee assignments, attendance/leave-aware calculation, adjustments,
validation, maker-checker approval, attendance locking, posting, payment status, summarized finance
expense creation, notifications, private payslip storage/downloads, opening YTD balances, masked
bank advice, payroll register/component totals, statutory working reports, and employee/admin YTD
summaries. Phase 5 remains pending.

CSV import only matches existing CRM account emails; it does not create logins. A new HR
profile is created as `draft`, while an existing profile keeps its employment status. The
file must use the downloadable 12-column template and contain at most 500 rows / 1 MB.
Blank optional fields clear those fields. Existing employee codes and join dates cannot be
changed by CSV. Every row must validate before any change is committed.

Private-data deployment requirement: keep `BETTER_AUTH_SECRET` stable and backed up; new HR
records derive their encryption key from it (ciphertext version `v2`). Existing `v1` records
still require their original `HR_DATA_ENCRYPTION_KEY`. When changing `BETTER_AUTH_SECRET`, set
the old value temporarily as `HR_DATA_PREVIOUS_AUTH_SECRET`, restart, run `/hr/security`, verify
private records, then remove the temporary secret and restart. Never put secrets in the
repository or activity logs.
The document files themselves use the existing private `storage/` volume; that volume must be
persisted and backed up with the database in deployment. File encryption at rest is not added
by this slice.

## 1. Existing plan and current baseline

No HRM implementation plan currently exists in `README.md`, `CLAUDE.md`, `docs/`, or the
existing ADRs. The application does, however, already contain part of the foundation an HRM
module needs:

- better-auth `user` records for staff login, account activation, roles, and invitations;
- `staff_profiles` for employee type, functional team, territory, and service assignments;
- super-admin staff management at `/settings/users`;
- append-only `activity_logs`, in-app/email notifications, pg-boss jobs, file storage, reports,
  and expense tracking;
- role and data-scope enforcement in server pages, actions, and services;
- PostgreSQL/Drizzle migrations, service integration tests, Vitest, and Playwright.

These are staff administration and work-allocation features, not a complete HRM. There is no
employee lifecycle, reporting hierarchy, HR access model, leave, attendance, payroll, payslips,
or employee self-service today.

## 2. Product goal

Add an HR workspace to the existing CRM that supports:

1. a single authoritative employee profile tied to the existing login;
2. joining, active employment, probation, confirmation, notice, and exit workflows;
3. departments, designations, reporting managers, work locations, and holiday calendars;
4. leave requests, balances, approvals, and attendance regularization;
5. monthly Indian payroll, configurable statutory deductions, payroll approval, and payslips;
6. employee and manager self-service with strict access to private HR information;
7. auditable reports and notifications using the app's existing infrastructure.

The first usable release should deliver employee records plus leave. Attendance and payroll
should follow only after the employee model and authorization boundaries are proven.

## 3. Scope and assumptions

### In scope

- Internal employees with CRM accounts.
- HR administration, employee self-service, manager approvals, and payroll administration.
- India-oriented payroll fields and configurable PF, ESI, professional tax, labour welfare fund,
  income-tax/TDS, bonus, reimbursements, and other earnings/deductions.
- CSV import/export for opening balances, attendance, salary data, and payroll review.
- Private employee documents and generated PDF payslips.
- Integration with the current staff settings, notifications, audit log, queue, storage, reports,
  and expenses.

### Initially out of scope

- Recruitment/ATS, job-board publishing, and candidate management.
- Biometric hardware or GPS/mobile punch capture. Phase 3 supports manual entry and CSV/API-ready
  imports so a device integration can be added later.
- Performance reviews, learning management, asset inventory, travel, and full reimbursement
  workflows.
- Direct bank payment files, government portal filing, and automatic tax-law updates.
- Multi-company/multi-tenant payroll. The current application represents one company.

### Workforce rules

- `staff_profiles` remains the employee extension of the better-auth-owned `user` table. Do not
  put HR fields directly on `user` and do not create a second competing employee identity.
- `employeeType = internal` is payroll-eligible by default.
- Franchise and associate profiles remain visible in the staff directory but are excluded from
  payroll and statutory reports unless an HR administrator explicitly marks them eligible.
- Termination never deletes the user or HR history. Set the employment status/last-working date,
  revoke sessions, and ban the login through the existing user administration path.
- Monetary values use integer paise, matching invoices and expenses. Dates that represent a
  business day use PostgreSQL `date`; event timestamps use timezone-aware timestamps.
- India statutory rules must be effective-dated and configurable, not embedded as permanent
  constants. A payroll/CA reviewer must approve the configured rules before production payroll.

## 4. Authorization and privacy model

Do not add `hr_manager` as another value to the existing single CRM `role`. A staff member may be
both an operations manager and an HR/payroll administrator, while an HR employee should not
automatically receive access to clients, revenue, or other CRM modules.

Add capability assignments:

| Capability | Intended access |
|---|---|
| `hr_admin` | Employee records, organization setup, lifecycle, leave administration, HR reports |
| `payroll_admin` | Compensation, bank/statutory fields, payroll runs, payslips, payroll reports |

`super_admin` has both capabilities implicitly. Capability rows are assigned only by a
`super_admin`. Reporting-manager access is relationship-based and does not require a capability.

Enforce authorization in services as well as pages/actions:

- Employee: own public profile, own private contact details, own leave/attendance/payslips.
- Reporting manager: public profiles of direct reports and approval requests assigned to them;
  no salary, bank, PAN, tax, or medical data.
- HR admin: all employment and leave data, but no compensation/bank/tax data unless also a
  payroll admin.
- Payroll admin: compensation and payroll data required for payroll work.
- Super admin: full access.

Never return a full HR row and hide fields only in the UI. Define explicit service projections
such as `EmployeeDirectoryRow`, `EmployeeSelfView`, `HrEmployeeView`, and
`PayrollEmployeeView`. Record reads/downloads of private documents and payslips in the activity
log. Exclude all HR private data from global search and application logs.

## 5. Proposed data model

Create focused schema files instead of growing `staff.ts` into a payroll monolith.

### `src/db/schema/staff.ts` extensions

Extend `staff_profiles` with nullable fields so the migration is backward-compatible:

- `employeeCode` (unique when present), `legalName`, `phone`, `personalEmail`;
- `departmentId`, `designationId`, `managerUserId`, `workLocationId`;
- `employmentStatus` (`draft`, `active`, `probation`, `notice`, `exited`);
- `employmentCategory` (`permanent`, `probationer`, `contract`, `intern`, `consultant`);
- `joinDate`, `confirmationDate`, `noticeStartDate`, `lastWorkingDate`;
- `payrollEligible` (default derived during migration, then explicitly stored).

Keep date of birth, gender, addresses, emergency contacts, bank and statutory identifiers in a
separate private record so normal staff-directory queries cannot accidentally expose them.

### `src/db/schema/hr.ts`

- `departments`: name, code, active flag, optional department head.
- `designations`: name, code, active flag.
- `work_locations`: name, address, state, timezone, holiday-calendar reference.
- `hr_capability_assignments`: user, capability, granted by/at; unique user + capability.
- `employee_private_details`: one-to-one staff profile; personal/demographic/contact fields.
- `employee_emergency_contacts`: employee, name, relationship, phone, primary flag.
- `employee_bank_accounts`: employee, account-holder name, encrypted account number, IFSC,
  verification state. Return only a masked account number in ordinary queries.
- `employee_statutory_details`: encrypted PAN/UAN/ESI identifiers and eligibility flags.
- `employee_status_history`: immutable employment-status changes, effective date, reason.
- `employee_documents`: employee, document type, private storage key, metadata, expiry date,
  verification status. Do not reuse the client/order `documents` table because its owner types,
  permissions, and download routes are CRM-oriented.

Sensitive identifiers require application-level authenticated encryption with a versioned
`HR_DATA_ENCRYPTION_KEY` validated by `src/lib/env.ts`. Never store Aadhaar numbers; if an Aadhaar
copy is operationally required, store only the access-controlled document and a last-four value.

### `src/db/schema/leave.ts`

- `holiday_calendars` and `holidays`.
- `leave_types`: code, name, paid/unpaid, unit, carry-forward and balance rules, active flag.
- `leave_policy_assignments`: employee, leave type, effective range, annual entitlement.
- `leave_ledger`: immutable credit/debit/adjustment entries; balance is the ledger sum.
- `leave_requests`: employee, type, start/end, day portions, requested units, reason, status,
  current approver, decided by/at, cancellation fields.
- `leave_request_history`: append-only state/approval events.

Use an immutable ledger rather than a mutable balance column. Prevent overlapping approved or
pending requests in the service transaction. Weekend/holiday calculation comes from the
employee's work location and policy.

### `src/db/schema/attendance.ts`

- `shifts`, `shift_assignments`, and effective dates.
- `attendance_records`: employee + work date (unique), first-in, last-out, work minutes, status,
  source, and lock state.
- `attendance_regularizations`: requested corrections and approval history.

Store normalized daily records first. Raw punch ingestion can be a later append-only table when a
specific biometric provider is selected.

### `src/db/schema/payroll.ts`

- `salary_components`: earning/deduction/reimbursement/employer-contribution, taxable flag,
  calculation mode, display order.
- `salary_structures` and effective-dated `employee_salary_assignments`.
- `payroll_periods`: month, dates, status (`draft`, `calculated`, `approved`, `posted`, `paid`,
  `locked`), and approval metadata.
- `payroll_entries`: one employee snapshot per period, paid days, gross, deductions, net pay,
  employer cost, and calculation inputs/version.
- `payroll_entry_lines`: component-level amounts and formula result details.
- `payroll_adjustments`: one-time earning/deduction with source and approval.
- `payslips`: immutable generated PDF storage key, checksum, and generated timestamp.

Approved payroll must be immutable. Corrections happen through a reversal/supplemental run or the
next period, never by editing approved lines. Snapshot employee name, employee code, bank mask,
salary structure, and statutory configuration into the payroll entry so historical payroll does
not change when a profile changes.

## 6. Application structure and routes

Add an `HR` navigation group in `src/components/nav-config.ts` and preserve the existing grouped
sidebar behavior.

| Route | Audience | Purpose |
|---|---|---|
| `/hr` | All staff | Role-aware HR dashboard |
| `/hr/me` | All staff | Own profile and employment summary |
| `/hr/directory` | All staff | Non-sensitive employee directory |
| `/hr/employees` | HR admin | Employee roster and lifecycle filters |
| `/hr/employees/[id]` | Self/manager/HR | Permission-filtered employee details |
| `/hr/organization` | HR admin | Departments, designations, locations, holidays |
| `/hr/leave` | All staff | Own requests and balances |
| `/hr/leave/team` | Managers/HR | Approval queue and team calendar |
| `/hr/attendance` | All staff | Own attendance and regularization |
| `/hr/attendance/team` | Managers/HR | Team exceptions and approvals |
| `/hr/payroll` | Payroll admin | Payroll periods, calculation, validation, approval |
| `/hr/payslips` | All staff | Own payslips only |
| `/hr/reports` | HR/payroll admin | Access-scoped HR, leave, attendance, payroll exports |

Follow current boundaries:

- server pages in `src/app/(crm)/hr/**` call `requireUser()` and HR authorization helpers;
- mutations in `src/actions/hr-*.ts` parse `FormData` with Zod and return `ActionResult`;
- business rules and transactions live in `src/services/hr/**`, not components/actions;
- schema modules are registered in `src/db/index.ts`;
- jobs live under `src/jobs/hr/**` and are registered through the current queue bootstrap;
- components live under `src/components/hr/**`;
- exports use route handlers, consistent with current report export routes.

## 7. Delivery phases

### Phase 0 — Decisions, security, and migration foundation

1. Confirm who will hold HR/payroll capabilities and who approves leave/payroll.
2. Confirm leave year, weekly offs, locations, holiday calendars, payroll cutoff/pay date, and
   statutory configuration with FirstMan's HR/payroll/CA owner.
3. Add capability helpers such as `requireHrCapability()` and relationship-aware service guards.
4. Add encryption/key rotation utilities and tests before storing sensitive data.
5. Create nullable employee-profile migrations and backfill existing internal users as `active`;
   leave franchise/associate users non-payroll unless explicitly enabled.
6. Add a one-time data-quality report for users without profiles, duplicate employee codes,
   invalid reporting managers, or missing join dates.

**Exit gate:** existing CRM behavior and tests remain unchanged; private-field access tests prove
that ordinary managers/accountants/executives cannot read HR/payroll secrets.

### Phase 1 — Employee core and organization

1. Build departments, designations, locations, reporting hierarchy, and employee-code settings.
2. Replace the current overloaded staff table experience with:
   - `/settings/users` for login, CRM role, team, territory, and service access;
   - `/hr/employees` for employment and organization data.
3. Build permission-filtered directory, employee detail, private details, emergency contacts,
   and HR document upload/download.
4. Add lifecycle transitions: activate, start probation, confirm, begin notice, exit, rehire.
5. On exit, transactionally record status history; then enqueue session revocation/account ban
   and cancel future shift/leave/salary assignments as applicable.
6. Add CSV employee import with validate-preview-commit flow and row-level errors.

**Exit gate:** HR can administer employees without editing better-auth tables directly; employees
can see their own record; managers can see only permitted direct-report data; exit preserves all
history and removes system access.

### Phase 2 — Leave and employee self-service (first production HRM release)

Core workflow delivered in migration `0035_odd_doctor_doom.sql`; team calendar, notifications,
effective-dated policy proration, and idempotent provisioning/carry-forward delivered in
`0036_loud_gwen_stacy.sql`.

1. Configure leave types, policies, opening balances, holidays, and weekly offs.
2. Implement request, manager approve/reject, HR override, cancel, and balance adjustment flows.
3. Calculate units server-side, including half days, weekends, holidays, overlaps, join/exit dates,
   insufficient balance, and unpaid leave.
4. Create employee balance/history, manager approval queue, team leave calendar, and HR reports.
5. Add in-app/email notifications for submitted, approved, rejected, cancelled, and approaching
   requests using existing notification/queue patterns.
6. Schedule year-opening entitlements and carry-forward as idempotent jobs with unique ledger
   references.

**Exit gate:** every balance is reproducible from the ledger; concurrent approvals cannot
double-spend leave; repeated jobs do not duplicate credits or notifications.

### Phase 3 — Attendance

Delivered in migration `0037_salty_satana.sql`: shift masters and effective assignments,
deterministic daily status derivation, leave/holiday/week-off precedence, manual HR entry,
strict preview-and-commit CSV import, employee regularization with manager/HR decisions,
monthly employee/team summaries and exception views, scoped CSV reporting, and irreversible
payroll-period attendance locks.

1. Configure shifts and effective-dated employee assignments.
2. Add daily attendance grid, manual HR entry, and validate-preview-commit CSV import.
3. Derive present/absent/half-day/leave/holiday/week-off status without overwriting approved leave.
4. Add missing-punch and attendance regularization requests with manager/HR approval.
5. Lock attendance when its payroll period is approved.
6. Publish attendance exceptions and monthly summary reports.

**Exit gate:** one deterministic daily record exists per employee/date, imports are idempotent,
and approved payroll inputs cannot be silently changed.

### Phase 4 — Payroll and payslips

1. Configure salary components, structures, effective assignments, statutory settings, and
   opening year-to-date values.
2. Implement payroll calculation as a pure, versioned function fed by employee, salary,
   attendance, leave, adjustment, and statutory snapshots.
3. Add draft calculation, variance validation, maker-checker approval, posting, lock, and payment
   status. The calculator cannot approve its own run when separate payroll approvers are
   configured.
4. Generate branded PDF payslips with the existing React PDF/document theme approach, store a
   checksum, and expose only through authorized download routes.
5. Add bank advice, payroll register, component totals, statutory working reports, and employee
   YTD summaries as CSV/XLSX exports.
6. When payroll is posted, create one summarized payroll expense for the period (or a dedicated
   finance journal reference) rather than one CRM expense per employee. Store the payroll-period
   link to make the operation idempotent.
7. Notify employees only after the run is approved and payslips are generated.

**Exit gate:** totals reconcile (`gross - employee deductions = net`), employer contributions are
separate from take-home pay, approved runs are immutable, reruns are idempotent, and each payslip
matches its stored payroll snapshot.

### Phase 5 — Hardening and later extensions

1. Restore-test encrypted fields and private files; document key rotation and recovery.
2. Add retention rules, privileged-access review, audit export, and anomaly alerts.
3. Add performance goals/reviews, employee assets, recruitment, reimbursements, or biometric
   adapters only as separately approved projects.

## 8. Notifications and scheduled jobs

Extend `notification_type` deliberately rather than using unstructured strings. Candidate events:

- leave/regularization submitted and decided;
- employee probation/confirmation/contract/notice milestones;
- expiring employee documents;
- missing attendance and payroll input cutoff;
- payslip available.

Every scheduled HR job must have an idempotency key derived from event type + employee/period +
effective date. Jobs must log only record IDs and operational metadata, never salary, bank,
statutory numbers, medical information, or document contents.

## 9. Testing and quality gates

### Service/integration tests

- Capability, self, direct-report, HR, payroll, and super-admin access matrices.
- Employee lifecycle transition rules and session/account handling.
- Leave day calculation, overlap, ledger conservation, concurrency, carry-forward, and job
  idempotency.
- Attendance import duplication, leave reconciliation, overnight shifts, and payroll locking.
- Payroll calculations with fixtures covering join/exit mid-month, unpaid leave, arrears,
  reimbursements, component rounding, statutory thresholds, and negative/zero net guards.
- Encryption round trip, masked projections, key versioning, and unauthorized download denial.
- Activity entries for every privileged mutation and private download.

Use the existing real-PostgreSQL test approach and keep test files serial-safe because this suite
shares a database. Time-dependent tests must inject a date/time or use fake system time.

### End-to-end tests

1. HR creates/completes an employee record and assigns a reporting manager.
2. Employee requests leave; manager approves; balance and calendar update.
3. Employee requests attendance regularization; manager approves.
4. Payroll admin calculates, validates, approves, and publishes a run; the employee downloads the
   correct payslip.
5. An executive, accountant, unrelated manager, and franchise user are each denied private HR and
   payroll routes/data.

### Release gates

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and relevant Playwright specs
  pass.
- Migration is forward-only, reviewed, tested against a production-like copy, and has a documented
  recovery procedure.
- Payroll runs in parallel with the current manual process for at least one full cycle and totals
  reconcile before it becomes the system of record.
- HR/payroll owner signs off permissions, leave rules, statutory configuration, exports, and a
  sample payslip.

## 10. Implementation order by file area

For each phase, implement in this order to match the current codebase:

1. schema in `src/db/schema/*` and registration in `src/db/index.ts`;
2. generated forward-only Drizzle migration plus seed/reference data;
3. authorization helpers and Zod input schemas;
4. transactional services and integration tests;
5. server actions and queue jobs;
6. server pages/components and navigation;
7. export/download route handlers;
8. Playwright critical paths, documentation, and operational runbook.

Do not modify an applied migration. Do not place business rules in React components or server
actions. Follow the existing soft-delete/base-column convention for mutable HR master data, while
keeping ledgers, histories, payroll snapshots, and audit records append-only.

## 11. Definition of done for the HRM module

The module is complete when:

- every active internal employee has one employee code, employment record, manager/location as
  applicable, and a usable self-service login;
- authorization tests demonstrate field-level privacy, not merely hidden navigation;
- HR can execute joining-through-exit without database intervention;
- leave balances reconcile to immutable ledger entries;
- attendance inputs used by an approved payroll are locked and traceable;
- payroll results reconcile, are independently approved, generate immutable payslips, and post an
  idempotent finance reference;
- all privileged changes and private downloads are auditable;
- backup/restore, encryption key management, statutory configuration ownership, and monthly
  payroll operating procedures are documented.

## 12. Decisions required before Phase 1

The implementation can begin with Phase 0, but these business decisions must be recorded before
Phase 1 is accepted:

1. Who receives `hr_admin` and `payroll_admin`, and is maker-checker payroll approval mandatory?
2. Which current users are employees versus franchisees/associates/consultants?
3. What is the employee-code format, leave year, weekly-off policy, and initial holiday calendars?
4. Is reporting strictly one manager per employee, and who acts when that manager is unavailable?
5. Which work locations/states are in scope for professional tax and other state-specific rules?
6. Which attendance source is authoritative at launch: HR entry, CSV, or an existing device?
7. Which salary components and statutory registrations are active for FirstMan?
8. Who owns payroll reconciliation, approval, payment marking, and statutory filing outside this
   application?
