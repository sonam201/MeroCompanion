# Feature Specification: Pomodoro Timer

**Feature Branch**: `003-pomodoro-timer`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Pomodoro timer: starting a session from the dashboard's "Let's start" card shows a running countdown timer for the focus period (using the session's planned focus/break minutes, already stored on pomodoro_sessions). The countdown must reflect real elapsed time - if the user reloads or navigates away and comes back, it should show correct remaining time based on when the session actually started, not reset. When the focus period reaches zero, play an audible ring/alert and visually mark it done, then offer to move into the break period (and back into another focus round after that), each phase following the same timer + end-of-phase ring behavior. The user can stop a running session early."

## Clarifications

### Session 2026-09-30

- Q: Should break-period time count toward the dashboard's "focused minutes" analytics total? → A: No. Only focus-period time counts toward that total; break periods are tracked (so the timer itself works) but excluded from the focused-minutes sum, since a break isn't work.
- Q: Can two different tasks each have their own running Pomodoro period at the same time? → A: No. Only one period may run per user at a time, account-wide. Starting a new period while another is running automatically stops the other one first (its elapsed time is preserved per FR-008), rather than requiring a separate explicit stop step.

### Session 2026-09-30 (follow-up)

- The ring/alert also plays when the user starts a period and when they stop one early — not only on natural completion. All three are moments the user should get audible confirmation something happened.
- The "start the next phase" offer (after a focus or break period completes) also needs a way to decline and stop there, rather than forcing the user into either starting the next phase or leaving the offer sitting unresolved.

### Session 2026-10-02

