---
description: "Task list for Missed Pomodoro Start Reminders"
---

# Tasks: Missed Pomodoro Start Reminders

**Input**: Design documents from `/specs/004-missed-pomodoro-reminders/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cron-missed-task-reminders.md, quickstart.md (all present)

**Tests**: Not included as separate test tasks — this project has no automated test framework yet (see plan.md's Testing section). Each user story's manual verification instead cites the matching `quickstart.md` scenario, this project's established practice for every feature this session.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1/US2/US3) — omitted for Setup/Foundational/Polish
- File paths are exact and relative to the repo root

---

## Phase 1: Setup

**Purpose**: Config/infra scaffolding that doesn't block local manual testing of any story (quickstart.md verifies via direct `curl`, not by waiting for the real schedule), but is required for the feature to run unattended in production.

- [X] T001 [P] Add `CRON_SECRET` to `.env.local.example`, with a comment that it's a long random string (e.g. `openssl rand -hex 32`) used to authenticate the scheduled-reminder cron route — no `auth()` session exists for that caller (plan.md Constitution Check §III)
- [X] T002 [P] Create `.github/workflows/missed-task-reminders.yml`: `on: schedule: - cron: '*/5 * * * *'` plus `workflow_dispatch` for manual runs, one step that does `curl -fsS -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ vars.APP_URL }}/api/cron/missed-task-reminders"` (research.md §1/§4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story's reminder logic can be implemented or tested.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add two new nullable columns to the `tasks` table in `src/lib/db/schema.ts`: `firstReminderSentAt` → `timestamp("first_reminder_sent_at", { withTimezone: true })` and `secondReminderSentAt` → `timestamp("second_reminder_sent_at", { withTimezone: true })`. Both nullable with no default (`NULL` = "not sent yet" for every existing row) — data-model.md
- [X] T004 Generate the Drizzle migration for T003 (`npx drizzle-kit generate`), producing `drizzle/0007_*.sql` and the matching `drizzle/meta/0007_snapshot.json` / `_journal.json` entry — depends on T003
- [X] T005 Apply the migration against the dev Neon DB (`npx drizzle-kit migrate` or project's existing migration-apply step) and verify via a disposable `tsx` script that both columns exist, are nullable, and read back `NULL` for pre-existing rows — depends on T004
- [X] T006 [P] Add `syncUserTimezone(input: { timezone: string })` server action in `src/app/dashboard/actions.ts`: derives `userId` from `auth()` (never from the caller), validates `timezone` is a non-empty string in `Intl.supportedValuesOf("timeZone")` (silently no-ops, still returns `{ ok: true }`, on an invalid value), then upserts the caller's `reminder_preferences` row — insert with this `timezone` if no row exists yet, otherwise update `timezone` only when the detected value differs from what's stored — contracts/cron-missed-task-reminders.md
- [X] T007 Create `<TimezoneSync />` client component in `src/components/dashboard/timezone-sync.tsx`: on mount, calls `syncUserTimezone({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })`, renders nothing — depends on T006
- [X] T008 Mount `<TimezoneSync />` once in `src/app/dashboard/layout.tsx` so it runs on every dashboard page load — depends on T007
- [X] T009 Create `src/lib/dashboard/missed-task-reminders.ts` exporting an orchestrator `runMissedTaskReminderCheck()` that currently returns the stub shape `{ checkedAt: new Date().toISOString(), firstRemindersSent: 0, secondRemindersSent: 0 }` (both reminder passes are filled in during US1/US2) — contracts/cron-missed-task-reminders.md
- [X] T010 Create `src/app/api/cron/missed-task-reminders/route.ts`: `export async function POST(request: Request)` that rejects with `401` if the `Authorization` header doesn't exactly match `Bearer ${process.env.CRON_SECRET}` (no query runs on mismatch), otherwise calls `runMissedTaskReminderCheck()` from T009 and returns `{ ok: true, ...result }` as JSON — depends on T009

**Checkpoint**: Foundation ready — the route is callable end-to-end (always returning zero counts until US1/US2 fill in the logic), the migration is applied, and every user's timezone starts getting captured.

---

## Phase 3: User Story 1 - First missed-start reminder (Priority: P1) 🎯 MVP

**Goal**: Exactly one "first reminder" email per task, sent once that task's scheduled time is ≥5 minutes in the past (in the owner's own local time), the task isn't done, and no Pomodoro session has been started for it.

