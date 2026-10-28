# Contracts: Missed Task Reminders

Two interfaces: one external (GitHub Actions → the app), one internal (dashboard → server action).
Unlike every other action in this project, the route below is **not** session-authenticated —
there is no signed-in caller — so it uses a shared secret instead of `auth()` (see plan.md's
Constitution Check §III).

## `POST /api/cron/missed-task-reminders` (new Route Handler)

**Caller**: the `missed-task-reminders.yml` GitHub Actions workflow, on a 5-minute schedule, and
manually via `curl` during verification. Never called by the browser/client.

**Request**:
```
POST /api/cron/missed-task-reminders
Authorization: Bearer <CRON_SECRET>
```
No request body required.

**Responses**:
```ts
// 401 — missing/incorrect Authorization header. No query runs.
// 200 — ran (including the common case where zero reminders were due):
type CronResult = {
  ok: true;
  checkedAt: string; // ISO instant the pass ran
  firstRemindersSent: number;
  secondRemindersSent: number;
};
```

**Behavior** (delegates entirely to `src/lib/dashboard/missed-task-reminders.ts`'s
`runMissedTaskReminderCheck()`, so the route itself is a thin auth-check + call + JSON wrapper):

1. Reject with 401 if the `Authorization` header doesn't match `CRON_SECRET` exactly.
2. Run the first-reminder pass (FR-001/FR-002): for every task across all users where
   `status != 'done'`, `scheduled_at` is non-null, falls on "today" in that task's owner's stored
   `reminder_preferences.timezone` (default `'UTC'`), `scheduled_at` is ≥5 minutes in that owner's
   local past, no `pomodoro_sessions` row references it, and `first_reminder_sent_at IS NULL` —
   send the first-reminder email and set `first_reminder_sent_at = now()`.
3. Run the second-reminder pass (FR-003/FR-004) **after** step 2 completes, over the now-updated
   data: same eligibility but `scheduled_at` ≥10 minutes in the owner's local past,
   `first_reminder_sent_at IS NOT NULL`, `second_reminder_sent_at IS NULL` — send the
   second-reminder email and set `second_reminder_sent_at = now()`. Running this after step 2 (not
   in parallel) is what makes FR-014's catch-up case work without special-casing: a task that just
   got its first reminder in step 2 is immediately visible to step 3 if it's also ≥10 minutes late.
4. Return the counts. A per-task send failure (mailer error) is logged and skipped (that task's
   `*_sent_at` column is left `NULL` so the next pass retries it — Assumptions, "best-effort");
   it does not fail the whole request.

**Idempotency**: safe to call twice in quick succession (e.g. a manual verification run right after
a scheduled one) — the second call simply finds nothing newly eligible and returns zero counts,
because eligibility always re-checks the `*_sent_at` columns against the current DB state.

## `syncUserTimezone` (new server action, `src/app/dashboard/actions.ts`)

**Caller**: `<TimezoneSync />`, a tiny client component mounted once in the dashboard layout, on
mount (every dashboard page load). This one *is* session-authenticated, like every other action in
this project.

```ts
type SyncUserTimezoneInput = { timezone: string }; // IANA zone name, e.g. "Pacific/Auckland"

type SyncUserTimezoneResult = { ok: true };
```

- Derives `userId` from `auth()` as usual (Constitution III) — the caller never supplies it.
- Upserts the caller's `reminder_preferences` row: inserts one (with this `timezone`) if none
  exists yet, otherwise updates `timezone` only when the detected value differs from what's already
  stored (avoids a write on every page load once it's settled).
- Validates `timezone` is a non-empty string recognized by `Intl.supportedValuesOf("timeZone")`
  server-side before writing it; silently no-ops (still returns `{ ok: true }`) on an invalid value
  rather than erroring the dashboard over a cosmetic detail — this sync is best-effort by nature,
  consistent with Assumptions' "falls back to UTC until first detected."
