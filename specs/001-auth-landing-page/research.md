# Phase 0 Research: Auth Landing Page

No `[NEEDS CLARIFICATION]` markers remained in the Technical Context, so this documents the
design decisions made while turning the spec into a concrete plan rather than resolving unknowns.

## Decision 1: One shared component across three routes

**Decision**: Build a single `AuthLanding` client component (hero background + toggleable
sign-in/sign-up panel) and render it from `/`, `/sign-in`, and `/sign-up`, each passing a
different `initialPanel` prop (`null`, `"signin"`, `"signup"`).

**Rationale**: FR-006 requires `/sign-in` and `/sign-up` to show "the same in-place panel
experience shown standalone." Rendering one component from three routes is the only way to
satisfy that without duplicating markup and auth-calling logic three times over (Constitution V).

**Alternatives considered**:
- Three fully separate page implementations — rejected: duplication and drift risk (a fix to the
  Google button would need to be repeated three times).
- Making `/sign-in` and `/sign-up` client-side redirects to `/?panel=signin` — rejected: this is
  still a navigation, and FR-006 says the dedicated routes must show the experience "standalone,"
  not bounce visitors elsewhere.

## Decision 2: Panel toggle is local component state

**Decision**: The open/closed panel state (`null | "signin" | "signup"`) is plain `useState` in
the client component, seeded from the `initialPanel` prop. No URL search param, no server state.

**Rationale**: Nothing in the spec requires the panel state to survive a reload or be shareable
via URL — it's a presentational toggle. Adding either would be scope beyond what's specified
(Constitution V, Simplicity/YAGNI).

**Alternatives considered**: Driving panel state from a `?panel=` search param even on `/` —
rejected as unnecessary; no acceptance scenario calls for it.

## Decision 3: Contrast strategy for a bright, uneven background image

**Decision**: Layer `next/image` (`fill`, `priority`) for `time.jpg` under an absolutely
positioned low-opacity white-to-transparent gradient div, with dark charcoal headline/subheading
text plus a subtle `drop-shadow` as a safety margin.

**Rationale**: The photo is mostly white/light-gray but has diagonal mid-gray shadow bands, so a
single flat text color risks failing SC-003 ("readable against every region of the background
image") wherever the text overlaps a lighter or darker patch. The gradient + shadow combination
gives a contrast floor without darkening the image (matches the "keep it bright, dark text"
decision).

**Alternatives considered**:
- No overlay, text color only — rejected: fails SC-003 risk check over the diagonal shadow bands.
- Dark overlay + white text — rejected: explicitly ruled out in favor of keeping the image bright.

## Decision 4: Extract shared auth-method components

**Decision**: Pull the "Continue with Google" button and the email+password form out of
`sign-in/page.tsx`/`sign-up/page.tsx` into `src/components/auth/google-auth-button.tsx` and
`src/components/auth/password-sign-in-form.tsx`. Continue reusing the existing
`src/components/email-auth-form.tsx` for the sign-up email-verification step.

**Rationale**: The Google button's server action (`signIn("google", ...)`) is already duplicated
between the current sign-in and sign-up pages. Folding both pages into `AuthLanding` would
duplicate it a third time if not extracted first.

**Alternatives considered**: Leave the Google button inline inside `AuthLanding` and accept one
copy — rejected: `AuthLanding` renders in both a "signin" and "signup" panel mode in the same
component tree, so inlining it would still mean writing the same JSX/server-action twice within
one file.