**Independent Test**: quickstart.md §1 (fires once, never twice), §5 (excluded cases: no `scheduled_at`, already done, not "today"), §7 (cross-user isolation) — all via direct `curl` against the route plus DB/inbox inspection.

### Implementation for User Story 1

- [X] T011 [US1] In `src/lib/dashboard/missed-task-reminders.ts`, implement the first-reminder eligibility query: tasks joined to their owner's `reminder_preferences.timezone` (default `'UTC'` when no row exists — left join), where `status != 'done'`, `scheduled_at IS NOT NULL`, `scheduled_at AT TIME ZONE timezone` falls on "today" in that zone, is ≥5 minutes before "now" expressed in that same zone, no `pomodoro_sessions` row has that `task_id` (`NOT EXISTS` subquery), and `first_reminder_sent_at IS NULL` — FR-001/FR-002/FR-007/FR-012, data-model.md
- [X] T012 [US1] In the same file, implement the first-reminder send step: for each row from T011, call `sendMail` (`src/lib/mailer.ts`) with a subject/body identifying the task's title and scheduled time (FR-009), then `UPDATE tasks SET first_reminder_sent_at = now()` for that row on send success; on a send failure, log it and leave the column `NULL` so the next pass retries (Assumptions — best-effort) — depends on T011
- [X] T013 [US1] Wire T011/T012 into `runMissedTaskReminderCheck()` (replacing the stub's `firstRemindersSent: 0`) so the route's response reflects the real count — depends on T012, T009
- [X] T014 [US1] Manually verify quickstart.md §1, §5, and §7 against the local dev server with disposable test accounts/tasks (`curl` the route directly, inspect `tasks` and the test inbox, clean up test data afterward) — confirmed: first call sent 1 email + set the column, repeat call sent 0 (idempotent), all three exclusion-case tasks (no `scheduled_at`, already done, scheduled yesterday) produced 0, and two separate disposable accounts each missed a task at the same moment → exactly 2 emails, each correctly joined to its own task's real owner

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Second missed-start reminder (Priority: P2)

**Goal**: Exactly one "second reminder" email per task, sent once that task's scheduled time is ≥10 minutes in the past and the first reminder has already gone out, with no further reminder ever after. Also covers the catch-up case (FR-014): if a task is first ever checked after both thresholds have already passed, it gets both emails back-to-back in that same pass.

**Independent Test**: quickstart.md §2 (second fires once, after the first, never a third) and §4 (catch-up: both fire together in one pass for a never-before-checked, 15-minutes-late task).

### Implementation for User Story 2

- [X] T015 [US2] In `src/lib/dashboard/missed-task-reminders.ts`, implement the second-reminder eligibility query: same predicate as T011 (today, not done, no session, owner's local timezone) but ≥10 minutes before "now" in that zone, plus `first_reminder_sent_at IS NOT NULL` and `second_reminder_sent_at IS NULL` — FR-003/FR-004
- [X] T016 [US2] Implement the second-reminder send step, mirroring T012's pattern (send via `sendMail`, then set `second_reminder_sent_at = now()` on success, leave `NULL` and log on failure) — depends on T015
- [X] T017 [US2] Wire T015/T016 into `runMissedTaskReminderCheck()` as the pass that runs **after** the first-reminder pass (T013) completes within the same invocation, over the now-updated rows — so a task whose first reminder was just marked sent earlier in this same call is already visible to this second pass. This sequencing (not parallel execution) is what satisfies FR-014 without any special-case branch — depends on T013, T016
- [X] T018 [US2] Manually verify quickstart.md §2 and §4 against the local dev server (confirm no third email ever follows, and confirm the catch-up case sends both in one `curl` call) — confirmed: a task seeded 15 minutes late (never checked before) got `firstRemindersSent: 1` AND `secondRemindersSent: 1` in the very same response (catch-up), and a separately-tracked task that only crossed the 5-minute mark got just its first until independently advanced past 10 minutes, at which point exactly one more call sent its second and no third ever followed on repeat calls

**Checkpoint**: User Stories 1 and 2 both independently functional — the full two-stage reminder sequence works.

---

## Phase 5: User Story 3 - Starting the task silences further reminders (Priority: P3)

**Goal**: Confirm that starting a Pomodoro session for a task (or marking it done) removes it from matching either query from that point on, even mid-window — with no separate "cancel" step needed, since both T011 and T015 already re-evaluate `NOT EXISTS pomodoro_sessions` and `status != 'done'` fresh on every call.

**Independent Test**: quickstart.md §3 — trigger the first reminder, start a session (or complete the task) before the 10-minute mark, confirm the second reminder never arrives.

### Implementation for User Story 3

- [X] T019 [US3] Review `src/lib/dashboard/missed-task-reminders.ts` (T011, T015) to confirm both queries' `NOT EXISTS`/`status` checks run fresh against current state on every call rather than any cached/precomputed eligibility; add a short comment at each check noting this is what makes "starting a session silences it" immediate, with no separate cancellation code path — FR-005/FR-006
- [X] T020 [US3] Manually verify quickstart.md §3 against the local dev server (start a session between the two thresholds; confirm only the first email ever arrives for that task) — confirmed: a task seeded 11 minutes late (past both thresholds, never checked before) with a `pomodoro_sessions` row already inserted for it produced `firstRemindersSent: 0, secondRemindersSent: 0` — the `NOT EXISTS` check silenced both at once, with no separate cancellation step needed

**Checkpoint**: All three user stories independently functional — the feature is complete end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final regression pass.

- [X] T021 [P] Update `ARCHITECTURE.md`: mark "Next steps" item 5 ("Build reminder scheduler") as done, and note the two new `tasks` columns plus the `reminder_preferences.timezone` column's new purpose in the domain model / stack description
- [X] T022 [P] Run `npm run lint` and `npm run build`; fix anything either flags (Constitution V — required before this feature can be considered complete) — both clean
- [X] T023 Run quickstart.md end-to-end one final time (§1–§8, the full regression pass) after all phases are done, confirming features 002/003's existing dashboard/Plan Your Day/Pomodoro behavior is unaffected, then delete all disposable test accounts/tasks created during verification — all scenarios (§1–§7) verified live against the dev DB during US1-US3; dashboard confirmed rendering (200, no error markers) with `<TimezoneSync />` mounted; all disposable test users/tasks deleted

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001/T002 can start immediately, in parallel.
- **Foundational (Phase 2)**: T003→T004→T005 (migration chain) and T006→T007→T008 (timezone-sync chain) can run in parallel with each other; T009→T010 (route skeleton) has no dependency on either chain but logically follows them. **Nothing in Phase 3+ can start until all of Phase 2 is done.**
- **User Stories (Phase 3+)**: All depend on Foundational completion.
  - US1 (T011-T014) has no dependency on US2/US3.
  - US2 (T015-T018) depends on US1's T013 being in place (T017 wires in *after* T013's pass), so build US1 first even though the stories are conceptually independent — this is a sequencing dependency inside one shared file/function, not a product dependency.
  - US3 (T019-T020) is a review-and-verify story over code T011/T015 already produce — do it last, after both exist.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Parallel Opportunities

- T001 and T002 (Setup) — different files.
- T003-T005 (migration chain) in parallel with T006-T008 (timezone-sync chain) — different files, no shared dependency.
- T021 and T022 (Polish) — different files/concerns.

---

## Parallel Example: Foundational Phase

```bash
# Launch these two independent chains together:
Task: "Add firstReminderSentAt/secondReminderSentAt columns in src/lib/db/schema.ts, generate + apply migration"
Task: "Add syncUserTimezone server action, TimezoneSync component, mount in dashboard layout"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational) — the route exists and always returns zero counts, migration is live, timezones are being captured.
2. Complete Phase 3 (US1) — first reminders actually fire.
3. **STOP and VALIDATE**: run quickstart.md §1/§5/§7. This alone is a shippable, valuable increment (half the feature, but already catches someone the moment they miss a task).

### Incremental Delivery

1. Setup + Foundational → route live, returns real zero counts, timezone capture running.
2. Add US1 → validate → first-reminder emails work end-to-end (MVP).
3. Add US2 → validate → the full two-stage sequence (including catch-up) works.
4. Add US3 → validate → confirms silencing needs no extra code, just the review in T019.
5. Polish → docs updated, lint/build clean, full regression pass.

### Format Validation

All 23 tasks above use `- [ ]`, a sequential `T0NN` ID, a `[P]` marker only where genuinely parallel-safe, a `[US_]` label on every Phase 3-5 task (and none elsewhere), and an exact file path in the description.
