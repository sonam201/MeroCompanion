# MeroCompanion — System Design

A web-first companion app for professionals in job search / career-progress mode: schedule and
track tasks, run focused Pomodoro work sessions against them, capture notes after each session,
and get email reminders on a self-defined schedule.

## Product scope (MVP)

1. Auth + per-user reminder schedule setup
2. Tasks: create/schedule/tag/prioritize; dashboard shows "what's next" and "what's left"
3. Goals: create, link tasks to a goal, progress rollup
4. Pomodoro: per-task timer, configurable focus/break length
5. Session notes: prompt + capture right after each Pomodoro session; shown as a timeline per task
6. Email digest: reminders sent to whatever email the user is currently signed in with, on a
   schedule the user defines themselves (not a fixed global cadence)

Out of scope for MVP: AI/chat features, mobile app (Expo, phase 2), generic "trackers" beyond
tasks/habits-via-tasks.

## Domain model

- **User** — id, email (kept in sync with current auth identity), enabled_task_categories
  (which of Other/Study Mode/Job Application Mode/Work the dashboard offers and charts for this
  user)
- **ReminderPreference** — user_id, schedule definition (specific times / frequency / days),
  enabled flag, `next_send_at` (computed), `timezone` (IANA name, default `'UTC'`; opportunistically
  captured from the browser on every dashboard load - see feature 004 - and read by the
  missed-task-reminder cron to compute each user's own "today"/threshold math)
- **Goal** — id, user_id, title, target_date, category, progress rollup
- **Task** — id, user_id, goal_id (nullable), title, description, status, priority,
  scheduled_at/due_at, category (Other / Study Mode / Job Application Mode / Work),
  estimated_pomodoros, first_reminder_sent_at/second_reminder_sent_at (nullable; set once a
  missed-start reminder has gone out for that stage, feature 004)
- **PomodoroSession** — id, task_id, user_id, started_at, ended_at, planned_focus_min,
  planned_break_min, completed
- **SessionNote** — id, session_id, task_id, user_id, content, created_at — forms a running
  progress log per task
- **NotificationLog** — id, user_id, sent_at, type, payload_summary — prevents duplicate sends,
  aids debugging

Dashboard reads: "next up" = upcoming scheduled tasks; "left to do" = overdue/incomplete; goal
progress = rollup of linked task completion; per-task history = ordered SessionNotes.

## Stack (all free-tier)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router, TypeScript) | Web-first; SSR for dashboard |
| Database | Neon (serverless Postgres) | Free tier, compute auto-suspends when idle and wakes automatically on the next query — no manual "restore" step and no project deletion for inactivity (unlike Supabase's weekly pause) |
| ORM/migrations | Drizzle ORM + drizzle-kit | Schema-as-code (`src/lib/db/schema.ts`), typed queries, generates SQL migrations (`drizzle/`) |
| Auth | Auth.js (NextAuth v5), Credentials provider only, no adapter. Sign-up: typed email → a 6-digit code emailed via Gmail SMTP (Nodemailer, called directly, not through an Auth.js provider) → typed back to verify → set a password. Ongoing sign-in: email+password | Self-hosted, free. `authorize()` manages the `users`/`verificationTokens` tables directly via Drizzle — no OAuth, no adapter-managed sessions. `user.email` in our own DB is the reminder target. Session strategy is JWT (required for the Credentials provider), not database. Google OAuth was tried and removed (see constitution v2.0.0) after `redirect_uri_mismatch` setup friction |
| Authorization | Enforced in the application layer (API routes check `auth()` session before every query) | Neon has no RLS-by-identity like Supabase; ownership checks move into route handlers/server actions instead |
| Email | Gmail SMTP via Nodemailer, using the project owner's own Gmail account + an App Password | Zero cost, no domain to buy or verify, works immediately for any recipient — unlike Resend's free sandbox sender, which can only email the Resend account's own address until a domain is verified. Resend was tried first and dropped for exactly that reason (see constitution amendment). Subject to Gmail's own sending limits (~500/day on a personal account), which is far above this app's OTP/reminder volume |
| Scheduler | Poll `reminder_preferences.next_send_at` every ~5-10 min via a scheduled GitHub Actions workflow hitting a Next.js API route, which sends due reminders via the same Gmail SMTP helper and recomputes `next_send_at` | Neon has no built-in cron/edge functions; Vercel's free Hobby cron only fires once/day. GitHub Actions scheduled workflows are free and reliable enough for this cadence |
| Data fetching | TanStack Query | Caching/sync for dashboard, tasks, sessions |
| Hosting | Vercel (Hobby/free) | Free Next.js hosting |
| Mobile (phase 2) | Expo, same Neon + Auth.js backend via API routes | Deferred; backend is already decoupled from the web frontend so no rework needed |

### Free-tier constraints to keep in mind

- Neon free tier: 0.5GB storage, ~191 compute hours/month, compute auto-suspends after 5 min idle
  (resumes automatically on the next query, sub-second to a few seconds cold start).
- Gmail SMTP caps a personal account at roughly 500 emails/day — comfortably above this app's
  OTP/reminder volume, but not meant for bulk/marketing mail. Requires 2-Step Verification enabled
  on the sending Google account, with an App Password (not the account password) in `.env.local`.
- Vercel Hobby cron is once/day — do **not** use it for the reminder poller (see above). GitHub
  Actions free tier gives 2,000 minutes/month on private repos (unlimited on public).
- Without Supabase-style RLS, every API route/server action that touches a domain table must
  explicitly filter by the authenticated `userId` — there's no DB-level backstop.

## Next steps

1. ~~Scaffold Next.js + TypeScript project~~ done
2. ~~Define schema/migrations for the tables above~~ done (`src/lib/db/schema.ts`, `drizzle/`)
3. ~~Create Neon project, run the generated migration against it~~ done. ~~Create Resend
   account~~ dropped (see constitution amendment) — now: enable 2-Step Verification on the
   sending Gmail account, generate an App Password, fill `GMAIL_USER`/`GMAIL_APP_PASSWORD` into
   `.env.local`
4. Build auth screens (magic-link sign-in/sign-out) against Auth.js
5. ~~Build reminder scheduler (GitHub Actions workflow + API route)~~ done for the missed-Pomodoro-
   start case (`.github/workflows/missed-task-reminders.yml` → `POST /api/cron/missed-task-reminders`,
   secret-protected via `CRON_SECRET` since there's no signed-in caller — see
   `specs/004-missed-pomodoro-reminders/`). The separate self-defined-schedule digest (product scope
   #6 above, driven by `reminder_preferences.schedule`/`next_send_at`) is still unbuilt.
6. Build MVP screens: dashboard, task CRUD, goal CRUD, Pomodoro timer, session notes
