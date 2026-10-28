---
description: "Task list for Pomodoro Timer"
---

# Tasks: Pomodoro Timer

**Input**: Design documents from `/specs/003-pomodoro-timer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md,
quickstart.md

**Tests**: Not included — no automated test suite is configured in this project and the spec does
not request one. `npm run build` and `npm run lint` remain the mandatory gates (Polish phase).

**Organization**: Tasks are grouped by user story (US1/US2/US3 map to spec.md's three user
stories).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to
- File paths are exact and relative to the repo root

---

## Phase 1: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story task may start until this phase is complete.

- [X] T001 In `src/lib/db/schema.ts`, add a `pomodoroKind` pgEnum (`focus`, `break`) and a
      `kind` column on `pomodoroSessions`, typed `pomodoroKind("kind").notNull().default("focus")`
      (data-model.md — existing rows correctly default to `focus` since they all came from 002's
      original action).
- [X] T002 Run `npx drizzle-kit generate` for T001; review the generated SQL (or hand-write it +
      the matching `drizzle/meta/*_snapshot.json`/`_journal.json` entries if the interactive
      resolver can't run non-interactively, following the same approach used for feature 002's
      migration) — confirm `npx drizzle-kit generate` reports "No schema changes" afterward.
- [X] T003 Apply the migration to the dev Neon database (required fixing a fabricated timestamp
      from feature 002's hand-written 0003 migration that had accidentally been set ahead of real
      wall-clock time — see conversation notes — which caused drizzle-kit's migrator to silently
      skip this migration on the first attempt despite reporting success); confirm existing `pomodoro_sessions` rows
      show `kind = 'focus'`.
- [X] T004 In `src/app/dashboard/actions.ts`, extend `startPomodoroForTask` to accept an optional
      `kind: "focus" | "break"` (default `"focus"`) per contracts/server-actions.md: before
      inserting, look up the caller's currently running period (`endedAt IS NULL`) across all
      tasks; if it matches this exact `taskId` and `kind`, return it unchanged (FR-009 — resume, no
      duplicate); if it belongs to a different task or a different `kind`, set its `endedAt = now()`
      first (FR-009a, preserving elapsed time per FR-008), then insert the new row with the
      requested `kind`.
- [X] T005 [P] Add `endPomodoroPeriod({ periodId })` to `src/app/dashboard/actions.ts` per
      contracts/server-actions.md: sets `endedAt = now()` on a period owned by the caller that
      isn't already ended; returns `{ ok: false, error: "not_found" }` otherwise. Used for both
      natural completion and early stop (research.md §4).
- [X] T006 [P] Add `getActivePeriod(userId)` to `src/lib/dashboard/queries.ts`: returns the
      `ActivePeriod` shape from data-model.md (the caller's one row with `endedAt IS NULL`, joined
      to its task for the title) or `null`.
- [X] T007 Update `getDashboardAnalytics`'s focused-minutes query in
      `src/lib/dashboard/queries.ts` to filter `pomodoroSessions.kind = 'focus'` (FR-012 — break
      time must never inflate that total). Depends on T001.
- [X] T008 [P] Create `src/lib/dashboard/pomodoro-sound.ts`: a small helper that plays a short tone
      via the Web Audio API (`OscillatorNode`) when called — no audio asset file, no new dependency
      (research.md §5).

**Checkpoint**: Schema migrated, actions/queries extended, sound helper ready. User story work can
begin.

---

## Phase 2: User Story 1 - Starting a focus period and watching it run (Priority: P1) 🎯 MVP

**Goal**: Clicking "Start Pomodoro" shows a countdown that reflects real elapsed time even across
reload, and rings + visibly completes at zero (FR-001–FR-003, FR-010, SC-001).

**Independent Test**: Start a focus period, note the remaining time, reload the page, and confirm
the remaining time decreased by roughly the real elapsed time rather than resetting.

- [X] T009 [P] [US1] Create `src/components/dashboard/pomodoro-timer.tsx`: accepts an
      `ActivePeriod`, computes `remaining = startedAt + plannedMinutes*60000 - Date.now()` on a
      1-second interval (never a decrementing counter — research.md §1), renders `mm:ss`. When
      `remaining <= 0`, calls `endPomodoroPeriod` once, plays the sound via `pomodoro-sound.ts`, and
      shows a visible "complete" state regardless of whether the sound actually played (FR-010).
- [X] T010 [US1] In `src/app/dashboard/page.tsx`, fetch `getActivePeriod(session.user.id)` alongside
      the existing `getTodayLetsStartTask`/`getDashboardAnalytics` calls and pass it to
      `LetsStartCard`. Depends on T006.
- [X] T011 [US1] Rework `src/components/dashboard/lets-start-card.tsx`: when an `activePeriod` is
      present, render `PomodoroTimer` for it instead of the existing "next up task" view — an
      active period takes priority over whichever task `getTodayLetsStartTask` would otherwise
      suggest, since the user is already mid-session. When the existing "Start Pomodoro" button is
      clicked, call the extended `startPomodoroForTask` and immediately render the timer from the
      action's returned `period` (no page reload needed). Depends on T009, T010, T004.

**Checkpoint**: User Story 1 is independently testable — the countdown is correct on first render
and after reload.

---

## Phase 3: User Story 2 - Moving through break and back into focus (Priority: P1)

**Goal**: After a focus period completes, offer to start the break; after the break completes,
offer another focus round — never automatic (FR-004–FR-006, SC-003).

**Independent Test**: Let a focus period finish, confirm a "Start break" control appears (not an
automatic transition), start it, let it finish, and confirm a "Start another focus round" control
appears afterward.

- [X] T012 [US2] Implemented in `lets-start-card.tsx` rather than `pomodoro-timer.tsx` (cleaner
      split: the timer component only counts down and reports `onEnded`; the card owns the offer UI
      since it already owns the start/complete mutations). When a period ends via `onEnded`, the
      card renders a control matching the ended period's `kind`: focus → "Start break"; break →
      "Start another focus round". Neither transition happens automatically (US2 AC4).
- [X] T013 [US2] The offer button's `onClick` calls `startPomodoroForTask({ taskId, kind })` with
      the appropriate `kind` via the same `startMutation` used for the initial start, swapping
      `currentPeriod` to the new period on success. Depends on T012, T004.

**Checkpoint**: User Story 2 is independently testable — the focus/break/focus rhythm works for
as many rounds as the user chooses.

---

## Phase 4: User Story 3 - Stopping a session early (Priority: P2)

**Goal**: A running period can be stopped before it reaches zero, and the elapsed time up to that
point is preserved for analytics (FR-007–FR-008, SC-004).

**Independent Test**: Start a focus period, let some time pass, stop it early, and confirm the
dashboard's focused-time analytics reflect the partial elapsed time.

- [X] T014 [US3] Added a "Stop" control to `pomodoro-timer.tsx`, visible while a period is running,
      calling `endPomodoroPeriod({ periodId })` and reporting `onEnded("stopped")`.
- [X] T015 [US3] `handlePeriodEnded` in `lets-start-card.tsx` calls `router.refresh()` on a
      `"stopped"` reason (vs. showing the offer on `"completed"`), falling back to the normal
      "next up task" view rather than leaving a stale/dead timer on screen. Depends on T014.

**Checkpoint**: All three user stories are independently functional and demoable together.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T016 [P] Manually verified (per quickstart.md step 5) via disposable test account + direct DB
      seeding: a 10-minute focus period + a 5-minute break period showed "10m" in the analytics
      focused-time total, not 15m — break time correctly excluded (FR-012).
- [X] T017 Walked through quickstart.md steps 1–7 to the extent possible without a browser tool
      (same constraint as features 001/002): verified via disposable test account, curl, and direct
      DB seeding — countdown reflects real elapsed time across separate loads (step 1, confirmed to
      the second: 22:51 → 22:34 across a 15s gap), single-running-period auto-stop (step 4, via a
      script replicating the action's exact query/update sequence), and break-time analytics
      exclusion (step 5). **Not exercised**: the actual "Start break"/"Start another focus
      round"/"Stop" button clicks (steps 2–3) — these are client-side mutations with no practical
      way to trigger via curl; the code paths they call were verified directly, but the click-through
      UI flow should be tried in a real browser once.
- [X] T018 Ran `npm run build` and `npm run lint` — both pass clean. Lint caught one real issue
      along the way (writing to a ref during render in `pomodoro-timer.tsx`), fixed by moving the
      assignment into a `useEffect`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. Blocks every user story.
- **User Stories (Phase 2–4)**: All depend on Foundational completion. US1 and US2 are both P1;
  US2's "offer next phase" controls live inside the same `pomodoro-timer.tsx` component US1 builds,
  so build US1 first. US3 (stop) also extends that same component and can be added once US1 exists;
  it doesn't require US2 to be done first.
- **Polish (Phase 5)**: Depends on all three user stories being complete.

### Parallel Opportunities

- T005, T006, T008 (Phase 1) are independent files/concerns and can be done in parallel once T001
  lands.
- T009 (the timer component's core countdown) can be built in parallel with T010 (the page-level
  data fetch), then T011 wires them together.
- T016, T017 aren't truly parallel with T018 in effect (T018 should run last), but T016 can happen
  alongside writing quickstart notes.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Foundational (the schema migration is the step worth double-checking against
   the dev DB before moving on, same as feature 002's).
2. Complete Phase 2: User Story 1 — **stop and verify** the countdown survives reload before moving
   on.
3. Deploy/demo the MVP (a working, reload-safe focus timer with a ring at the end).

### Incremental Delivery

4. Add Phase 3: User Story 2 (break/focus cycling) → verify independently → demo.
5. Add Phase 4: User Story 3 (stop early) → verify independently → demo.
6. Complete Phase 5: Polish (analytics exclusion check, quickstart pass, build/lint gate).

---

## Phase 6: Follow-up fixes (post-implementation feedback)

- [X] T019 [P] Fixed a real autoplay-policy bug in `src/lib/dashboard/pomodoro-sound.ts`: a
      fresh `AudioContext` created inside the natural-completion `setInterval` tick (not a user
      gesture) was silently blocked by the browser. Reworked to a lazily-created, reused singleton
      `AudioContext`, resumed on every `playPomodoroRing()` call — since it gets created/unlocked
      during the "Start"/"Stop" click handlers (genuine gestures), it stays usable for the later
      non-gesture auto-complete call too (FR-003a).
- [X] T020 [P] Added `playPomodoroRing()` calls at period start (`lets-start-card.tsx`'s
      `startMutation.onSuccess`) and at manual stop (`pomodoro-timer.tsx`'s `handleStop`), in
      addition to the existing natural-completion ring (FR-003a).
- [X] T021 Added a "Stop" control to the "start next phase" offer screen in
      `lets-start-card.tsx`, alongside "Start break"/"Start another focus round" — previously the
      offer had no way to decline; clicking it rings, clears the offer, and refreshes back to the
      normal dashboard state (FR-007a).
- [X] T022 Ran `npm run build` and `npm run lint` — both pass clean.

---

## Phase 7: Pause/resume (follow-up feature addition, 2026-10-02)

- [X] T023 Added `pausedAt` (nullable timestamp) and `pausedMs` (integer, default 0) to
      `pomodoro_sessions` in `src/lib/db/schema.ts`; generated and applied the migration
      (`drizzle/0005_lean_blue_shield.sql`) — verified column presence and migration-tracking row
      directly against the dev DB (FR-013–FR-015).
- [X] T024 Added `pausePomodoroPeriod`/`resumePomodoroPeriod` to `src/app/dashboard/actions.ts`:
      pause records `pausedAt = now()`; resume folds `(now() - pausedAt)` into `pausedMs` and clears
      `pausedAt`, returning the updated fields so the client stays in sync with server timestamps.
      `startPomodoroForTask`'s `ActivePeriodResult` and `getActivePeriod` (`queries.ts`) both now
      carry `pausedAt`/`pausedMs`.
- [X] T025 Reworked `pomodoro-timer.tsx`'s countdown math: effective deadline is
      `startedAt + plannedMinutes + pausedMs`; while paused, remaining time is a frozen derivation
      (`deadline - pausedAt`) computed directly in render rather than ticked, so pausing shifts the
      deadline forward by exactly the pause duration rather than tracking remaining time as its own
      mutable value. Added Pause/Resume buttons alongside Stop.
- [X] T026 Verified the deadline-shift math directly against the dev DB via a script replicating
      the exact pause/resume logic: paused for ~3.6s, resumed, and the effective end time shifted
      forward by exactly 3578ms — matching the accumulated `pausedMs` precisely. Also confirmed via
      a disposable test account that the dashboard renders both "Pause" and "Stop" for a running
      period.
- [X] T027 Ran `npm run build` and `npm run lint` — both pass clean (one lint fix needed: moved a
      synchronous `setState` out of the paused branch of the ticking effect into a pure render-time
      derivation, per `react-hooks/set-state-in-effect`).
