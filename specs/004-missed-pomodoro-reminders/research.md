# Research: Missed Pomodoro Start Reminders

No `NEEDS CLARIFICATION` markers remain in the Technical Context — the spec's own clarification
session already resolved the two decisions that would otherwise have landed here (timezone basis,
catch-up behavior). This file instead records the technical decisions needed to implement what the
spec and `ARCHITECTURE.md` already settled, plus the alternatives considered for each.

## 1. Scheduling mechanism

**Decision**: A GitHub Actions workflow on a `schedule: cron: '*/5 * * * *'` trigger (plus
`workflow_dispatch` for manual runs during verification) calls a new Next.js Route Handler via an
authenticated HTTPS request.

**Rationale**: `ARCHITECTURE.md` already names this exact pattern ("Poll ... every ~5-10 min via a
scheduled GitHub Actions workflow hitting a Next.js API route") as the project's chosen scheduler
for this class of problem, specifically because Vercel Hobby cron can't go sub-daily and Neon has
no built-in cron. Reusing it means zero new infrastructure decisions and zero new cost.

**Alternatives considered**:
- *Vercel Cron* — rejected; Hobby tier is once/day, far too coarse for a 5-/10-minute window.
- *A long-running external worker/queue (e.g. a separate always-on process)* — rejected; no free
  tier offers an always-on compute process for this project, and it would duplicate infrastructure
  the GitHub Actions approach already covers for free.
- *Client-side only (check while the dashboard is open)* — rejected outright by the spec itself
  (FR-008): the entire point is to notify someone who *isn't* looking at the app.

## 2. Per-user "today" and threshold math across timezones

**Decision**: Store each user's IANA timezone name (e.g. `"Pacific/Auckland"`) in the existing
`reminder_preferences.timezone` column (already present, already defaults to `'UTC'`), captured
opportunistically client-side via `Intl.DateTimeFormat().resolvedOptions().timeZone` and written
through a small server action whenever the dashboard mounts. The detection query then computes
`scheduled_at AT TIME ZONE reminder_preferences.timezone` in Postgres to get each task's scheduled
moment expressed in its owner's local time, for both the "is this today" check and the
elapsed-minutes math.

**Rationale**: This project has already shipped two real bugs this session from exactly this class
of mistake (naive UTC-based date slicing on a non-UTC server). A cron job has no browser to read an
offset from, so *some* stored value is unavoidable; reusing the already-provisioned, currently-dead
`reminder_preferences.timezone` column is the smallest change that fixes it correctly, versus
adding a parallel column elsewhere. `AT TIME ZONE` with a dynamic (column-valued) zone name is
supported by Postgres directly in SQL — Drizzle has no typed helper for it, so this one expression
is written via Drizzle's `sql` template literal rather than the query builder, scoped to just that
one comparison.

**Alternatives considered**:
- *Hardcode one fixed timezone for everyone* — rejected; wrong for any user outside that zone,
  which is the exact bug class already hit twice.
- *Add a dedicated timezone picker/settings UI* — rejected for this spec's scope; the clarification
  session explicitly chose the zero-UI opportunistic-capture approach to avoid adding a settings
  screen that isn't otherwise needed (Constitution V, Simplicity/YAGNI).
- *Compute per-user in JS after fetching rows in UTC* — workable, but means looping once per
  distinct timezone (or per user) instead of one set-based SQL query; rejected as unnecessary
  complexity at this project's scale when `AT TIME ZONE` does it in one pass.

## 3. Reminder-stage dedup/state storage

**Decision**: Two new nullable `timestamp` columns directly on `tasks`: `first_reminder_sent_at`
and `second_reminder_sent_at`. A reminder stage is "already sent" exactly when its column is
non-null.

**Rationale**: The relationship is strictly 1:1 with the task (a task has at most one "first
reminder sent" fact and at most one "second reminder sent" fact, ever) — that's a plain column, not
a log. The existing `notification_log` table is an append-only event log with no uniqueness
constraint suited to "has stage N already been sent for task X" lookups without an extra
indexed-query layer on top of it; reusing it would mean building the same dedup logic this spec
needs anyway, just against a less-suited shape. Two columns on the row they describe is the
simplest correct model (Constitution V).

**Alternatives considered**:
- *Reuse `notification_log`* — rejected per above; would need a `WHERE type = ... AND task_id =
  ... ORDER BY sent_at DESC LIMIT 1`-style lookup per task per check instead of a column read,
  for no benefit at this scale.
- *A separate `task_reminders` join table keyed by `(task_id, stage)`* — workable and more
  "normalized," but adds a table and a join for a fact that's 1:1 with the task; rejected as
  unnecessary indirection for two booleans'-worth of state.

## 4. Securing the cron endpoint

**Decision**: A new required env var, `CRON_SECRET` (a long random string), checked against an
`Authorization: Bearer <secret>` header on every request to the route. Requests without a matching
header are rejected with 401 before any query runs. The GitHub Actions workflow reads the same
value from a repository secret and sends it on every scheduled call.

**Rationale**: This route has no end-user session to check (Constitution Principle III's normal
mechanism doesn't apply — there's no signed-in caller), so it needs its own machine-to-machine
guard instead, or it would be an open endpoint capable of sending arbitrary-looking emails to every
user on demand. A single shared secret is the standard, simplest adequate protection for a
scheduled-job endpoint with exactly one legitimate caller.

**Alternatives considered**:
- *No protection (rely on the URL being unguessable)* — rejected; the route path is visible in this
  very repo's source and workflow file, not actually secret.
- *Signed JWT/HMAC request signing* — rejected as unnecessary cryptographic complexity for a
  single, known, trusted caller; a bearer secret is the project's existing security posture at this
  scale (cf. the `AUTH_SECRET`/App Password pattern already used elsewhere).

## 5. Catch-up/idempotency within one detection pass

**Decision**: The route's single pass (a) sends first reminders for every newly-eligible task and
marks `first_reminder_sent_at`, then (b) — in that same invocation, over the now-updated state —
sends second reminders for every task whose 10-minute threshold has passed and whose first
reminder is marked sent (including ones just marked sent in step (a)), marking
`second_reminder_sent_at`.

**Rationale**: This directly implements the spec's clarified FR-014 (send both, back-to-back, the
first time a task is seen past both thresholds) without any special-casing: step (b) runs after
step (a) unconditionally, so a task that crossed both thresholds between polls naturally gets both
emails in one pass, while a task that only crossed the first threshold gets just the first (step
(b) finds nothing new for it yet).

**Alternatives considered**:
- *Two independent cron schedules (one for each threshold)* — rejected; doubles the workflow
  surface for no behavioral benefit, and makes the "both back-to-back when both are due" rule
  harder to express than "run (b) after (a) in the same pass."

## 6. Email delivery

**Decision**: Reuse `src/lib/mailer.ts`'s existing `sendMail({ to, subject, text })` unchanged — no
new mailer, template engine, or dependency. Subject/body are plain text identifying the task title
and its scheduled time, matching the project's existing OTP email's plain-text style.

**Rationale**: FR-010 explicitly requires reusing the existing delivery mechanism; the OTP email
already proves this mailer works for arbitrary recipients since the Gmail SMTP migration.

**Alternatives considered**: None seriously considered — introducing a new channel or templating
library would violate FR-010 and Constitution V for no stated benefit.
