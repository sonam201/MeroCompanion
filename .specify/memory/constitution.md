<!--
Sync Impact Report
Version change: 1.0.0 → 2.0.0
Modified principles: IV. Progressive Passwordless-to-Password Auth — redefined (Google OAuth
  removed; email verification changed from a clicked magic link to a typed one-time code)
Added sections: none
Removed sections: none
Deferred TODOs: none
Rationale: Google OAuth was dropped after `redirect_uri_mismatch` setup friction; the sign-up
  verification mechanism changed from an emailed link (Auth.js's Email/Resend provider) to a
  typed 6-digit code, both verified and consumed through the Credentials provider's own
  `authorize()` rather than an adapter-managed flow. Principle IV's mandated auth methods no
  longer match reality, so this is a MAJOR (backward-incompatible) redefinition, not a wording
  clarification.
-->

# MeroCompanion Constitution

## Core Principles

### I. Free-Tier-First
All infrastructure and third-party services MUST run on free tiers (Neon, Resend, Vercel,
GitHub Actions, Google OAuth, etc.). No paid service, paid tier upgrade, or usage-based
billing risk may be introduced without explicit user approval first. When a free tier
imposes a hard constraint (e.g. Resend's 100 emails/day, Vercel Hobby cron limited to
once/day), the design MUST work around the constraint rather than assume it away.
Rationale: the project is explicitly scoped to run on free services; this is a standing
cost constraint, not a one-time setup decision.

### II. Web-First MVP Scope
The Next.js web app is the MVP target. Mobile (Expo) is an explicit phase 2 and MUST NOT
drive architectural decisions in the web app or delay web feature delivery. AI/chat
companion features and generic "tracker" entities beyond tasks/goals/Pomodoro/notes are
out of scope until the MVP (auth, tasks, goals, Pomodoro sessions, session notes, email
reminders) is complete and explicitly re-scoped.
Rationale: scope was deliberately narrowed to ship a usable MVP rather than a broad
platform; expanding scope silently defeats that decision.

### III. Explicit Per-User Authorization
Neon/Drizzle has no database-level row-security backstop (unlike the Supabase RLS
approach originally considered). Every query or mutation that touches user-owned data
(goals, tasks, pomodoro_sessions, session_notes, reminder_preferences, notification_log)
MUST explicitly filter or scope by the authenticated session's user id inside the
API route or server action. Client-supplied user/account identifiers MUST NOT be trusted
for authorization decisions.
Rationale: removing Supabase removed the DB-level safety net; the application layer is
now the only enforcement point, so it cannot be treated as optional or added later.

### IV. Progressive Passwordless-to-Password Auth
Sign-up MUST verify a real email address via a one-time code emailed to it (Resend) before
an account is treated as claimed. That verification step MUST prompt the user to set a
password (skippable, not forced) immediately after. Ongoing sign-in MUST be via
email+password; a fresh verification code MUST NOT be required for routine, repeated
sign-in. A user who is already authenticated MUST NOT be made to re-process a sign-in
code or see sign-in/sign-up forms. Google OAuth (or any third-party identity provider) is
out of scope unless explicitly reintroduced by a future amendment.
Rationale: matches the explicit UX decision made for this product and avoids the poor
experience of requiring an email round-trip for every session. Google OAuth was tried and
removed after redirect URI configuration friction during setup; re-adding a third-party
provider is a deliberate future decision, not a default to fall back to.

### V. Simplicity / YAGNI
Implement what the current spec requires and no more. Do not add abstractions,
configuration options, or speculative extensibility for requirements that are not yet
specified. A feature is done when it satisfies its spec's acceptance criteria, passes
`npm run build` and `npm run lint`, and has been committed with a message explaining why
the change was made.
Rationale: keeps a solo-maintained, free-tier project tractable and avoids unreviewable,
oversized changes.

## Technology Constraints

Approved stack: Next.js (App Router, TypeScript), Neon (Postgres), Drizzle ORM
(schema + migrations), Auth.js v5 (Credentials provider only, no adapter, JWT sessions),
TanStack Query, Resend (called directly for OTP + reminder email, not through an Auth.js
provider), Vercel (hosting), GitHub Actions (scheduled reminder polling). Introducing a new
infrastructure dependency,
replacing a stack component, or adding a paid tier requires updating `ARCHITECTURE.md`
in the same change and MUST be treated as a constitution-relevant decision, not a
routine implementation detail.

## Development Workflow

Feature work MUST follow the Spec Kit flow: `/speckit-specify` to define the feature,
`/speckit-plan` to design the implementation, `/speckit-tasks` to break it into actionable
tasks, then `/speckit-implement` to execute. `/speckit-clarify`, `/speckit-checklist`, and
`/speckit-analyze` are available to de-risk ambiguous specs before implementation and
should be used when a spec has open questions. Ad hoc feature implementation outside this
flow is discouraged once a feature has a spec in progress. Every change MUST pass
`npm run build` and `npm run lint` before being committed.

## Governance

This constitution supersedes ad hoc practice for anything it covers. Amendments are made
via `/speckit-constitution`, MUST update the version per semantic versioning (MAJOR for
backward-incompatible principle removal/redefinition, MINOR for new/materially expanded
principles or sections, PATCH for clarifications/wording), and MUST update
`LAST_AMENDED_DATE`. Changes to the approved technology stack MUST be reflected in both
this document and `ARCHITECTURE.md` together. Reviews of specs/plans should verify
compliance with these principles before implementation begins.

**Version**: 2.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-30
