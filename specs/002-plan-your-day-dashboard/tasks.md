---
description: "Task list for Plan-Your-Day Dashboard"
---

# Tasks: Plan-Your-Day Dashboard

**Input**: Design documents from `/specs/002-plan-your-day-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Not included — no automated test suite is configured in this project (see plan.md
Technical Context) and the spec does not request one. `npm run build` and `npm run lint` remain the
mandatory gates (Polish phase).

**Organization**: Tasks are grouped by user story (US1/US2/US3 map to spec.md's three user stories)
so each can be implemented and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to
- File paths are exact and relative to the repo root

---

## Phase 1: Setup

- [X] T001 [P] Define the `TaskCategory` type and `TASK_CATEGORIES` constant (id, label, display
      order for `other`, `study`, `job_application`, `work`) in
      `src/lib/dashboard/categories.ts` — single source of truth reused by the schema, server
      actions, and every UI piece that lists or validates categories.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story task may start until this phase is complete — every story reads or
writes through the schema and query/action modules built here.

- [X] T002 In `src/lib/db/schema.ts`, replace the `taskTag` pgEnum (`application`,
      `interview_prep`, `networking`, `skill_building`) with a new `taskCategory` pgEnum
      (`other`, `study`, `job_application`, `work`), and rename the `tasks.tag` column to
      `tasks.category`, typed `taskCategory("category").notNull().default("other")` (per
      data-model.md — no longer nullable, since the Plan-your-day form always collects one).
- [X] T003 In `src/lib/db/schema.ts`, add `enabledTaskCategories` to the `users` table as a
      Postgres text array column, `NOT NULL`, defaulting to `{other,study,job_application,work}`
      (per data-model.md — every existing/new user starts with all four categories enabled).
- [X] T004 Run `npx drizzle-kit generate` to produce the migration for T002/T003; review the
      generated SQL in `drizzle/` for a correct enum rename/recreate, column rename, and default
      backfill for any existing rows.
- [X] T005 Apply the generated migration to the dev Neon database and confirm existing `users`
      rows were backfilled with `enabled_task_categories = {other,study,job_application,work}`.
- [X] T006 [P] Implement `getEnabledTaskCategories(userId)` in `src/lib/dashboard/queries.ts` —
      returns the caller's `enabledTaskCategories` array (contracts/server-actions.md "Read
      paths").
- [X] T007 [P] Implement `getTodayLetsStartTask(userId)` in `src/lib/dashboard/queries.ts` —
      queries today's tasks for the user where `status != 'done'` AND `scheduledAt >= now()`
      (overdue incomplete tasks are excluded entirely, not just deprioritized — FR-004), and
      returns the one with the earliest `scheduledAt` (FR-012); never falls back to another day
      even if today has no qualifying rows (Clarification: strictly today-scoped). Returns `null`
      when there is no incomplete task left today at or after the current time.
- [X] T008 Implement `getDashboardAnalytics(userId)` in `src/lib/dashboard/queries.ts` — computes
      the `DashboardAnalytics` shape from data-model.md for the Monday–Sunday week and calendar
      month containing today: per category, completed count (`status = 'done'`) vs. planned count,
      and summed focused minutes from `pomodoro_sessions` (`ended_at - started_at`, only rows where
      `ended_at IS NOT NULL`). Include a category in `byCategory` if it's in
      `getEnabledTaskCategories` OR it already has ≥1 task in this window — a disabled category
      with historical data in the window must still show (FR-002b), it just won't gain new tasks.
      `hasAnyTaskData` is true iff at least one task row exists in that window (depends on T006).
- [X] T009 Rewrite `src/app/dashboard/page.tsx` as the composing server component: call
      `getEnabledTaskCategories`, `getTodayLetsStartTask`, and `getDashboardAnalytics` for the
      signed-in session's `userId`, and render three always-present child slots for
      `AnalyticsSection`, `MonthCalendar`, and `LetsStartCard` (placeholders — filled in by US1/
      US2/US3 below), keeping the existing "set a password" notice and sign-out button intact.
      Depends on T006–T008.
- [X] T010 [P] Create `src/app/dashboard/actions.ts` (`"use server"`) with a shared helper that
      calls `auth()` and throws/rejects if there's no session, used by every action added in later
      phases (Constitution III — `userId` is always server-derived, never client-supplied).

**Checkpoint**: Schema migrated, base queries and the action-module skeleton exist. User story work
can begin.

---

## Phase 3: User Story 1 - First-time dashboard visit with no tasks yet (Priority: P1) 🎯 MVP

**Goal**: The dashboard always renders three areas; the analytics section shows an empty-state
placeholder with a "Plan your day" CTA until task data exists, while the calendar and "Let's
start" card render their own always-visible states regardless of data (FR-001–FR-004, SC-001,
SC-005).

**Independent Test**: Sign in with an account that has zero tasks, load `/dashboard`, and confirm
the analytics section shows the empty-state + CTA while the calendar (today highlighted) and
"Let's start" (no-tasks message) both still render.

- [X] T011 [P] [US1] Create `src/components/dashboard/month-calendar.tsx` — a plain Tailwind/JS
      month-grid component with today visually highlighted; no click handlers, no day drill-down,
      no data dependency at all (FR-003).
- [X] T012 [P] [US1] Create `src/components/dashboard/lets-start-card.tsx` — accepts a nullable
      task prop; when `null`, renders an "nothing left scheduled today" message (FR-004's empty
      branch); when present, renders the task's title/time and a start control (wired to an
      action in US3).
- [X] T013 [US1] Create `src/components/dashboard/analytics-section.tsx` — accepts the
      `DashboardAnalytics` shape from data-model.md; when `hasAnyTaskData` is false for both the
      week and month windows, renders an animated empty-state placeholder with a "Plan your day"
      call-to-action linking to `/dashboard/plan-day` (FR-002, SC-001); otherwise renders a
      placeholder slot for the chart (filled in by US2). Depends on T008's output shape.
- [X] T014 [US1] Wire `AnalyticsSection`, `MonthCalendar`, and `LetsStartCard` into
      `src/app/dashboard/page.tsx`, replacing the current placeholder markup. Depends on T009,
      T011–T013.
- [X] T015 [US1] Add an entrance animation to the empty-state placeholder using Tailwind's
      built-in transition/animation utilities (no new dependency) in `analytics-section.tsx`.

**Checkpoint**: User Story 1 is independently testable — a zero-task account sees a correct,
never-blank dashboard.

---

## Phase 4: User Story 2 - Planning a day's tasks from the empty-state prompt (Priority: P1)

**Goal**: The "Plan your day" flow lets a user create a day's tasks (with time + category),
replicate that set across the coming 7 days, or copy a previous day's tasks onto another day, with
overwrite confirmation and duplicate-time rejection (FR-006–FR-010, SC-002, SC-003).

**Independent Test**: Open `/dashboard/plan-day`, create a task list for today, confirm it's saved
and the dashboard's analytics section leaves the empty state; separately verify "replicate" and
"copy" each populate their target day(s), asking for confirmation only when a target already has
tasks.

- [X] T016 [P] [US2] Implement `createDayPlan` in `src/app/dashboard/actions.ts` per
      contracts/server-actions.md: an empty `tasks` array returns `{ ok: false, error: "empty" }`
      with no write (FR-010); a duplicate time within the request or against an existing task on
      that date returns `{ ok: false, error: "duplicate_time" }` with no partial write
      (Clarification: distinct time per task per day); a `category` outside the caller's
      `enabledTaskCategories` returns `{ ok: false, error: "disabled_category" }` (FR-002b).
- [X] T017 [P] [US2] Implement `replicateDayPlan` in `src/app/dashboard/actions.ts` per
      contracts/server-actions.md: targets the 7 calendar days immediately following
      `sourceDate` (FR-007); with `overwrite` false/omitted, any target date that already has
      tasks causes a no-write response listing `conflictDates` (FR-009); with `overwrite: true`,
      conflicting target dates are replaced (delete + recreate) and non-conflicting ones written
      normally.
- [X] T018 [P] [US2] Implement `copyDayPlan` in `src/app/dashboard/actions.ts` per
      contracts/server-actions.md: copies one source day's tasks onto one target date, with the
      same `overwrite`/conflict semantics as T017 (FR-008, FR-009).
- [X] T019 [P] [US2] Implement `toggleTaskCategory` in `src/app/dashboard/actions.ts` per
      contracts/server-actions.md: updates the caller's `enabledTaskCategories`. Disabling a
      category only removes it from the "Plan your day" category picker going forward — it must
      not affect T008's analytics query, which still shows historical data for a since-disabled
      category (FR-002b).
- [X] T020 [US2] Create `src/components/dashboard/plan-day-form.tsx` — a task list editor (title,
      time, category picker limited to the caller's enabled categories) plus "replicate across
      the next 7 days" and "copy from a previous day" controls; calls T016–T019 via TanStack Query
      mutations and shows an overwrite-confirmation dialog when a mutation response reports
      `conflictDates`/`conflict` (FR-009). Depends on T016–T019.
- [X] T021 [US2] Create `src/app/dashboard/plan-day/page.tsx` rendering `PlanDayForm`, reachable
      both from the analytics empty-state CTA (T013) and from a "re-plan" entry point on a
      populated dashboard. Depends on T020.
- [X] T022 [US2] In `plan-day-form.tsx`'s mutation `onSuccess` handlers, call `router.refresh()`
      (and redirect to `/dashboard` after create) so the dashboard's server-fetched analytics
      reflect newly planned/replicated/copied tasks on next view (research.md §6 — no client-side
      query cache for this data, since it's read straight through Drizzle server-side).
- [X] T023 [US2] Create `src/components/dashboard/weekly-monthly-chart.tsx` following the dataviz
      skill's procedure: pick the form (grouped bar, category series over the week/month buckets),
      assign the validated categorical palette (run `scripts/validate_palette.js` for both light
      and dark mode before shipping), apply mark specs (thin bars, 4px rounded data-ends, 2px
      surface gaps), and render `DashboardAnalytics.byCategory` (FR-002a).
- [X] T024 [US2] Wire `weekly-monthly-chart.tsx` into `analytics-section.tsx`'s non-empty branch,
      replacing the T013 placeholder. Depends on T023.
- [X] T025 [P] [US2] Create `src/components/dashboard/category-legend.tsx` — the shared legend
      piece `weekly-monthly-chart.tsx` uses (categorical swatches + labels), satisfying the
      dataviz skill's requirement that ≥2 series always carry a legend.

**Checkpoint**: User Story 2 is independently testable — planning, replicating, and copying all
work, and the analytics section reflects real data afterward.

---

## Phase 5: User Story 3 - Returning user checks today's plan and starts working (Priority: P2)

**Goal**: The "Let's start" card surfaces the nearest incomplete task for right now and can start a
Pomodoro session for it; completed tasks drop out of the card and feed analytics instead
(FR-005, FR-012, SC-004, Clarification Q2/Q3).

**Independent Test**: As a user with tasks scheduled both earlier and later than now, confirm the
"Let's start" card shows the nearest upcoming incomplete task and that clicking its start control
creates a Pomodoro session; mark that task done and confirm it disappears from the card on next
load.

- [X] T026 [US3] Implement `startPomodoroForTask` in `src/app/dashboard/actions.ts` per
      contracts/server-actions.md: creates a `pomodoro_sessions` row (`startedAt = now()`) for a
      task owned by the caller (FR-005); returns `{ ok: false, error: "not_found" }` for a
      missing/not-owned task and `{ ok: false, error: "already_completed" }` for a task whose
      `status` is already `done`.
- [X] T027 [US3] Wire the start control in `lets-start-card.tsx` to call `startPomodoroForTask`
      via a TanStack Query mutation; show an "in progress" indicator on success. Depends on T012,
      T026.
- [X] T028 [US3] Ensure that once a task's `status` becomes `done`, `router.refresh()` runs so the
      dashboard's "today's task" and analytics data are both re-read together, so the completed
      task immediately stops appearing in "Let's start" and its data appears in the analytics
      completed count on next view (Clarification Q2, FR-002a). No task-completion control existed
      anywhere in the app yet, so a minimal `completeTask` action + "Mark done" button were added
      to `lets-start-card.tsx` itself (not in the original contracts.md, but necessary to make this
      testable at all — see actions.ts comment). Depends on T022's refresh pattern and T027.

**Checkpoint**: All three user stories are independently functional and demoable together.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Update `ARCHITECTURE.md`'s domain model bullet for `Task`: replace
      "tag (Application / Interview Prep / Networking / Skill-building)" with
      "category (Other / Study Mode / Job Application Mode / Work)" (research.md "Follow-up
      housekeeping").
- [X] T030 [P] Re-run `scripts/validate_palette.js` against the final palette used in
      `weekly-monthly-chart.tsx` for both `--mode light` and `--mode dark`; fix and re-validate if
      anything fails (dataviz skill's mandatory check).
- [X] T031 Walk through `quickstart.md` steps 1–7 end-to-end manually. Verified via a disposable
      test account (OTP-based sign-in simulated through curl + direct DB seeding, no browser tool
      available): auth guard on `/dashboard`, empty-state → real-data transition (step 1–2),
      forward-only "Let's start" selection excluding an overdue task (step 5, I1 fix), and a
      disabled category's historical data staying in analytics while disappearing from the
      "Plan your day" category picker (step 6, I2 fix) — all confirmed against the real dev DB.
      **Not exercised**: the actual button clicks for create/replicate/copy/start/mark-done (steps
      2–4, 5.3) — these are client-side mutations with no practical way to trigger via curl; they
      pass build + lint + type-check but should be clicked through once in a real browser.
- [X] T032 Run `npm run build` and `npm run lint`; fix any errors (constitution requirement).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001, since T002 uses the categories constant).
  Blocks every user story.
- **User Stories (Phase 3–5)**: All depend on Foundational completion. US1 and US2 are both P1;
  US2 is what produces the data US1's "leave the empty state" scenario needs, but US1 is still
  independently testable on its own (a zero-task account correctly shows the empty state whether
  or not US2 exists yet). US3 depends on US1's `lets-start-card.tsx` (T012) and Foundational's
  `getTodayLetsStartTask`/cache-invalidation pattern (T022, introduced in US2).
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- US1: T011/T012 (components) can run in parallel with each other; T013 depends on the
  `DashboardAnalytics` shape (T008); T014 wires everything together last.
- US2: T016–T019 (four independent server actions, different concerns in the same file — treat as
  logically parallel but expect sequential edits to `actions.ts`); T020 depends on all four; T021
  depends on T020; T023/T025 can be built in parallel, then T024 wires them in.
- US3: T026 first, then T027, then T028.

### Parallel Opportunities

- T001 (Setup) has no dependents to block.
- T006 and T007 (Phase 2) touch the same file (`queries.ts`) but are logically independent reads —
  fine to write back-to-back.
- T011, T012 (US1) are different files and fully parallel.
- T025 (US2 legend) can be built alongside T023 (chart) since the chart imports it once both
  exist.
- T029, T030 (Polish) are independent and fully parallel.

---

## Parallel Example: Phase 2 Foundational

```bash
# After T002-T005 (schema + migration) land, these read functions can be written together:
Task: "Implement getEnabledTaskCategories(userId) in src/lib/dashboard/queries.ts"
Task: "Implement getTodayLetsStartTask(userId) in src/lib/dashboard/queries.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Create month-calendar.tsx (no data dependency)"
Task: "Create lets-start-card.tsx (accepts nullable task prop)"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

Both are P1 in spec.md — US1 alone proves the dashboard never looks broken, but US2 is what makes
it actually useful (there'd be nothing to plan otherwise). Treat Phases 1–4 as the MVP slice:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (schema migration is the riskiest step — verify it against the
   dev database before moving on)
3. Complete Phase 3: User Story 1 — **stop and verify** the empty-state/always-visible behavior
4. Complete Phase 4: User Story 2 — **stop and verify** planning/replicate/copy end-to-end
5. Deploy/demo the MVP

### Incremental Delivery

6. Add Phase 5: User Story 3 ("Let's start" + Pomodoro kickoff) → verify independently → demo
7. Complete Phase 6: Polish (doc sync, palette re-validation, quickstart pass, build/lint gate)