- A running period also needs a Pause control alongside Stop. Pausing freezes the countdown (it does not advance while paused) rather than ending the period; the user can resume it later and the countdown picks up from where it was frozen — effectively shifting the deadline forward by however long it was paused. This must survive reload the same way a running countdown does (FR-002's guarantee extends to the paused state too).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Starting a focus period and watching it run (Priority: P1)

A user clicks "Start Pomodoro" on the "Let's start" card for their next task. A countdown appears showing the time remaining in the focus period. If they reload the page, switch tabs, or come back to the dashboard a few minutes later, the countdown still shows the correct time remaining — it never restarts from the full duration just because the page reloaded.

**Why this priority**: This is the entire point of the feature — a timer that can't be trusted to show real elapsed time is worse than no timer, since it would mislead the user about how much focused time they've actually put in.

**Independent Test**: Start a focus period, note the displayed remaining time, wait a measurable amount of time, reload the page, and confirm the displayed remaining time has decreased by roughly the amount of time that passed (not reset to the full duration).

**Acceptance Scenarios**:

1. **Given** a task with no active session, **When** the user clicks "Start Pomodoro", **Then** a countdown begins showing the default focus duration counting down.
2. **Given** a focus period is running, **When** the user reloads the page or returns after navigating away, **Then** the countdown reflects the actual time remaining based on when the period actually started, not a fresh full duration.
3. **Given** a focus period is running, **When** the countdown reaches zero, **Then** the system plays an audible ring/alert and visibly marks the focus period as complete.

---

### User Story 2 - Moving through break and back into focus (Priority: P1)

After a focus period ends, the user is offered the option to start the break period. The break counts down the same way the focus period did, and ends the same way — a ring and a visual "done" marker. From there, the user is offered another focus round for the same task, continuing the cycle for as long as they want.

**Why this priority**: The focus-then-break rhythm is the actual Pomodoro technique this feature is named after; without it, this is just a single countdown timer, not a Pomodoro tool.

**Independent Test**: Let a focus period run to completion, confirm the break option appears, start it, let it run to completion, and confirm the option to start another focus round appears afterward.

**Acceptance Scenarios**:

1. **Given** a focus period has just completed, **When** the user views the task, **Then** they are offered a control to start the break period.
2. **Given** the user starts the break period, **When** it is running, **Then** it counts down using the same real-elapsed-time behavior as the focus period.
3. **Given** a break period reaches zero, **Then** the system plays an audible ring/alert, marks the break as complete, and offers a control to start another focus round for the same task.
4. **Given** a focus period has just completed, **When** the user does not start the break, **Then** the session simply stays in its completed-focus state — moving to break is never automatic.

---

### User Story 3 - Stopping a session early (Priority: P2)

A user is partway through a focus or break period and needs to stop — they've been interrupted, or the task is already done. They stop the running period, and the focused time they already put in before stopping is preserved rather than thrown away.

**Why this priority**: Real work gets interrupted; a timer that can't be stopped, or that discards genuine progress when stopped, would discourage people from using it honestly.

**Independent Test**: Start a focus period, let a noticeable amount of time pass, stop it before it reaches zero, and confirm the elapsed time up to the stop is reflected in the dashboard's focused-time analytics rather than showing zero.

**Acceptance Scenarios**:

1. **Given** a focus or break period is running, **When** the user chooses to stop it, **Then** the countdown ends immediately and the period is marked as ended at that moment.
2. **Given** a period was stopped early, **When** the dashboard's analytics are viewed afterward, **Then** the elapsed time up to the stop point is counted as focused time.

---

### Edge Cases

- What happens if the user closes the tab entirely and reopens the dashboard after the period would have already finished? The period shows as complete (elapsed time already exceeds the planned duration) rather than a countdown continuing past zero or into negative time.
- What happens if the user has the dashboard open in two tabs at once? Both tabs derive the countdown from the same recorded start time, so they show the same remaining time (allowing for normal clock drift) rather than independent, inconsistent timers.
- What happens if the user tries to start a new focus period for a task that already has one running? The existing running period is resumed/shown instead of starting a second, overlapping one.
- What happens if the user starts a Pomodoro period for a different task while one is already running elsewhere? The other task's running period is automatically stopped (its elapsed time preserved) before the new one starts — only one period ever runs at a time, account-wide.
- What happens if the browser blocks the ring sound (e.g., autoplay restrictions)? The visual "done" state still appears regardless of whether the sound successfully played, so the user isn't left unaware the period ended.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Clicking "Start Pomodoro" on a task MUST begin a focus-period countdown using the default focus duration (25 minutes; not currently configurable per task).
- **FR-002**: The countdown display MUST be computed from the period's actual recorded start time rather than from a value held only in the page's memory, so that reloading or revisiting the page shows accurate remaining time rather than a reset timer.
- **FR-003**: When a focus period's countdown reaches zero, the system MUST play an audible ring/alert and visibly mark that focus period as complete.
- **FR-003a**: The system MUST also play the same audible ring/alert when a period is started and when a period is stopped early, giving the user audible confirmation at all three lifecycle moments (start, stop, natural completion).
- **FR-004**: After a focus period completes, the system MUST offer the user a control to start the break period; starting the break MUST NOT happen automatically.
- **FR-005**: The break period MUST use the same real-elapsed-time countdown behavior and the same end-of-period ring/visual-complete behavior as the focus period, using the default break duration (5 minutes; not currently configurable per task).
- **FR-006**: After a break period completes, the system MUST offer the user a control to start another focus round for the same task.
- **FR-007**: The user MUST be able to stop a running focus or break period at any point before it naturally reaches zero.
- **FR-007a**: From the "start the next phase" offer shown after a period completes (FR-004, FR-006), the user MUST also be able to stop there instead of being forced to start the next phase.
- **FR-013**: The user MUST be able to pause a running focus or break period. Pausing MUST freeze the countdown (it MUST NOT continue decreasing while paused) without ending the period.
- **FR-014**: The user MUST be able to resume a paused period, after which the countdown MUST continue from the exact remaining time it had when paused — not jump or lose time.
- **FR-015**: The paused state (and the frozen remaining time) MUST survive a reload, the same way a running countdown does (FR-002).
- **FR-008**: Stopping a period early MUST preserve the time elapsed up to that point as counted focused time; it MUST NOT be discarded.
- **FR-009**: If a task already has a running (not yet ended) period, revisiting "Start Pomodoro" for that task MUST resume/display that existing period rather than starting a second, concurrent one.
- **FR-009a**: A user MUST NOT have more than one running period at a time across all of their tasks. Starting a new period while a different task's period is still running MUST automatically stop that other period first (preserving its elapsed time per FR-008) before the new one begins.
- **FR-010**: The visual "period complete" indication MUST appear regardless of whether the audible ring successfully plays.
- **FR-011**: All Pomodoro period data and controls MUST be scoped to the authenticated user's own tasks and sessions.
- **FR-012**: Only focus-period time MUST count toward the dashboard's "focused minutes" analytics total; break-period time MUST be tracked for the timer's own purposes but excluded from that total.

### Key Entities

- **Pomodoro Period**: A single focus or break stretch of time tied to one task, with a start time, a planned duration (a fixed default — 25 minutes for focus, 5 for break — not currently configurable per task or per user), an end time once it completes or is stopped early, a kind (focus or break), and pause state (whether currently paused, and how much total time has been paused across however many pause/resume cycles — used to shift the effective deadline forward rather than tracking remaining time as its own value). A full cycle (focus → break → focus → ...) is represented as a short sequence of these periods for the same task, one after another, rather than one record spanning every phase. Only focus-kind periods feed the dashboard's focused-minutes analytics (FR-012).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can look at the timer at any point — right after starting it, or minutes later after reloading — and the remaining time shown is always within a few seconds of the true remaining time.
- **SC-002**: 100% of focus and break period completions produce a visible "done" indicator, and an audible alert whenever the browser allows sound to play.
- **SC-003**: A user can move from a just-finished focus period into the following break period, and from a just-finished break into the next focus round, in a single action each time.
- **SC-004**: Time spent in a period that was stopped early is still reflected in the dashboard's focused-time totals, with no manual step required to "save" it.

## Assumptions

- Focus and break durations are fixed app-wide defaults (25 and 5 minutes), not configurable per
  task or per user in this feature — letting users customize these is a natural future feature, not
  part of this one.
- Each focus or break stretch is its own trackable period (its own start/end time, and a kind distinguishing focus from break), chained together for a task rather than one record covering an entire multi-phase cycle. Only the focus-kind periods feed the dashboard's existing focused-minutes analytics.
- There is no fixed number of cycles (e.g., "4 focus rounds then a long break") — the user can keep going through focus/break rounds for as long as they choose, and can stop at any point.
- Completing or stopping a Pomodoro period does not automatically mark the underlying task as done — that remains a separate, explicit action the user already has on the dashboard.
- The ring/alert is a simple in-app audible cue; it does not need to reach the user if the dashboard tab isn't open at all (no push notification or email is required for this feature).
- No fixed limit on how long a stopped-and-resumed task can sit before being resumed — resuming after any amount of time simply shows the period as already complete if its duration has elapsed.
