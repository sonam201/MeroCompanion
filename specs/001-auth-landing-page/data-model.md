# Phase 1 Data Model: Auth Landing Page

No new data entities. This feature is presentation-only: it changes where and how the existing
Google OAuth, email+password (Credentials), and email-verification-link (Resend) sign-in methods
are surfaced, without changing the underlying `user`, `account`, `session`, or
`verificationToken` tables defined in `src/lib/db/schema.ts`.
