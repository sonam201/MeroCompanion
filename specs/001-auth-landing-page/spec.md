# Feature Specification: Auth Landing Page

**Feature Branch**: `001-auth-landing-page`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Landing/auth page redesign: the home page ("/") shows a full-viewport hero using public/time.jpg as the background, with a low-opacity light gradient overlay (not darkening) and dark charcoal text for headline/subheading so it stays legible against the bright photo. Two buttons, "Sign in" and "Sign up," styled in Tailwind with a custom hover/transition animation. Clicking either reveals an inline auth panel on the same page (no navigation) offering "Continue with Google" plus, for sign-in, an email+password form, and for sign-up, an email-verification-link form — reusing the existing Google/Credentials/Resend providers. Already-authenticated visitors to "/" still redirect to /dashboard. /sign-in and /sign-up remain real routes (needed as redirect targets) showing the same inline-panel experience standalone."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Welcoming first impression with clear entry points (Priority: P1)

A visitor arrives at the site for the first time and sees a full-screen welcoming image with a clear headline and two visible actions: "Sign in" and "Sign up".

**Why this priority**: This is the very first thing every visitor experiences. Without it there is no entry point into the product at all.

**Independent Test**: Visit the site while signed out and confirm the background image, headline, and both buttons render and are legible on their own, with no other functionality required.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor loads the home page, **When** the page renders, **Then** they see the background image, a readable headline, and "Sign in" / "Sign up" buttons.
2. **Given** a signed-in visitor loads the home page, **When** the page renders, **Then** they are taken directly to their dashboard instead of the welcome screen.

---

### User Story 2 - Sign up without leaving the welcome screen (Priority: P2)

A new visitor clicks "Sign up" and is presented, in place, with the option to continue with a Google account or to verify an email address to create an account — without navigating to a separate page.

**Why this priority**: Converting a new visitor into an account holder is the primary goal of the landing experience.

**Independent Test**: Click "Sign up", confirm both options appear on the same screen, and confirm submitting either successfully starts account creation.

**Acceptance Scenarios**:

1. **Given** a visitor clicks "Sign up", **When** the panel opens, **Then** they see a "Continue with Google" option and an email-entry option, both without a page navigation.
2. **Given** a visitor enters their email and submits, **When** they check that inbox, **Then** they receive a link to finish creating their account.

---

### User Story 3 - Returning visitor signs in without leaving the welcome screen (Priority: P3)

A returning visitor clicks "Sign in" and is presented, in place, with the option to continue with Google or to enter an email and password.

**Why this priority**: This is the main return path for existing account holders, but it happens less often than first-time sign-up for a growth-focused landing page.

**Independent Test**: Click "Sign in", submit valid Google or email/password credentials, and confirm arrival at the dashboard.

**Acceptance Scenarios**:

1. **Given** a returning visitor clicks "Sign in", **When** the panel opens, **Then** they see a "Continue with Google" option and an email/password form, both without a page navigation.
2. **Given** a visitor enters a correct email and password, **When** they submit, **Then** they land on their dashboard.
3. **Given** a visitor enters incorrect credentials, **When** they submit, **Then** they see an error message without losing their place on the page.

---

### Edge Cases

- What happens when the background image fails to load? The headline and buttons MUST remain legible against a fallback background.
- How does the system handle a visitor who arrives directly at a dedicated sign-in or sign-up address (e.g., a bookmarked link) instead of starting from the welcome screen? They MUST see the same panel experience standalone on that address.
- What happens when a visitor submits invalid or incomplete information (e.g., malformed email)? They MUST see inline feedback without being navigated away from the panel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST display a full-screen welcoming background image with a headline and subheading that remain legible regardless of the image's brightness.
- **FR-002**: The home page MUST show two entry actions, "Sign in" and "Sign up", each visually responding to user interaction (e.g., a hover or press animation).
- **FR-003**: Clicking "Sign up" MUST reveal, on the same screen, the option to continue with a Google account or to begin account creation with an email address.
- **FR-004**: Clicking "Sign in" MUST reveal, on the same screen, the option to continue with a Google account or to sign in with an email address and password.
- **FR-005**: A visitor who is already signed in and loads the home page MUST be taken directly to their dashboard instead of seeing the welcome screen.
- **FR-006**: The sign-in and sign-up experiences MUST also be reachable at their own dedicated addresses for visitors arriving from a direct link, producing the same in-place panel experience shown standalone.
- **FR-007**: Submitting incorrect sign-in credentials MUST show an error message without losing the visitor's place on the page.
- **FR-008**: Submitting a sign-up email MUST send the visitor a link that lets them finish creating their account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify how to sign up within 5 seconds of the page loading.
- **SC-002**: Visitors can complete the start of sign-up or sign-in (submitting the form/redirecting to Google) without a single full-page navigation away from the welcome screen.
- **SC-003**: Headline and button text remain readable against every region of the background image, verified by manual review of at least 3 different crops/positions of the image.
- **SC-004**: Sign-in/sign-up attempts started from a direct link to the dedicated address produce the same outcome as those started from the welcome screen, 100% of the time.

## Assumptions

- The background image is a static photo already provided by the project; no image upload or rotation feature is in scope.
- "Continue with Google" and email-based sign-in/sign-up already exist as account methods; this feature changes only where and how they are presented, not the underlying methods themselves.
- Mobile responsiveness follows the same baseline as the rest of the product; no distinct mobile-only design is specified.
- A single fixed light, bright visual treatment is expected; dark mode or alternate themes for this page are out of scope.
