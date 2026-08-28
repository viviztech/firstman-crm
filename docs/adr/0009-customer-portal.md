# 0009. Customer-facing portal (magic-link login, read-only)

## Status

Accepted

## Context

Section 6 of CLAUDE.md states "No client-facing portal in v1 (Phase 2 project)." The business has
now asked for exactly that: customers should be able to see their job/order status without calling
in, as the next step after the internal enquiry→sale→job-card→invoice flow (audited and largely
completed in the same work as this ADR — see the notification-gap fixes for enquiry thank-yous,
sale/proforma emails, and completion invoices). This ADR records the explicit, approved deviation
from that non-negotiable, rather than letting it happen silently, and documents the shape it takes.

## Decisions

1. **Passwordless magic-link login, not a password account or a static per-order link.** A
   customer enters their phone or email on `/portal/login`, receives a one-time link by email/
   WhatsApp, and clicking it opens a session covering *all* their orders/invoices/documents — not
   just one. This avoids a password/reset flow to support (a real cost for a low-frequency,
   B2C-ish user base) while still giving one login that covers everything the client owns, which a
   static per-order link cannot.

2. **A wholly separate `portal_login_tokens` / `portal_sessions` schema and cookie — not
   better-auth's `user` table or its `magicLink` plugin.** `clients` (`src/db/schema/clients.ts`)
   is a pure business record today with no auth fields, and ADR 0001 already established the
   precedent of keeping `staff_profiles` separate from better-auth's `user` table for a similar
   reason (different shape, different lifecycle). Conflating staff RBAC identity with read-only
   customer self-service under one auth system would be a bigger, riskier change than standing up a
   second, narrowly-scoped one. Both new tables store only a **hash** of the bearer secret
   (`token_hash` / cookie value hash) — never the raw value — so a database leak alone can't hand
   out a live login or session.

3. **v1 scope is read-only.** No document upload, no messaging, no payments from the portal —
   purely visibility into orders, their task/status timeline, invoices, and documents that already
   exist. This bounds the security surface of a first customer-facing release; a future portal
   feature that lets a customer *change* something is a new decision, not an extension of this one.

4. **`/portal/*` is deliberately left off `middleware.ts`'s `PROTECTED_PREFIXES` allowlist.**
   That list is keyed to better-auth's `getSessionCookie()`, which has no notion of the portal's own
   cookie. Rather than teach middleware a second, unrelated session type, portal auth is enforced at
   the page/route level via a `getPortalClient()` helper (parallel to `requireUser()`, redirecting to
   `/portal/login` instead of `/login`) — consistent with how the codebase already treats middleware
   as a cheap first gate and pushes real authorization deeper (role checks in Server Actions, scope
   checks in the service layer).

5. **One narrow, deliberate exception to "jobs re-fetch by id, never trust payload data":** the
   magic-link job payload carries the raw token itself (`{ clientId, rawToken, channel }`), because
   the raw token cannot be re-derived from its stored hash — by design, only the hash is persisted.
   This is safe because the payload is written once by the request-link route and read once by
   pg-boss's own internal job storage, never by an untrusted client; it is not a precedent for
   trusting payload data in the general case.

6. **Enumeration-safe by construction.** `requestPortalLoginLink` does the same amount of work and
   returns the same generic response whether or not the phone/email matches a client — token
   creation and the enqueue only happen on an actual match, but the caller never learns which case
   occurred, mirroring how auth failures elsewhere in the app avoid revealing account existence.

## Consequences

- This is new attack surface: a rate-limited, enumeration-safe login-request endpoint; single-use,
  short-lived (15 minute) login tokens; longer-lived (30 day) but revocable sessions; and an
  explicit cross-tenant ownership check on every document served through the portal. The test suite
  added alongside this ADR (`portal-auth.test.ts` and the portal route tests) is the acceptance bar
  for those properties — any change to this code should keep them green.
- A customer with no email on file still gets the link by WhatsApp only, same fallback behavior as
  every other client notification in this codebase (`notifyEmail` no-ops cleanly with no recipient).
- A future request to let customers upload documents, pay invoices, or message staff from the
  portal needs its own ADR addendum — this one's read-only scope should not be silently expanded.

## Alternatives considered

- **Static signed link per order** (no login at all), the simplest option and closest to the
  existing invoice-PDF signed-URL pattern (`src/lib/signed-url.ts`). Rejected because a client with
  multiple concurrent orders would need to juggle several unrelated links with no single place to
  see everything, which defeats the point of "check your status" as a repeatable habit.
- **Email + password customer accounts** via better-auth. Rejected for the reasons in Decision 1 and
  2 — a password to manage and reset is a real support cost for a low-frequency user base, and it
  would pull customer identity into the same auth system as staff RBAC for no benefit v1 needs.
- **Extending `PROTECTED_PREFIXES` to understand the portal cookie.** Rejected — it would mean
  teaching the shared middleware about a second, structurally different session type instead of
  reusing the "cheap gate at the edge, real check deeper" pattern already established for staff
  pages.
