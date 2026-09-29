<!--
Sync Impact Report
Version change: (none) → 1.0.0
Modified principles: n/a (initial ratification)
Added sections:
  - Core Principles I–V (Free-Tier-First, Web-First MVP Scope, Explicit Per-User
    Authorization, Progressive Passwordless-to-Password Auth, Simplicity / YAGNI)
  - Technology Constraints
  - Development Workflow
  - Governance
Removed sections: none
Deferred TODOs: none
Rationale: First ratification of the constitution, derived from decisions already made
  and implemented in ARCHITECTURE.md and the current codebase (free-tier stack choice,
  web-first scope, Neon/Drizzle replacing Supabase RLS with app-layer authorization,
  the Google/email+password auth flow, and the adoption of Spec Kit for feature work
  going forward).
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
Sign-up MUST verify a real email address via a one-time emailed link (Resend) before an
account is treated as claimed. That verification step MUST prompt the user to set a
password (skippable, not forced). Ongoing sign-in MUST be via Google OAuth or
email+password; a fresh magic-link email MUST NOT be required for routine, repeated
sign-in. A user who is already authenticated MUST NOT be made to re-process a sign-in
link or see sign-in/sign-up forms.
Rationale: matches the explicit UX decision made for this product and avoids the poor
experience of requiring an email round-trip for every session.

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
(schema + migrations), Auth.js v5 (Google OAuth, Credentials, Resend email provider,
JWT sessions), TanStack Query, Resend (auth + reminder email), Vercel (hosting), GitHub
Actions (scheduled reminder polling). Introducing a new infrastructure dependency,
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

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
