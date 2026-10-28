# Quickstart: Pomodoro Timer

Manual validation guide (no automated suite in this project). Run against a local dev server with a
Neon connection configured (`npm run dev`), signed in as a test account with at least one incomplete
task scheduled for today (so the "Let's start" card has something to show).

## Prerequisites

- Migration applied (`pomodoro_kind` enum + `pomodoro_sessions.kind`, defaulted to `'focus'` for
  existing rows).

## 1. Starting a focus period and surviving reload (User Story 1)

1. On `/dashboard`, click "Start Pomodoro" on the "Let's start" card.
2. **Expect**: a countdown appears showing the default focus duration (25 minutes) ticking down.
3. Reload the page. **Expect**: the countdown shows time consistent with what's actually elapsed
   (not reset to the full duration) — FR-002/SC-001.
4. Wait for the countdown to reach zero (or seed a period with an old `started_at` directly in the
   DB to speed this up). **Expect**: an audible ring plays and the period visibly shows as complete.

## 2. Moving through break and back into focus (User Story 2)

1. With a just-completed focus period, **expect** a control offering to start the break.
2. Start the break. **Expect**: it counts down the same way, using the default break duration
   (5 minutes).
3. Let the break reach zero. **Expect**: a ring plays, the break shows complete, and a control
   appears to start another focus round for the same task.
4. Repeat once more to confirm the cycle isn't limited to a single round.

## 3. Stopping early (User Story 3)

1. Start a focus period, let a noticeable amount of time pass, then stop it before it reaches zero.
2. **Expect**: the countdown ends immediately.
3. Check the dashboard's analytics ("focused time" for the task's category). **Expect**: the
   elapsed time up to the stop is counted (FR-008/SC-004).

## 4. Single-running-period rule (Clarification 2026-09-30)

1. Start a focus period for Task A.
2. Without stopping it, start a Pomodoro for a different Task B (e.g., via a second "Let's start"
   entry point, or by seeding a second incomplete task and switching to it).
3. **Expect**: Task A's period is automatically ended (its elapsed time preserved — check
   analytics), and Task B's new period begins running. Only one countdown is ever active at a time.

## 5. Break time excluded from analytics (Clarification 2026-09-30)

1. Run a break period to completion (or stop it partway).
2. Check the dashboard's "focused time" analytics for that task's category.
3. **Expect**: the break period's duration is **not** added to the focused-minutes total — only
   focus-period time appears there (FR-012).

## 6. Cross-tab consistency

1. Start a focus period in one browser tab.
2. Open `/dashboard` in a second tab (same session).
3. **Expect**: both tabs show the same remaining time (allowing for a second or two of drift), since
   both derive it from the same `started_at`.

## 7. Regression check

- `npm run build` and `npm run lint` both pass.
- Feature 002's dashboard behavior (empty state, calendar, analytics, "Plan your day" flow) is
  unaffected when no Pomodoro period is running.
