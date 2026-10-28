# Implementation Plan: Missed Pomodoro Start Reminders

**Branch**: `004-missed-pomodoro-reminders` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-missed-pomodoro-reminders/spec.md`

## Summary

When a planned task's scheduled time passes with no Pomodoro session started for it, email the
task's owner — once at the 5-minute mark, once more at the 10-minute mark if still unstarted, then
never again for that task. Starting a session or completing the task silences it permanently.
Detection must run independently of whether the user has the app open, so it's driven by a
scheduled GitHub Actions workflow (the project's established free-tier scheduler pattern) calling a
new, secret-protected Next.js API route every ~5 minutes. That route finds all eligible tasks
across all users in one pass, using each user's own locally-detected timezone (opportunistically
captured and stored on dashboard load) to decide "today" and the 5-/10-minute thresholds, and
sends due reminders through the existing Gmail SMTP mailer.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16 (App Router, Route Handlers), Node.js runtime (Vercel serverless)

**Primary Dependencies**: Drizzle ORM 0.45 (existing), Nodemailer 10 via the existing `src/lib/mailer.ts` (existing), GitHub Actions `schedule` trigger (existing free-tier convention per `ARCHITECTURE.md`) — no new npm package required

**Storage**: Neon Postgres via Drizzle. Adds two nullable `timestamp` columns to the existing `tasks` table (`first_reminder_sent_at`, `second_reminder_sent_at`); reuses the existing-but-currently-unused `reminder_preferences.timezone` column (already defaults to `'UTC'`) rather than adding a new column anywhere

**Testing**: No automated test framework exists in this repo yet; this project's established verification practice (used for every feature this session) is `npm run lint` + `npm run build` as the hard gate (Constitution Principle V), plus direct `npx tsx` scripts and `curl` against the real dev DB/dev server for functional verification of the new route and detection logic, using disposable test data cleaned up afterward

**Target Platform**: Vercel-hosted Next.js app (serverless Node runtime) triggered by a GitHub Actions scheduled workflow running in GitHub's own runners

**Project Type**: Web application — single existing Next.js codebase (no frontend/backend split; this feature adds one API route, one DB migration, one small client-side effect, and one GitHub Actions workflow file to it)

**Performance Goals**: Not latency-sensitive (no user is waiting on a response). The detection pass must comfortably finish well within the ~5-minute poll interval at this project's realistic scale (a handful of users, tens of tasks/day each) — no specific millisecond target needed

**Constraints**: Gmail SMTP's ~500 emails/day cap (existing, documented, nowhere near reachable at this scale); Vercel Hobby cron can't do sub-daily schedules (why GitHub Actions is used instead, per existing `ARCHITECTURE.md` decision); GitHub Actions' scheduled-workflow cron has a 5-minute minimum granularity and no guaranteed exact-time firing (runs can be delayed under GitHub-wide load) — this is precisely why the spec's catch-up behavior (FR-014) exists, rather than assuming punctual ticks

**Scale/Scope**: Solo-maintained, free-tier project with a small number of users; this feature touches one existing table (two new columns), one existing-but-unused table's one column, one new route, one new workflow file, and small additions to three existing dashboard files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Free-Tier-First**: PASS. No new paid service or tier. Uses GitHub Actions (free scheduled
  workflows, already the documented mechanism for this exact kind of polling) and the existing
  Gmail SMTP mailer. Stays far under Gmail's documented ~500/day cap at this project's scale.
- **II. Web-First MVP Scope**: PASS. "Email reminders" is explicitly named as in-scope MVP
  functionality in Principle II itself; this is that feature, not scope creep.
- **III. Explicit Per-User Authorization**: PASS, with one documented nuance. The new API route is
  *not* a per-user session route — it's machine-to-machine (GitHub Actions → Next.js), so there is
  no `auth()` session to check. It is instead protected by a server-only shared secret
  (`CRON_SECRET`), and — critically — every task/email it touches is scoped by that task's own
  stored `userId` column, never by any caller-supplied identifier (GitHub Actions sends no user
  identity at all; the route iterates what the database already says each task belongs to). This
  satisfies the principle's actual intent (never trust a client-supplied id for authorization)
  without being a session-authenticated route, which this kind of scheduled job structurally
  cannot be.
- **IV. Progressive Passwordless-to-Password Auth**: N/A — untouched by this feature.
- **V. Simplicity/YAGNI**: PASS. Reuses the existing `reminder_preferences.timezone` column instead
  of inventing new user-profile storage; adds two plain nullable columns to `tasks` instead of a new
  log table (a 1:1 "has this task's stage N been sent" fact belongs on the task, not in an
  append-only log); introduces exactly one new route and one new workflow file, matching the
  minimum needed to satisfy the spec.

No violations. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-missed-pomodoro-reminders/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── cron-missed-task-reminders.md   # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── missed-task-reminders.yml       # NEW — scheduled trigger, every 5 minutes

src/
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── missed-task-reminders/
│   │           └── route.ts            # NEW — the detection + send endpoint (POST, secret-checked)
│   └── dashboard/
│       └── actions.ts                  # MODIFIED — add syncUserTimezone server action
├── components/
│   └── dashboard/
│       └── timezone-sync.tsx           # NEW — tiny client component, mounted once in dashboard layout
├── lib/
│   ├── db/
│   │   └── schema.ts                   # MODIFIED — add firstReminderSentAt/secondReminderSentAt to tasks
│   └── dashboard/
│       └── missed-task-reminders.ts    # NEW — the detection query + send logic the route calls
└── app/dashboard/layout.tsx             # MODIFIED — mount <TimezoneSync />

drizzle/
└── 0007_*.sql                          # NEW — generated migration for the two new columns
```

**Structure Decision**: This is an existing single Next.js application (App Router), not a
frontend/backend split — the plan adds to that existing structure rather than introducing a new
project layout. The detection/send logic lives in a plain `src/lib/dashboard/` module (matching
where `queries.ts`/`actions.ts` already live for this feature area) so it can be unit-verified with
a direct `tsx` script independently of the HTTP route wrapper, which stays a thin adapter that
checks the shared secret and calls that module.

## Complexity Tracking

*No violations — table intentionally omitted.*
