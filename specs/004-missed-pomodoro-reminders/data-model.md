# Data Model: Missed Pomodoro Start Reminders

## Modified entity: Task (`tasks` table)

Two new nullable columns, additive only — no existing column changes, no backfill required (both
default to `NULL`, meaning "not sent yet" for every existing row).

| Column | Type | Nullable | Meaning |
|---|---|---|---|
| `first_reminder_sent_at` | `timestamp with time zone` | yes (default `NULL`) | Set the moment the 5-minute reminder email is sent for this task. `NULL` = not yet sent. Never cleared once set (FR-002: "MUST NOT send a second first-reminder email"). |
| `second_reminder_sent_at` | `timestamp with time zone` | yes (default `NULL`) | Set the moment the 10-minute reminder email is sent for this task. `NULL` = not yet sent. Never cleared once set (FR-004). |

**Validation / invariants**:
- `second_reminder_sent_at` is only ever set on a row where `first_reminder_sent_at` is already
  non-null (FR-003: the second reminder's eligibility condition requires the first to already be
  sent) — enforced in the detection query's `WHERE`, not a DB constraint (keeping the migration a
  pure additive, constraint-free change per Constitution V).
- Both columns are unaffected by editing `scheduled_at`/`scheduled_end_at` (Assumptions: editing
  the time after a reminder was sent does not retract it) — no trigger, no cascade.
- Both columns are left untouched by task deletion (the row itself is gone; nothing to reconcile).

**Read-only dependency**: the detection query also reads `tasks.status` (to exclude completed
tasks, FR-006), `tasks.scheduled_at` (the threshold anchor), and `tasks.user_id` (to resolve the
owner's email + timezone) — none of these change shape.

## Reused entity: ReminderPreference (`reminder_preferences` table)

No schema change. The existing `timezone` column (`text`, `default 'UTC'`, one row per user, keyed
by `user_id`) becomes load-bearing for this feature: it's read by the detection query to interpret
every one of that user's tasks' scheduled times, and written by the new opportunistic client-side
sync described below.

**New write path**: a `syncUserTimezone(timezone: string)` server action, called once per dashboard
load, upserts the current user's `reminder_preferences` row:
- If no row exists yet for the user: insert one with the detected `timezone` and default `enabled`.
- If a row exists: update `timezone` only if the detected value differs from what's stored (avoids
  a write on every single page load for the common case where it hasn't changed).

**Read-only dependency, unchanged by this feature**: `reminder_preferences.enabled`,
`reminder_preferences.schedule`, `reminder_preferences.next_send_at` belong to the separate,
not-yet-built "self-defined reminder schedule" feature (`ARCHITECTURE.md` product scope #6) and are
untouched here.

## Read-only dependency: PomodoroSession (`pomodoro_sessions` table)

No schema change. The detection query needs only existence: "does at least one row with this
`task_id` exist?" — a `NOT EXISTS` / `EXISTS` subquery, regardless of that session's own `kind`,
`paused_at`, or completion state (Assumptions: starting a session silences future reminders
regardless of whether it's later paused, completed, or abandoned).

## Conceptual state machine (not a stored enum — derived from the two timestamp columns + session existence)

```
                 task's scheduled time arrives
                           │
                           ▼
                  ┌─────────────────┐
                  │   Not yet due    │  (scheduled_at is in the future, or no scheduled_at)
                  └────────┬────────┘
                           │ scheduled_at + 5min ≤ now (user-local)
                           ▼
         ┌───────────────────────────────────┐
         │  Missed, no reminder sent yet       │──── Pomodoro session started OR task completed ────► Silenced (terminal)
         └────────────────┬────────────────────┘
                           │ send first reminder → first_reminder_sent_at = now
                           ▼
         ┌───────────────────────────────────┐
         │  First reminder sent                │──── Pomodoro session started OR task completed ────► Silenced (terminal)
         └────────────────┬────────────────────┘
                           │ scheduled_at + 10min ≤ now (user-local)
                           ▼
         ┌───────────────────────────────────┐
         │  send second reminder → second_reminder_sent_at = now │
         └────────────────┬────────────────────┘
                           ▼
                     Silenced (terminal) — no further reminders, ever (FR-004)
```

"Silenced" is never a stored state — it's simply the absence of any further query match, because
every eligibility query also checks "no Pomodoro session exists" and "not completed." Once either
becomes true, the task stops matching either reminder's `WHERE` clause permanently (a task can be
un-completed by the existing product, but there is no path to delete an already-started Pomodoro
session, so that half of silencing is itself permanent).
