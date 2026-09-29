# Quickstart: Validating the Auth Landing Page

## Prerequisites

- `.env.local` filled in (Neon `DATABASE_URL`, `AUTH_SECRET`, `AUTH_RESEND_KEY`,
  `RESEND_FROM_EMAIL`; `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` needed for the Google scenarios)
- Dev server running: `npm run dev`, then open `http://localhost:3000`

## Scenario 1 — Welcome screen (User Story 1)

1. In a signed-out browser (or private window), visit `/`.
2. **Expect**: full-screen `time.jpg` background, a legible headline/subheading, and two buttons
   — "Sign in" and "Sign up" — each with a visible hover/press animation.
3. Sign in (see Scenario 3), then visit `/` again.
4. **Expect**: immediate redirect to `/dashboard` — the welcome screen is not shown to signed-in
   visitors.

## Scenario 2 — Sign up in place (User Story 2)

1. From `/`, click "Sign up".
2. **Expect**: an auth panel opens on the same page (no URL/page navigation) showing "Continue
   with Google" and an email field.
3. Enter an email and submit.
4. **Expect**: a confirmation state (e.g. "check your email") without leaving the page; an email
   arrives at that address with a verification link.
5. Click the link.
6. **Expect**: signed in, landing on `/onboarding/set-password` (existing behavior, unchanged by
   this feature).

## Scenario 3 — Sign in in place (User Story 3)

1. From `/`, click "Sign in".
2. **Expect**: the panel opens on the same page showing "Continue with Google" and an
   email+password form.
3. Submit an incorrect password.
4. **Expect**: an inline error message; still on the same page/panel.
5. Submit the correct email+password.
6. **Expect**: redirected to `/dashboard`.

## Scenario 4 — Direct links to /sign-in and /sign-up (FR-006)

1. Visit `/sign-in` directly (not via clicking through from `/`).
2. **Expect**: the same panel experience as Scenario 3, shown standalone (hero background,
   sign-in panel already open).
3. Visit `/sign-up` directly.
4. **Expect**: the same panel experience as Scenario 2, shown standalone, sign-up panel already
   open.
5. While signed in, visit `/sign-in` or `/sign-up` directly.
6. **Expect**: redirect to `/dashboard` (existing behavior, unchanged).

## Scenario 5 — Contrast check (SC-003)

1. Resize the browser window / check on both a wide desktop viewport and a narrow mobile-width
   viewport.
2. **Expect**: headline/subheading text stays readable against whichever part of `time.jpg` is
   behind it at that viewport size, including over the diagonal light/shadow streaks.
