# FirstMan CRM

A CRM for **FirstMan Corporate Services** (Indian corporate services: company
registration, GST, compliance, trademarks, licenses) — leads, clients, orders,
compliance calendar, invoicing, and WhatsApp/email notifications.

This build follows the phased spec in `CLAUDE.md`. This README covers what's
been built so far (**Phase 0 — Scaffold**) and how to run it.

## Architecture

```
Browser
  │
  ▼
Next.js 15 (App Router) ── Server Components / Server Actions ── src/actions, src/app
  │                                                    │
  │                                                    ▼
  │                                          src/services (business logic)
  │                                                    │
  ▼                                                    ▼
better-auth (email/password + admin/roles)     Drizzle ORM ──► PostgreSQL 16
  │                                                    │
  ▼                                                    ▼
middleware.ts (route guards + security headers)  pg-boss (Postgres-backed queue)
                                                        │
                                                        ▼
                                                  src/jobs (workers, cron)
```

- **Framework:** Next.js 15.5, React 19, TypeScript strict (`noUncheckedIndexedAccess` on).
- **Database:** PostgreSQL 16, via Drizzle ORM (`postgres.js` driver). Schema lives in
  `src/db/schema/*`; migrations in `./drizzle`, generated with `drizzle-kit generate`
  and applied with `drizzle-kit migrate` (or `tsx src/db/migrate.ts` at deploy time,
  since `drizzle-kit` itself is a devDependency not shipped in the production image).
- **Auth:** better-auth, email/password, with the `admin` plugin and four custom
  roles (`super_admin`, `manager`, `executive`, `accountant`) defined in
  `src/lib/permissions.ts`. Route protection is layered: `src/middleware.ts` does a
  fast cookie-presence check (edge-safe) and redirects; `src/lib/session.ts`'s
  `requireUser()`/`requireRole()` re-validate the real session server-side in the
  `(crm)` layout and any page that needs it — never trust the middleware check alone.
- **UI:** Tailwind CSS 4 + shadcn/ui (Base UI primitives, not Radix — that's shadcn's
  current default; see Assumptions). Role-aware sidebar nav in
  `src/components/nav-config.ts` + `app-sidebar.tsx`.
- **Jobs:** pg-boss, bootstrapped in `src/lib/queue.ts` and started from
  `src/instrumentation.ts` on server boot. No workers registered yet — that starts
  in Phase 7 (Communication).
- **Logging:** pino, structured JSON, `src/lib/logger.ts`. No `console.log` in app
  code (Biome's `noConsole` rule enforces this; seed/migration CLI scripts and config
  files are exempted via a `biome.json` override since they're one-off Node scripts,
  not request-serving code).
- **Errors:** Sentry (`@sentry/nextjs`), env-gated — no-ops when `SENTRY_DSN` /
  `NEXT_PUBLIC_SENTRY_DSN` are empty.
- **Health check:** `GET /api/health` checks DB + queue connectivity, returns
  `503` if either is down. Used by Coolify's health check.

## Getting started

Prerequisites: Node 24+, a running PostgreSQL 16 instance.

```bash
cp .env.example .env      # then fill in DATABASE_URL, secrets, etc.
npm install
npm run db:migrate        # applies ./drizzle/*.sql
npm run db:seed           # creates admin@firstman.in + 3 users per staff role
npm run dev
```

Seeded accounts (password is `ADMIN_DEFAULT_PASSWORD` from `.env` for all of them):

| Email | Role |
|---|---|
| `admin@firstman.in` | `super_admin` |
| `manager{1,2,3}@firstman.in` | `manager` |
| `executive{1,2,3}@firstman.in` | `executive` |
| `accountant{1,2,3}@firstman.in` | `accountant` |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (webpack — see Assumptions on why not Turbopack) |
| `npm run start` | Serve the build with `next start` (local use; Docker uses the standalone server directly, see Dockerfile) |
| `npm run lint` / `lint:fix` | Biome check / check+fix |
| `npm run format` | Biome format |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `test:watch` / `test:coverage` | Vitest |
| `npm run test:e2e` | Playwright, against `next dev` (see Assumptions) |
| `npm run db:generate` | Generate a new migration from schema changes |
| `npm run db:migrate` | Apply migrations (drizzle-kit, dev/CI) |
| `npm run db:migrate:deploy` | Apply migrations at runtime via `tsx` (used by the Docker image) |
| `npm run db:push` | Push schema directly, no migration file (fast local iteration only) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Seed demo users |

## Environment variables

See `.env.example` for the full list with placeholder values. Notable ones:

