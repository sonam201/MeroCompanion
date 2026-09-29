---

description: "Task list for feature implementation"
---

# Tasks: Auth Landing Page

**Input**: Design documents from `specs/001-auth-landing-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md (no new entities), quickstart.md

**Tests**: Not requested in the spec — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are exact and relative to the repo root

## Phase 1: Setup

**Purpose**: Confirm the groundwork this feature needs is already in place

- [ ] T001 Confirm `public/time.jpg` exists and that no `next.config.ts` change is needed for
      `next/image` to render a local `public/` image (it isn't — local images work by default)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared `AuthLanding` component and its pieces. All three user stories render
this component, so it must exist before any story phase can be verified.

**⚠️ CRITICAL**: No user story work can be verified until this phase is complete

- [ ] T002 [P] Extract the "Continue with Google" button into `src/components/auth/google-auth-button.tsx`
      as a component accepting a `redirectTo: string` prop, replacing the duplicated inline
      `signInWithGoogle` server-action forms currently in `src/app/sign-in/page.tsx` and
      `src/app/sign-up/page.tsx`
- [ ] T003 [P] Extract the email+password sign-in form into `src/components/auth/password-sign-in-form.tsx`,
      moved from `src/app/sign-in/page.tsx` — preserve the existing `signIn("credentials", ...)`
      call and the `AuthError` catch that redirects to `?error=CredentialsSignin` on failure
- [ ] T004 Create `src/components/auth/auth-landing.tsx` as a client component that renders:
      the `time.jpg` hero background via `next/image` (`fill`, `priority`); an absolutely
      positioned low-opacity white-to-transparent gradient overlay div; a headline/subheading in
      dark charcoal text with a `drop-shadow` utility for contrast; and "Sign in"/"Sign up"
      buttons styled in Tailwind with a hover/transition animation. Accepts an
      `initialPanel: "signin" | "signup" | null` prop and manages open-panel state with
      `useState`, seeded from that prop (depends on T002, T003)
- [ ] T005 In `src/components/auth/auth-landing.tsx`, wire the sign-up panel to render
      `GoogleAuthButton` (`redirectTo="/dashboard"`) and the existing
      `src/components/email-auth-form.tsx` (`redirectTo="/onboarding/set-password"`), and wire
      the sign-in panel to render `GoogleAuthButton` (`redirectTo="/dashboard"`) and
      `PasswordSignInForm` (depends on T004)

**Checkpoint**: `AuthLanding` is fully built and self-contained — user story phases below only
wire it into routes and verify behavior.

---

## Phase 3: User Story 1 - Welcoming first impression with clear entry points (Priority: P1) 🎯 MVP

**Goal**: The home page shows the hero image, headline, and Sign in/Sign up buttons; signed-in
visitors are redirected straight to the dashboard instead.

**Independent Test**: Visit `/` signed out — see background, headline, buttons. Visit `/` signed
in — redirected to `/dashboard`. (Quickstart Scenario 1)

### Implementation for User Story 1

- [ ] T006 [US1] Update `src/app/page.tsx` to check the session via `auth()` (same pattern
      already used in `src/app/dashboard/page.tsx`), `redirect("/dashboard")` if signed in,
      otherwise render `<AuthLanding initialPanel={null} />`
- [ ] T007 [US1] Remove the existing plain hero markup and Sign up/Sign in `<Link>` buttons from
      `src/app/page.tsx` now that `AuthLanding` replaces them

**Checkpoint**: User Story 1 is fully functional and independently testable (Quickstart Scenario 1).

---

## Phase 4: User Story 2 - Sign up without leaving the welcome screen (Priority: P2)

**Goal**: Clicking "Sign up" (from `/`, or landing directly on `/sign-up`) reveals the Google and
email options in place, and submitting an email starts account verification without navigation.

**Independent Test**: Click Sign up, confirm both options appear inline; submit an email, confirm
an inline confirmation state and that a verification email arrives. (Quickstart Scenario 2)

### Implementation for User Story 2

- [ ] T008 [US2] Update `src/app/sign-up/page.tsx` to render `<AuthLanding initialPanel="signup" />`
      standalone, replacing its current form-based markup, while keeping the existing
      redirect-to-`/dashboard`-if-already-signed-in check
- [ ] T009 [US2] Confirm the sign-up panel's email form still calls
      `signIn("resend", { email, redirectTo: "/onboarding/set-password" })` and shows an inline
      "check your email" confirmation state within the panel, rather than navigating to the
      separate `/verify-request` page

**Checkpoint**: User Stories 1 and 2 both work independently (Quickstart Scenarios 1–2).

---

## Phase 5: User Story 3 - Returning visitor signs in without leaving the welcome screen (Priority: P3)

**Goal**: Clicking "Sign in" (from `/`, or landing directly on `/sign-in`) reveals the Google and
email/password options in place; incorrect credentials show an inline error.

**Independent Test**: Click Sign in, confirm both options appear inline; submit wrong credentials,
confirm an inline error with no lost page state; submit correct credentials, confirm arrival at
`/dashboard`. (Quickstart Scenario 3)

### Implementation for User Story 3

- [ ] T010 [US3] Update `src/app/sign-in/page.tsx` to render `<AuthLanding initialPanel="signin" />`
      standalone, replacing its current form-based markup, while keeping the existing
      redirect-to-`/dashboard`-if-already-signed-in check
- [ ] T011 [US3] Confirm `PasswordSignInForm`'s existing `?error=CredentialsSignin` handling
      renders an inline error message within the `AuthLanding` panel when arriving at `/sign-in`
      directly with that query param, satisfying FR-007

**Checkpoint**: All three user stories are independently functional (Quickstart Scenarios 1–4).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and final verification across all three stories

- [ ] T012 [P] Confirm no leftover duplicate Google-button or password-form markup remains in
      `src/app/sign-in/page.tsx` or `src/app/sign-up/page.tsx` after extraction (T002, T003)
- [ ] T013 Run `npm run build` and `npm run lint`; fix any errors before considering the feature done
- [ ] T014 Manually run all 5 scenarios in `specs/001-auth-landing-page/quickstart.md`, including
      the desktop/mobile contrast check (Scenario 5 / SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T004, T005 depend on
  T002, T003 within this phase)
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion; independent of each
  other otherwise
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3
- **User Story 2 (P2)**: No dependency on US1/US3 (shares `AuthLanding` from Foundational, not
  from US1)
- **User Story 3 (P3)**: No dependency on US1/US2

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T012 can run in parallel with T013/T014 (read-only check vs. build/manual test)
- US2 (Phase 4) and US3 (Phase 5) can be implemented in either order, or in parallel, once
  Foundational is done

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (`AuthLanding` fully built)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run Quickstart Scenario 1
5. Demo if ready — the hero/welcome screen alone is already a coherent increment

### Incremental Delivery

1. Setup + Foundational → `AuthLanding` ready
2. Add User Story 1 → validate → demo (MVP)
3. Add User Story 2 → validate → demo
4. Add User Story 3 → validate → demo
5. Polish phase → full quickstart pass

## Notes

- [P] tasks touch different files with no dependency between them
- Foundational phase (T002–T005) is unusually large relative to the user story phases because
  all three stories render the same component — this matches the plan's Decision 1 (one shared
  component, not three duplicates)
- Commit after each phase checkpoint
