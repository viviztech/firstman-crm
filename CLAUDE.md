# FirstMan CRM — Claude Code Build Specification (TypeScript / Next.js Stack)

You are building a complete CRM for **FirstMan Corporate Services**, an Indian corporate services firm (company registration, GST, compliance, trademarks, licenses). This file is your single source of truth. Follow the phases in order. Do not skip ahead. After each phase, run migrations and tests, and confirm the phase checklist before moving on.

---

## 1. Tech Stack (fixed — do not substitute)

- **Framework:** Next.js 15 (App Router, React 19, TypeScript strict mode) — full-stack: UI + server actions + route handlers in one codebase
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM + drizzle-kit migrations (no Prisma)
- **Auth & Roles:** better-auth with email/password + admin plugin; roles enforced via middleware and per-query scopes
- **UI:** Tailwind CSS 4 + shadcn/ui; TanStack Table for data tables; Recharts for dashboard charts; @dnd-kit for the enquiries kanban
- **Data layer:** Server Components + Server Actions for mutations; Zod validation on every action input; TanStack Query only where client-side interactivity demands it
- **Background jobs & scheduling:** **pg-boss** (Postgres-backed queue — no Redis needed) for queued notifications, plus pg-boss cron for nightly/scheduled jobs
- **Email:** Nodemailer (SMTP) with React Email templates
- **WhatsApp:** Meta WhatsApp Cloud API (Graph API v21.0+) via a dedicated service module
- **PDF:** @react-pdf/renderer for invoices/receipts
- **File storage:** local disk volume at `./storage` behind a signed-URL route handler; S3-compatible driver interface so Hetzner Object Storage can be swapped in via env
- **Excel export:** exceljs
- **Testing:** Vitest (unit/integration on services and actions) + Playwright (smoke flows)
- **Deployment target:** Docker/Coolify — include a working multi-stage `Dockerfile` (Next standalone output), `docker-compose.yml` for local dev (app + postgres), and `.env.example`

## 2. Conventions

- All money in INR, stored as integer paise (`amountPaise`), displayed as ₹ via a shared `formatMoney()` helper. All arithmetic in integer paise — write unit tests proving no float math anywhere.
- All dates stored UTC, displayed in `Asia/Kolkata` via date-fns-tz.
- Every table: `id` (uuid v7), `createdAt`, `updatedAt`, `deletedAt` (soft delete), `createdBy`/`updatedBy` FKs. Default query scopes exclude soft-deleted rows.
- Enums as Postgres `pgEnum` + shared TS union types with badge color maps for the UI.
- **Audit log:** `activity_logs` table (actor, entity type, entity id, action, diff JSON) written by a helper called in every mutating server action on core entities.
- Project structure: `src/db/schema/*` (Drizzle schemas per module), `src/services/*` (business logic — server actions stay thin), `src/actions/*`, `src/app/(crm)/*` (authenticated app), `src/jobs/*` (pg-boss workers), `src/lib/*`.
- Seed script: demo admin (`admin@firstman.in`, password from env), 3 staff users per role, full service catalog, 20 realistic fake enquiries/clients with orders and invoices.
- Vitest coverage minimum 80% on `src/services`. Every state transition (enquiry sales conversion, order status change, invoice payment, compliance rollover) has a test.

---

## 2.5 Engineering Standards (strict — violations block phase completion)

