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

- **User** — id, email (kept in sync with current auth identity), timezone
- **ReminderPreference** — user_id, schedule definition (specific times / frequency / days),
  enabled flag, `next_send_at` (computed)
- **Goal** — id, user_id, title, target_date, category, progress rollup
- **Task** — id, user_id, goal_id (nullable), title, description, status, priority,
  scheduled_at/due_at, tag (Application / Interview Prep / Networking / Skill-building),
  estimated_pomodoros
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
| DB/Auth | Supabase (Postgres + Auth + RLS) | Free managed Postgres, OAuth/email auth, RLS for per-user isolation, auth identity drives `User.email` |
| Email | Resend + React Email | Free tier: 3,000 emails/mo, 100/day. Needs a verified domain to send to arbitrary recipients (sending to self works without one) |
| Scheduler | Supabase `pg_cron` → Edge Function, polling every 5 min for due `ReminderPreference` rows, sends via Resend, recomputes `next_send_at` | Vercel's free Hobby cron only fires once/day — not enough for per-user custom schedules. `pg_cron`/Edge Functions are free and live next to the data |
| Data fetching | TanStack Query + Supabase client | Caching/sync for dashboard, tasks, sessions |
| Hosting | Vercel (Hobby/free) | Free Next.js hosting |
| Mobile (phase 2) | Expo, same Supabase backend | Deferred; backend is already decoupled from the web frontend so no rework needed |

### Free-tier constraints to keep in mind

- Supabase free projects pause after ~1 week of inactivity (auto-resume on request, but first
  request after pause is slow).
- Resend free tier needs a verified domain for sending to real users; without one, only your own
  verified address can receive mail.
- Vercel Hobby cron is once/day — do **not** use it for the reminder poller (see above).
- Supabase free tier: 500MB DB, 50k monthly active users, 500K Edge Function invocations — all
  far beyond MVP needs.

## Next steps

1. Scaffold Next.js + TypeScript project
2. Set up Supabase project (Auth providers, schema/migrations for the tables above, RLS policies)
3. Set up Resend account + domain verification
4. Build reminder scheduler (Edge Function + `pg_cron` job)
5. Build MVP screens: auth, dashboard, task CRUD, goal CRUD, Pomodoro timer, session notes