- `DATABASE_URL` — Postgres connection string.
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — auth config; secret must be ≥32 chars.
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ID` — leave
  blank in dev to use a console/log driver (wired up in Phase 7).
- `LEADS_API_TOKEN` — bearer token for the public `POST /api/v1/leads` endpoint
  (Phase 2).
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — leave blank to disable Sentry.

All env vars are validated at boot with Zod (`src/lib/env.ts`) — the app throws on
startup with a clear error rather than failing confusingly later.

## Deployment (Docker/Coolify)

```bash
docker compose up --build   # local: app + postgres
```

The `Dockerfile` is a multi-stage build producing a Next.js **standalone** output.
The final image runs `tsx src/db/migrate.ts` (forward-only migrations from
`./drizzle`) before starting `node server.js`, so migrations apply automatically on
deploy — see Non-negotiables in `CLAUDE.md`. Point Coolify's health check at
`/api/health`.

## Testing

- **Unit** (Vitest): `src/**/*.test.ts`. Coverage threshold is 80% on `src/services`
  once that directory has content (Phase 1+) — Phase 0 only has `src/lib/money.ts`
  covered as a smoke test of the pipeline itself.
- **E2E** (Playwright): `tests/e2e/*.spec.ts`. Phase 0 covers the login flow
  (unauthenticated redirect + successful login → dashboard). The full critical-path
  smoke suite (login → lead → convert → order → invoice → payment) lands in Phase 8.

## Assumptions

Per `CLAUDE.md`'s closing instruction, decisions made where the spec didn't
prescribe an exact answer:

1. **shadcn/ui base library**: shadcn's current default preset (`base-nova`) uses
   Base UI (`@base-ui/react`) primitives, not Radix. The spec just says "shadcn/ui"
   without pinning the underlying primitive library, so we kept the CLI default
   rather than fighting it. This means composed components use a `render` prop
   (`<SidebarMenuButton render={<Link href="..." />}>`) instead of Radix's
   `asChild` + `<Slot>` pattern — worth knowing before copying examples from
   shadcn/Radix-era docs.
2. **`next build` without `--turbopack`**: `create-next-app` defaults `build` to
   `next build --turbopack`. On Windows, Turbopack's standalone-output file copy
   fails on chunk filenames containing a literal `:` (from `node:`-prefixed
   externals like `node:inspector`) — `:` isn't valid in a Windows path. Dropped
   `--turbopack` from the `build` script only; `dev` keeps it, since dev doesn't
   hit that copy step. Worth re-testing when Turbopack's Windows support matures.
3. **pg-boss + `pino-pretty` don't survive bundling**: `pino`'s `transport` option
   spawns a worker thread that loads a JS file by path, and that path resolution
   breaks under both Turbopack and webpack bundling (`thread-stream` module not
   found). `src/lib/logger.ts` emits structured JSON unconditionally; pipe
   `npm run dev | npx pino-pretty` locally if you want colorized dev output.
4. **`role` column is `text`, not a Postgres enum**: better-auth's CLI
   (`@better-auth/cli generate`) owns `src/db/schema/auth-schema.ts` — it's
   regenerated, not hand-edited, whenever the auth config changes. Better-auth
   expects `role` as a plain string internally, so we didn't fight it into a
   `pgEnum`. The `Role` union type (`src/lib/auth.ts`) and Zod validation are the
   actual enforcement; the `roleEnum` pgEnum in `src/db/schema/_shared.ts` is there
   for future domain tables (leads, orders, etc. all need a role-ish enum too) and
   is unrelated to `user.role`.
5. **`activity_logs` is append-only**: it deliberately skips the shared
   `updatedAt`/`deletedAt`/`createdBy`/`updatedBy` columns from
   `src/db/schema/_shared.ts` that every other table gets — an audit log that could
   be edited or soft-deleted defeats its own purpose.
6. **E2E tests run against `next dev`, not the Docker standalone build**: Next's
   standalone output only copies `public/` and `.next/static/` into
   `.next/standalone/` as a *manual* deploy step (that's what the Dockerfile does).
   Replicating that step just for local/CI Playwright runs added complexity for
   little benefit, since `npm run build` already runs as its own CI step and
   validates the production build compiles and type-checks. Playwright's
   `webServer` therefore runs `next dev` on a dedicated port (3100), with
   `BETTER_AUTH_URL` overridden to match — better-auth validates the request
   `Origin` header against it.
7. **`npm audit` is informational in CI, not blocking**: as of this writing, a
   from-scratch Next 15 + drizzle-kit + exceljs install carries 17 advisories
   (5 moderate, 12 high), all transitive, all inside dependencies' own bundled
   tooling (Next's vendored `sharp`/`postcss`, drizzle-kit's vendored `esbuild`,
   exceljs's `archiver`→`zip-stream` chain), and every available fix is a breaking
   downgrade of a pinned core dependency (e.g. `next` → `9.3.3`). Making the audit
   step blocking would make CI permanently red from commit zero, defeating its
   purpose of catching *new* regressions. `ci.yml`'s audit step runs with
   `continue-on-error: true` so it's visible without gating merges — revisit this
   whenever `next`, `drizzle-kit`, or `exceljs` ship a fix.
8. **Docker wasn't build-tested in this environment**: no Docker CLI is installed
   on this machine. The `Dockerfile`/`docker-compose.yml` follow the standard
   Next.js standalone multi-stage pattern and the CI workflow builds the image on
   tagged releases, but a first real `docker build` should happen before relying on
   it for a deploy.
9. **Local dev DB**: this machine already has PostgreSQL 16 installed natively
   (not in Docker) with `postgres`/`postgres` credentials — `.env`'s `DATABASE_URL`
   points at that instance directly rather than the `docker-compose.yml` Postgres
   service, which is there for teams without a local install.

## Phase 0 checklist (per `CLAUDE.md` §5)

- [x] Login works (`admin@firstman.in`, seeded), redirects correctly both ways
      (unauthenticated → `/login`, authenticated visiting `/login` → `/dashboard`).
- [x] Roles seeded (super_admin/manager/executive/accountant, 3 staff each).
- [x] Protected routes redirect (middleware cookie check + server-side
      `requireUser()` defense in depth; role-gated nav items verified for
      `executive`).
- [x] `/api/health` reports DB + queue connectivity.
- [x] Pre-commit hook (`lint-staged` + typecheck) and commit-msg hook (commitlint)
      installed via husky.
- [ ] **CI green on the first push** — workflow is written and exercised locally
      step-by-step, but hasn't run on GitHub Actions yet since this repo has no
      remote configured. Push to a GitHub remote and confirm before treating this
      box as checked.