### Version control & workflow
- Git from the first commit. **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`) — enforced by commitlint + husky hook.
- Trunk-based with short-lived feature branches per phase (`phase-2-enquiries`); merge only when the phase checklist and CI pass. Tag each completed phase (`v0.2.0-phase2`).
- Never commit generated files, `.env`, or `storage/`. Maintain a correct `.gitignore` from Phase 0.

### Code quality & type safety
- TypeScript `strict: true` plus `noUncheckedIndexedAccess`; **zero `any`** — use `unknown` + narrowing. No `@ts-ignore` without a comment explaining why.
- **Biome** for linting + formatting (single tool, fast); zero warnings policy in CI.
- husky pre-commit: Biome check + typecheck on staged files (lint-staged).
- No dead code, no commented-out blocks, no TODOs without an issue reference.
- Shared Zod schemas are the single source of truth for validation — infer TS types from them (`z.infer`); never duplicate shape definitions.

### Security (OWASP-aligned)
- Every server action and route handler: authenticate → authorize → validate (Zod) → execute. No exceptions, including "internal" endpoints.
- Parameterized queries only (Drizzle guarantees this — never use raw SQL string interpolation).
- Rate limiting on auth routes and the public enquiries API; generic error messages on auth failures (no user enumeration).
- Security headers via middleware: CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, HSTS in production.
- File uploads: magic-byte validation, randomized stored filenames, files served only via signed URLs, never from a public path.
- Secrets only via env, validated at boot; audit `npm audit` in CI (fail on high/critical).
- Passwords handled entirely by better-auth (argon2/bcrypt); session cookies httpOnly, secure, sameSite=lax.

### Testing discipline (test pyramid)
- Unit tests (Vitest) on every service function — fast, isolated, no DB where avoidable.
- Integration tests against a real Postgres (testcontainers or docker-compose test DB) for transactions, scopes, and jobs.
- Playwright E2E smoke suite for the critical path only (login → enquiry → close sale → order → invoice → payment).
- Tests are written **with** each feature in the same phase — never deferred to a "testing phase". A phase without its tests is incomplete.
- Time-dependent logic (compliance rollovers, digests) tested with frozen clocks (`vi.setSystemTime`).

### CI/CD
- GitHub Actions workflow from Phase 0: install → typecheck → Biome → unit + integration tests → build → `npm audit`. Runs on every push and PR; merge blocked on red.
- Docker image built in CI on tags; deploy to Coolify via webhook. Health-check endpoint `/api/health` (DB + queue connectivity) used by Coolify.
- Database migrations are forward-only, generated by drizzle-kit, reviewed in the PR, and run automatically on deploy start. Never edit an applied migration; write a new one.

### Error handling & observability
- Structured JSON logging via **pino** (request id, user id, action); no `console.log` in committed code.
- Central error boundary + typed `Result`-style returns from server actions (`{ ok, data | error }`) — never throw raw errors across the client boundary; never leak stack traces or SQL to users.
- **Sentry** integration (DSN via env, disabled when empty) for both server and client errors, with release tagging.
- Every pg-boss job: idempotent, explicit retry policy with backoff, dead-letter logging to `message_logs`/activity log.

### Performance & accessibility
- Server-side pagination on every list; DB indexes on all FK and filter columns (phone, status, assignedTo, dueDate) — declared in schema, not added ad hoc.
- Route-level loading states (Suspense) and optimistic UI on the kanban only.
- Lighthouse accessibility ≥ 90 on core screens: semantic HTML, labeled inputs, keyboard-navigable dialogs and kanban, visible focus states (shadcn defaults help — don't strip them).

### Documentation
- README: setup, architecture overview (one diagram), env reference, deployment, and an **Assumptions** section updated as you go.
- ADRs (`docs/adr/NNNN-*.md`) for any decision that deviates from or extends this spec.
- JSDoc on exported service functions only where the name isn't self-explanatory — prefer clear naming over comments.

### Dependency hygiene
- Pin exact versions in package.json; commit the lockfile. Prefer fewer, well-maintained dependencies — justify any new dependency in the PR/ADR. No abandoned packages.

---

## 3. Roles & Permissions

| Role | Access |
|---|---|
| `super_admin` | Everything, settings, user management |
| `manager` | All records, reports, assign work, approve invoices |
| `executive` | Own assigned enquiries/orders/tasks only; cannot delete; cannot see revenue reports |
| `accountant` | Invoices, payments, expenses, reports; read-only on orders |

Enforce at three layers: middleware route guards, server-action authorization checks, and Drizzle query scopes (executives get `assignedTo = session.userId` applied at the service layer — never trust the UI filter alone).

---

## 4. Core Modules & Data Model

### 4.1 Enquiries
`enquiries`: name, phone (unique, indexed, E.164), email nullable, address nullable, city, source enum (whatsapp, website, meta_ads, google, referral, walk_in, other), serviceInterestedId FK, status enum (new, contacted, qualified, proposal_sent, negotiation, won, lost), lostReason nullable, assignedTo FK users, nextFollowUpAt timestamp, nextFollowUpAssignedTo FK users nullable, notes, convertedClientId/convertedOrderId nullable.
- Kanban board (dnd-kit, optimistic updates, status change persisted via server action) + standard filterable table view.
- Detail screen shows the capture fields (Source, Service, Name, Phone, Email, Comments) with three primary actions below:
  - **Sales:** reviews/edits Name, Phone, Email, Address, Pincode, shows Source, picks a Service with its price (editable), comments, then Close/Submit — creates/links a `clients` record **and** an `orders` record in one DB transaction; enquiry status → won.
  - **Followup:** sets the next follow-up date/time, then Self or Others (if Others, one-time — hands off only the pending follow-up via `nextFollowUpAssignedTo` — or permanent, which changes `assignedTo` itself), then comments.
  - **Lost:** requires a reason; the enquiry is then hidden from every list/kanban/search/dashboard for every role — not deleted, just excluded from every scoped query — with a super_admin-only "permanently delete" screen to purge it later.
- `enquiry_followups`: enquiryId, userId, channel enum (call, whatsapp, email, meeting), summary, followedUpAt, nextFollowUpAt, handoffType enum (self, one_time, permanent), handoffTo FK users nullable.
- Overdue follow-up indicator (red badge when nextFollowUpAt < now).
- Public API endpoint `POST /api/v1/enquiries` (bearer token from env, rate-limited) so the marketing website pushes enquiries directly; enqueues WhatsApp alert to assigned staff.
- Optional round-robin auto-assignment among executives (toggle in settings).

### 4.2 Clients
`clients`: type enum (individual, business), name, businessName nullable, phone, email, gstin nullable, pan nullable, address, city, state, pincode, assignedTo FK, referralSource.
- Client profile page with tabs: overview, orders, invoices, documents, compliance, follow-ups, activity.
- Overview shows lifetime value (sum of paid invoices) and open balance.

### 4.3 Service Catalog
`service_categories`: name, sort. `services`: categoryId, name, slug, description, basePricePaise, govtFeePaise nullable, estimatedDays, isRecurring boolean, recurrence enum nullable (monthly, quarterly, yearly), checklistTemplate jsonb (ordered task names with default day offsets), requiredDocuments jsonb.
Seed the real catalog: Pvt Ltd / LLP / OPC / Partnership / Proprietorship registration, GST registration, GST monthly filing (recurring monthly), ITR filing (recurring yearly), annual compliance Pvt Ltd & LLP (recurring yearly), trademark registration, trademark objection, FSSAI, MSME/Udyam, IEC, ISO, DIR-3 KYC (recurring yearly).

### 4.4 Orders (Engagements)
`orders`: orderNo (auto: FM-2026-0001, sequence per year), clientId, serviceId, status enum (pending, docs_awaited, in_progress, govt_processing, on_hold, completed, cancelled), quotedPricePaise, govtFeePaise, assignedTo FK, startedAt, dueAt (auto = startedAt + service estimatedDays), completedAt, notes.
- On create (single transaction): auto-generate `order_tasks` from the service's checklistTemplate and a document checklist from requiredDocuments.
- `order_tasks`: orderId, title, assignedTo, dueAt, status enum (pending, in_progress, done, blocked), sort.
- Order page: status timeline component, tasks list with inline status updates, documents checklist, linked invoices.
- Status change → enqueue WhatsApp template update to the client + email; every send logged.

### 4.5 Documents
`documents`: ownerType (client|order), ownerId, kind enum (pan_card, aadhaar, photo, address_proof, moa_aoa, certificate, other), fileName, path, mimeType, sizeBytes, status enum (pending, received, verified, rejected), rejectReason nullable, uploadedBy.
- Upload via route handler (max 10 MB; pdf/jpg/png/docx only, validated server-side by magic bytes not extension).
- Downloads only through short-lived signed URLs (HMAC token route).
- "Docs pending" computed badge on orders.

### 4.6 Compliance Calendar (the retention engine)
`compliance_items`: clientId, serviceId nullable, title, description, dueDate, recurrence enum (none, monthly, quarterly, yearly), status enum (upcoming, due_soon, filed, overdue, na), filedAt, orderId nullable.
- Nightly pg-boss cron: roll statuses (due_soon at T-15 days, overdue after dueDate); on marking filed, auto-generate the next occurrence for recurring items.
- Reminder jobs: WhatsApp + email to client at T-15, T-7, T-1; internal task for the assigned executive at T-15.
- Calendar + list views; dashboard widget for this month's deadlines across all clients.
- One-click "Create Order from compliance item".

### 4.7 Invoices & Payments
`invoices`: invoiceNo (FM-INV-2026-0001), clientId, orderId nullable, lineItems jsonb (description, qty, ratePaise, amountPaise), subtotalPaise, gstRate (0|18), gstAmountPaise, totalPaise, status enum (draft, sent, partially_paid, paid, overdue, cancelled), dueDate, sentAt.
- `payments`: invoiceId, amountPaise, method enum (upi, bank_transfer, cash, card, cheque), reference, paidAt. Recording payments updates invoice status automatically (partial vs full).
- Invoice PDF via @react-pdf/renderer with FirstMan branding from settings (logo, GSTIN, address).
- Send invoice via email + WhatsApp (signed PDF link).
- Daily overdue-invoice digest to accountant + manager.
- `expenses`: date, category, description, amountPaise, orderId nullable — for simple P&L.

### 4.8 Communication Layer
`src/services/whatsapp.ts`: wraps Meta Cloud API — sendTemplate, sendText (24h session), sendDocument. Config via env (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, template name mappings in settings). ALL sends go through pg-boss jobs with retry/backoff; log to `message_logs` (channel, to, template, payload, status, error). When WHATSAPP_TOKEN is empty, use a console/log driver so dev works offline. Never call the API inside a request/action — always enqueue.
Notification events (all queued): new enquiry assigned, morning follow-up digest per executive, order status changed (to client), weekly docs-pending reminder (to client), compliance reminders (T-15/7/1), invoice sent / payment received (to client), overdue invoices digest (internal). Honor opt-out: any inbound "STOP" (webhook later; manual flag now) sets client.whatsappOptedOut.

### 4.9 Dashboard & Reports
Role-aware dashboard:
- Manager/Admin: enquiries this month by status (funnel), revenue this month vs last (chart), orders by status, overdue tasks, upcoming compliance (14 days), top services by revenue.
- Executive: my follow-ups today, my open tasks, my orders in progress.
- Accountant: outstanding invoices total, collections this month, expenses this month.
Reports page (each with exceljs export): enquiry source performance, conversion rate by source and by executive, revenue by service, aging receivables, compliance filing status.
Global search (cmdk palette) across enquiries, clients, orders, invoices.

### 4.10 Settings
`settings` key/value jsonb table + settings pages: company profile (name, address, GSTIN, logo upload), invoice prefix & default GST rate, WhatsApp template name mappings, reminder day offsets, enquiry auto-assignment toggle, user management (invite, role change, deactivate).

---

## 5. Build Phases (execute in this order)

**Phase 0 — Scaffold:** Next.js 15 + TS strict, Tailwind 4 + shadcn/ui, Drizzle + Postgres, better-auth with roles, base app shell (sidebar nav, role-aware menu), settings table, pg-boss bootstrap, Dockerfile + docker-compose, .env.example with Zod env validation, Vitest + Playwright setup, **Biome + husky + commitlint + lint-staged, GitHub Actions CI pipeline, pino logger, Sentry wiring (env-gated), `/api/health` endpoint**. → Check: login works, roles seeded, protected routes redirect, CI green on the first push, pre-commit hook rejects a lint-broken commit.

**Phase 1 — Catalog + Clients:** Service categories/services schemas + seeded real catalog; clients CRUD with tabbed profile shell. → Check: catalog visible, client create/edit works, executive scoping enforced in a test.

**Phase 2 — Enquiries:** Enquiry CRUD, kanban board, follow-ups (with self/others one-time/permanent handoff), assignment + optional round-robin, Sales action (client + order in one transaction) and Lost action (hides the enquiry everywhere, purgeable later), public API endpoint with token auth + rate limiting. → Check: API creates an enquiry and enqueues (logged) notification job; Sales conversion test passes.

**Phase 3 — Orders & Tasks:** Orders with auto task/doc checklist generation, status timeline, task management, docs-pending badge. → Check: creating an order for "Pvt Ltd Registration" spawns its checklist in one transaction.

**Phase 4 — Documents:** Upload route handler, magic-byte validation, status flow, signed downloads. → Check: upload/verify/reject cycle works; direct path access is blocked.

**Phase 5 — Compliance Calendar:** Schema, nightly cron, recurrence generation, reminder jobs, calendar view, dashboard widget, create-order shortcut. → Check: status rollover and next-occurrence generation pass time-frozen tests.

**Phase 6 — Invoicing:** Invoices, payments, PDF, expenses, overdue digest. → Check: PDF renders, partial payment updates status, paise math property-tested.

**Phase 7 — Communication:** WhatsApp service, message_logs, wire every notification event, morning digests via cron, opt-out flag respected. → Check: all events enqueue jobs; message_logs rows created with log driver.

**Phase 8 — Dashboards, Reports & Polish:** All widgets, reports with exports, cmdk global search, full demo seed, README with setup + Coolify deployment instructions, Playwright smoke suite (login → create enquiry → close sale → order → invoice → payment), final test pass. → Check: fresh `db:push && db:seed` produces a fully navigable demo CRM.

---

## 6. Non-negotiables

- No payment gateway integration in v1 (record payments manually). No client-facing portal in v1 (Phase 2 project).
- Every destructive action gets a confirmation dialog; deletes are soft.
- Phone numbers normalized to E.164 (+91…) with Indian mobile validation via a shared Zod schema.
- No N+1s: use Drizzle relational queries / joins in list views; paginate every table server-side.
- Never commit secrets; everything via env. Validate env at boot with a Zod env schema (`src/lib/env.ts`).
- Server actions stay thin — business logic lives in `src/services/` and is unit-tested there.

## 7. Environment Variables (.env.example)

DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, ADMIN_DEFAULT_PASSWORD, SMTP_HOST/PORT/USER/PASS, MAIL_FROM, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ID, ENQUIRIES_API_TOKEN, STORAGE_DRIVER=local, S3_* (optional), TZ_DISPLAY=Asia/Kolkata.

---

*When ambiguity arises, choose the simplest implementation that satisfies this spec, note the decision in README under "Assumptions", and continue.*
