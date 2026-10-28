# Quickstart: Missed Pomodoro Start Reminders

Manual validation guide (no automated suite in this project — see plan.md's Testing section).
Run against a local dev server with a Neon connection and Gmail SMTP configured (`npm run dev`),
using a disposable test account/task per scenario, cleaned up afterward (this project's established
practice this session). The cron route can be called directly with `curl` — no need to actually
wait for GitHub Actions during local verification.

## Prerequisites

- Migration applied (`tasks.first_reminder_sent_at` / `tasks.second_reminder_sent_at`, both
  nullable, defaulting to `NULL` for existing rows).
- `.env.local` has `CRON_SECRET` set to some test value.
- A seeded task, scheduled at a time already 5+ (or 10+) minutes in the past, owned by a test
  account — seed directly via a `tsx` script against `tasks`, matching how test data was seeded for
  features 002/003.

## 1. First reminder fires once (User Story 1)

1. Seed a task for the test account, `scheduled_at` = now − 6 minutes, `status != 'done'`, no
   `pomodoro_sessions` row for it.
2. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/missed-task-reminders`.
3. **Expect**: response shows `firstRemindersSent: 1`; the task's `first_reminder_sent_at` is now
   set; the test account's inbox has exactly one new email naming the task and its scheduled time.
4. Call the same `curl` command again immediately. **Expect**: `firstRemindersSent: 0` — no
   duplicate email (FR-002).

## 2. Second reminder fires once, after the first (User Story 2)

1. Using the task from §1 (first reminder already sent), update its `scheduled_at` back further so
   it's now 11+ minutes in the past (or just wait, if running this live).
2. Run the `curl` call again. **Expect**: `secondRemindersSent: 1`; `second_reminder_sent_at` is now
   set; exactly one more email arrives (two total so far for this task).
3. Run the `curl` call a third time. **Expect**: both counts are `0` — no third email ever (FR-004).

## 3. Starting the task silences further reminders (User Story 3)

1. Seed a fresh task, `scheduled_at` = now − 6 minutes, no session yet.
2. Run the `curl` call once. **Expect**: first reminder sent (one email).
3. Start a Pomodoro session for that task (via the normal "Let's start" flow, or by inserting a
   `pomodoro_sessions` row referencing it directly).
4. Advance/seed `scheduled_at` to 11+ minutes in the past and run the `curl` call again. **Expect**:
   `secondRemindersSent: 0` for this task — no second email, because a session now exists (FR-005).

## 4. Catch-up: both reminders in one pass (Clarification 2026-10-26)

1. Seed a task with `scheduled_at` = now − 15 minutes (already past both thresholds), no session,
   never checked before (both `*_sent_at` columns `NULL`).
2. Run the `curl` call once. **Expect**: a single response with `firstRemindersSent: 1` **and**
   `secondRemindersSent: 1` in the same call, both columns now set, and two emails having arrived
   (first then second) — not zero, not just one (FR-014).

## 5. Exclusions (SC-005)

Seed one task for each case below, run the `curl` call, and confirm **no** email results and
**neither** `*_sent_at` column is set for it:
- A task with no `scheduled_at` at all.
- A task already marked `status = 'done'` before its scheduled time + 5 minutes arrived.
- A task whose `scheduled_at` falls on a day other than "today" in its owner's stored timezone.

## 6. Per-user timezone sync

1. Sign in as a test account whose `reminder_preferences` row doesn't exist yet (or has `timezone`
   still at the `'UTC'` default).
2. Load `/dashboard` in a browser (not curl — this needs `Intl` in a real browser context).
3. **Expect**: `reminder_preferences.timezone` for that user now reflects the browser's actual IANA
   zone (check via a `tsx` script), not `'UTC'`, confirming `syncUserTimezone` ran on mount.
4. Reload the dashboard again. **Expect**: no error, and the stored value is unchanged (the
   no-op-when-unchanged path).

## 7. Cross-user isolation (SC-004)

1. Seed one missed task for Test Account A and one for Test Account B, both eligible for a first
   reminder.
2. Run the `curl` call once. **Expect**: exactly two emails total, each sent to its own task's
   owner's address — never A's task referenced in an email to B, or vice versa.

## 8. Regression check

- `npm run build` and `npm run lint` both pass.
- Existing dashboard/Plan Your Day/Pomodoro flows (features 002/003) are unaffected — in
  particular, `startPomodoroForTask` and task completion still behave exactly as before; this
  feature only *reads* their resulting state.
