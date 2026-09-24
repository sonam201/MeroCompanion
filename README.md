# MeroCompanion

A web-first companion app for job-search / career-progress tracking: schedule tasks, link them to
goals, run Pomodoro work sessions, capture notes after each session, and get email reminders on
your own schedule.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.

## Stack

Next.js (App Router, TypeScript) + Neon (Postgres) + Drizzle ORM + Auth.js (magic-link email via
Resend) + TanStack Query, all on free tiers.

## Getting started

1. Copy the env template and fill in your keys:

   ```bash
   cp .env.local.example .env.local
   ```

2. Create a [Neon](https://neon.tech) project and copy its connection string into
   `DATABASE_URL`.
3. Generate an auth secret: `npx auth secret` (writes/prints a value for `AUTH_SECRET`).
4. Create a [Resend](https://resend.com) account and API key for `AUTH_RESEND_KEY`. Sending to
   arbitrary recipients (not just yourself) requires a verified sending domain, set as
   `RESEND_FROM_EMAIL`.
5. Install dependencies and push the schema to your Neon database:

   ```bash
   npm install
   npx drizzle-kit migrate
   ```

6. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `src/app` — routes (App Router)
- `src/lib/db` — Drizzle schema (`schema.ts`) and DB client (`index.ts`)
- `src/lib/auth.ts` — Auth.js configuration
- `drizzle/` — generated SQL migrations (from `npx drizzle-kit generate`)
