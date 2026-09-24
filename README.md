# MeroCompanion

A web-first companion app for job-search / career-progress tracking: schedule tasks, link them to
goals, run Pomodoro work sessions, capture notes after each session, and get email reminders on
your own schedule.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.

## Stack

Next.js (App Router, TypeScript) + Supabase (Postgres/Auth/RLS) + TanStack Query + Resend, all on
free tiers.

## Getting started

1. Copy the env template and fill in your Supabase/Resend keys:

   ```bash
   cp .env.local.example .env.local
   ```

2. Create a [Supabase](https://supabase.com) project, then run the migration in
   `supabase/migrations/0001_init.sql` against it (via the SQL editor, or the Supabase CLI).
3. Create a [Resend](https://resend.com) account and API key. Sending to arbitrary recipients
   requires a verified domain; without one, test emails can only go to your own address.
4. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project layout

- `src/app` — routes (App Router)
- `src/lib/supabase` — Supabase client helpers (browser, server, middleware)
- `supabase/migrations` — SQL schema + RLS policies
