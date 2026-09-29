# Implementation Plan: Auth Landing Page

**Branch**: `001-auth-landing-page` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-auth-landing-page/spec.md`

## Summary

Redesign the home page into a full-viewport hero (background: `public/time.jpg`) with an inline,
in-place authentication panel — no navigation to a separate page for the happy path. `/sign-in`
and `/sign-up` remain real routes showing the same panel standalone, since they're required as
direct-link/redirect targets (`src/proxy.ts` redirects unauthenticated `/dashboard` visits to
`/sign-in`). All three routes share one component so the experience and the underlying
Google/Credentials/Resend auth logic aren't duplicated three times.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router)

**Primary Dependencies**: Next.js, Tailwind CSS v4, Auth.js v5 (Google, Credentials, and Resend
providers — already configured in `src/lib/auth.ts`, unchanged by this feature)

**Storage**: N/A — no new tables/columns; reuses the existing `user` table via Auth.js

**Testing**: Manual verification via `quickstart.md`. No automated test suite is configured in the
project, and the spec does not request one (tests are optional per the Spec Kit tasks convention).

**Target Platform**: Web browser (desktop + mobile viewport), served by the existing Next.js app

**Project Type**: Web application — single Next.js project (no separate frontend/backend split)

**Performance Goals**: Standard web responsiveness; no numeric target specified in the spec

**Constraints**: Must reuse the existing Auth.js providers unchanged (no new auth backend logic);
must not introduce a second CSS framework (Tailwind only); must keep the visual treatment light
per the spec's "keep it bright, dark text" decision

**Scale/Scope**: One shared UI component rendered from three routes (`/`, `/sign-in`, `/sign-up`);
no new entities, tables, or API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Free-Tier-First | PASS | No new services or dependencies; purely presentational, reuses existing free-tier auth providers |
| II. Web-First MVP Scope | PASS | Web-only UI work; does not touch mobile, AI features, or new tracker entities |
| III. Explicit Per-User Authorization | N/A | This feature adds no new authenticated data queries; existing per-user checks in `dashboard/page.tsx` etc. are untouched |
| IV. Progressive Passwordless-to-Password Auth | PASS | Reuses the existing flow unchanged — sign-up via the inline panel still verifies email via Resend and still leads to `/onboarding/set-password` afterward |
| V. Simplicity/YAGNI | PASS | One shared component across 3 routes (not 3 duplicates); no new UI framework (Bootstrap rejected in favor of Tailwind) |

No violations. Complexity Tracking table omitted (not needed).

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output (states: no new entities)
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks - not created by this command)
```

No `contracts/` directory: this feature adds no new API endpoints or interface contracts. It
reuses the existing `/api/auth/[...nextauth]` route unchanged.

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                  # Home: renders <AuthLanding initialPanel={null} />
│   ├── sign-in/page.tsx          # Renders <AuthLanding initialPanel="signin" /> standalone
│   └── sign-up/page.tsx          # Renders <AuthLanding initialPanel="signup" /> standalone
└── components/
    └── auth/
        ├── auth-landing.tsx      # Hero background + gradient + toggle panel (client component)
        ├── google-auth-button.tsx   # Extracted "Continue with Google" button (currently
        │                             # duplicated inline in sign-in/page.tsx and sign-up/page.tsx)
        └── password-sign-in-form.tsx # Email + password form (extracted from sign-in/page.tsx)

# Existing, reused as-is:
# src/components/email-auth-form.tsx  — sign-up's email-verification-link form
# src/lib/auth.ts                     — Google/Credentials/Resend provider config (unchanged)
```

**Structure Decision**: Single Next.js project (Option 1 — no frontend/backend split, since API
routes and pages already live in the same app). One new `src/components/auth/` group holds the
shared landing/panel UI; `page.tsx`, `sign-in/page.tsx`, and `sign-up/page.tsx` become thin
wrappers around `AuthLanding` so the panel markup and auth-calling logic exist in exactly one
place.

## Complexity Tracking

*No constitution violations — table not needed.*
