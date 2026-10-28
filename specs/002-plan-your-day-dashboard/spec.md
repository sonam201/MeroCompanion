# Feature Specification: Plan-Your-Day Dashboard

**Feature Branch**: `002-plan-your-day-dashboard`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Post-login dashboard ("plan my day" home screen): shows three things — (1) a progress/analytics section with weekly and monthly engagement stats, which displays an animated empty-state placeholder with a "Plan your day" call-to-action until the user has any task data; clicking "Plan your day" opens a card/page where the user creates tasks for a 24-hour day, can replicate that same task set across the coming 7 days, or copy a previous day's tasks onto another day via a "copy" option — once tasks exist, the empty state is replaced by the real charts/stats; (2) a compact calendar showing the current date/day (month view, no day drill-down yet — deferred); (3) a "Let's start" card showing the task scheduled closest to the current time of day, with a button to begin a Pomodoro session for it. The calendar and "Let's start" card are always visible regardless of whether analytics data exists — only the analytics section has the empty-state behavior."

## Clarifications

### Session 2026-09-30

- Q: What should "engagement" actually measure in the weekly/monthly analytics? → A: Two metrics, both broken down by task category: (1) completed-vs-planned task count/rate, and (2) total focused Pomodoro time (counted once a session starts and ends). Categories are a fixed preset — Others, Study Mode, Job Application Mode, Work — and each user chooses which categories apply to them (e.g., a user not job-hunting can leave Job Application Mode off).
- Q: Should the "Let's start" card ever show a task that's already been completed? → A: No. Once a task is marked complete, it's removed from "Let's start" consideration entirely and its data moves to feed the analytics section instead — "Let's start" only ever surfaces incomplete, upcoming tasks.
- Q: If today has no planned tasks but other days do, should "Let's start" pull forward a future day's task? → A: No. It is strictly scoped to today's specific tasks and their specific start times; if today is empty it shows the "nothing left today" message rather than reaching into another day.
- Q: Can two tasks in the same day plan share the exact same scheduled start time? → A: No. Each task in a day plan must have a distinct start time; the "Plan your day" flow enforces this at creation time.
- Q: What day should the "week" start on for the weekly analytics window? → A: Monday–Sunday.
- Q: Should "Let's start" ever surface a task whose scheduled time has already passed (overdue but still incomplete)? → A: No. It is strictly forward-looking — only tasks scheduled at or after the current time are candidates; an overdue incomplete task is simply not shown as "next up" (it stays visible in the regular task list, just not on this card).
- Q: Does disabling a task category hide that category's already-recorded analytics history, or only stop it being offered for new tasks? → A: Only going forward. Disabling a category removes it from the task-creation options, but any data already recorded under it stays visible in the analytics breakdown for whatever week/month windows it falls into.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-time dashboard visit with no tasks yet (Priority: P1)

A user signs in for the first time (or has never created a task) and lands on the dashboard. Instead of empty charts, the analytics section shows an inviting placeholder that explains there's nothing to show yet and prompts them to plan their day. The calendar and the "Let's start" card are still visible and functional (the calendar shows today; the "Let's start" card shows its own no-tasks message), so the page never feels broken or blank overall — only the analytics area is explicitly in an empty state.

**Why this priority**: This is the first thing every new user sees post-signup. If it looks broken or empty with no path forward, the product loses the user before they experience any value. This also directly replaces the ad hoc empty-state work that was rolled back, so it re-establishes the corrected scope as the spec of record.

**Independent Test**: Can be fully tested by signing in with an account that has zero tasks and confirming the analytics section renders the empty-state placeholder with a working "Plan your day" call-to-action, while the calendar and "Let's start" card render their own always-visible states.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no tasks in the current week/month analytics window, **When** they load the dashboard, **Then** the analytics section displays an empty-state placeholder (not charts) with a "Plan your day" call-to-action, and the calendar and "Let's start" card are still visible.
2. **Given** the analytics empty state is showing, **When** the user creates at least one task (via the "Plan your day" flow), **Then** on next view the analytics section displays real weekly/monthly stats instead of the empty state.

---

### User Story 2 - Planning a day's tasks from the empty-state prompt (Priority: P1)

From the analytics empty state, the user clicks "Plan your day" and is taken to a task-creation flow (card or page) where they lay out what they intend to do over a 24-hour day: adding tasks with a time of day. Rather than repeating this from scratch every day, they can either replicate this same set of tasks forward across the coming week, or, on a later day, copy a previous day's task list as the starting point instead of building it from nothing.

**Why this priority**: This is the actual mechanism that produces the data the rest of the dashboard (analytics, calendar, "Let's start") depends on. Without it, the dashboard has no way to leave the empty state, so it is equally foundational to Story 1.

**Independent Test**: Can be fully tested by opening the "Plan your day" flow, creating a task list for the current day, confirming it is saved and attributed to that day, then separately testing the "replicate across the next 7 days" option and the "copy a previous day's tasks" option each produce the expected task lists on their target days.

**Acceptance Scenarios**:

1. **Given** a user has clicked "Plan your day", **When** they add one or more tasks with a scheduled time and a category (Others, Study Mode, Job Application Mode, or Work — limited to the categories they've enabled) and save, **Then** those tasks are stored against the current day and become visible to the rest of the dashboard (analytics, "Let's start" card).
2. **Given** a user has just planned a day's tasks, **When** they choose to replicate that set across the coming 7 days, **Then** each of the next 7 days is populated with a copy of that same task list, independently editable afterward.
3. **Given** a user is planning a day that is not yet populated, **When** they choose to copy a previous day's tasks, **Then** they can pick a prior day and have its task list copied onto the day being planned.
4. **Given** a user is on the task-planning flow, **When** they save with no tasks entered, **Then** the system does not create an empty day-plan record that would incorrectly count as "has task data."

---

### User Story 3 - Returning user checks today's plan and starts working (Priority: P2)

A returning user with existing tasks opens the dashboard to see how they're tracking and what to do next. They glance at the calendar to confirm today's date, check the "Let's start" card to see the task closest to the current time of day, and start a focused work session for it directly from that card.

**Why this priority**: This is the core "plan my day, then execute" loop the product is built around, but it depends on Stories 1 and 2 already having produced task data — it's the payoff, not the entry point.

**Independent Test**: Can be fully tested by loading the dashboard as a user with tasks scheduled both earlier and later than the current time, and confirming the "Let's start" card surfaces the nearest upcoming (or in-progress) task and its button begins a Pomodoro session for that specific task.

**Acceptance Scenarios**:

1. **Given** a user has multiple tasks scheduled throughout the day, **When** they view the dashboard, **Then** the "Let's start" card shows the task whose scheduled time is closest to the current time.
2. **Given** the "Let's start" card is showing a task, **When** the user clicks its start button, **Then** a Pomodoro session begins for that task.
3. **Given** a user has tasks for today but none remaining later in the day, **When** they view the dashboard, **Then** the "Let's start" card communicates that there's nothing left scheduled today rather than showing a stale or incorrect task.

---

### Edge Cases

- What happens when a user has tasks planned for other days but none for today? The analytics section (which looks at weekly/monthly totals) should still show real data if any exists in that window, while the "Let's start" card should show a no-tasks-today message rather than pulling in a task from another day.
- What happens when "replicate across the next 7 days" is used on a day that already has tasks for some of those target days? The user must be warned before an existing day's tasks are overwritten, and declining the overwrite must leave that day's existing tasks untouched.
- What happens when "copy a previous day's tasks" targets a day that already has tasks? Same overwrite-confirmation behavior as above, for consistency.
- What happens when a task's scheduled time has already passed but it's still incomplete? It is never shown by "Let's start" — the card only ever looks at tasks scheduled at or after the current time (it stays visible in the regular task list, just not surfaced here as "next up").
- What happens when the user has zero tasks anywhere but visits the dashboard again mid-session after planning a day in another tab? The analytics section should reflect the new data on next load/refresh, not require a full sign-out/sign-in.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST always render three distinct areas: an analytics/progress section, a calendar, and a "Let's start" task card — regardless of whether the user has any task data.
- **FR-002**: The analytics section MUST display an empty-state placeholder with a "Plan your day" call-to-action when the user has no tasks recorded for the current week or month window; it MUST display real weekly and monthly stats once at least one task exists in that window.
- **FR-002a**: The analytics stats MUST report (a) completed-vs-planned task count/rate and (b) total focused Pomodoro time (counted only for sessions that started and ended), each broken down by task category.
- **FR-002b**: Task categories MUST come from a fixed preset: Others, Study Mode, Job Application Mode, Work. Each user MUST be able to choose which of these categories are relevant to them (e.g., a user who isn't job-hunting can disable Job Application Mode); disabled categories MUST NOT appear as options when creating new tasks. Disabling a category MUST NOT retroactively hide it from the analytics breakdown — a week/month window that already has data recorded under a since-disabled category MUST continue to show that data.
- **FR-003**: The calendar MUST always show the current date/day, independent of whether any task data exists. Drill-down into a specific day from the calendar is explicitly out of scope for this feature.
- **FR-004**: The "Let's start" card MUST always render, independent of whether analytics has data. It MUST show the nearest **upcoming** incomplete task — scheduled at or after the current time of day — drawn strictly from today's own tasks (never from another day, even if today has none, and never a task whose time has already passed), and an appropriate empty message when today has no remaining incomplete tasks at or after now. Completed tasks MUST NOT be considered or shown by this card — once a task is marked complete, it is dropped from "Let's start" and its data instead feeds the analytics section (FR-002a).
- **FR-005**: The "Let's start" card MUST provide a control that begins a Pomodoro session for the displayed task.
- **FR-006**: The "Plan your day" call-to-action MUST open a task-creation flow (as a card or a dedicated page) where the user can add one or more tasks, each with a scheduled time and a category (from their enabled set), for a single 24-hour day. The flow MUST require a distinct scheduled time per task within that day and reject a save that would create a duplicate.
- ~~**FR-007**: Users MUST be able to replicate the task list they just created across each of the coming 7 days from the same flow.~~ **Removed 2026-10-12** — replicate (and its paired "unreplicate" undo) was built, then removed at the user's request in favor of the per-day "Copy into this day" flow (copy from the previous day, or from any previously-planned day) added when the calendar became clickable. See the later Pomodoro/dashboard-enhancements work for that replacement.
- **FR-008**: Users MUST be able to copy a previous day's task list onto another day as the starting point for planning, instead of creating tasks from nothing.
- **FR-009**: When copying tasks onto a day that already has tasks, the system MUST ask for confirmation before overwriting, and MUST leave the target day unchanged if the user declines. (Originally also covered replicate; moot since FR-007's removal.)
- **FR-010**: Saving a "Plan your day" session with no tasks added MUST NOT create data that would cause the analytics section to treat the day as having task activity.
- **FR-011**: All task, plan, and copy operations MUST be scoped to the authenticated user's own data; a user MUST NOT be able to view or affect another user's tasks or plans.
- **FR-012**: Among today's remaining incomplete tasks scheduled at or after the current time, the "Let's start" card MUST show the one with the earliest scheduled time (i.e., the very next thing up). Since only current-or-future tasks are ever candidates (FR-004), there is no past-vs-future tie to resolve — the earliest qualifying time wins outright.

### Key Entities

- **Task**: A single planned activity for a specific day, with a scheduled time of day, a title/description, a category, and a completion/session state. Belongs to one user and one calendar day.
- **Task Category**: One of a fixed preset (Others, Study Mode, Job Application Mode, Work) that a task is classified under; drives the analytics breakdown. Each user has a per-account set of enabled categories.
- **Day Plan**: The set of tasks a user has scheduled for one calendar date. Used to determine whether that day "has task data" for analytics and for the "replicate"/"copy" operations, which act on this set as a unit.
- **Pomodoro Session**: A focused work session started against a specific task, initiated from the "Let's start" card, with a start and end time. (Session mechanics beyond "can be started from here" are covered by the existing Pomodoro capability; only its start/end timestamps are consumed here to compute focused-time stats.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user with zero tasks sees a clear next step (the "Plan your day" call-to-action) instead of a blank or broken-looking analytics area, on 100% of first dashboard visits.
- **SC-002**: A user can go from the empty-state prompt to having a fully planned day of tasks saved in under 2 minutes.
- **SC-003**: A user planning a typical week can populate all 7 days using the replicate/copy options in at most 2 additional actions beyond planning the first day (i.e., they do not need to re-enter tasks manually for each day).
- **SC-004**: On any dashboard visit, the task shown in the "Let's start" card is the correct nearest-upcoming task for the current time in 100% of cases where a remaining task exists.
- **SC-005**: The calendar and "Let's start" card remain visible and functional on 100% of dashboard visits regardless of whether the user has any task or analytics data.

## Assumptions

- "Week" and "month" windows for analytics use the calendar week/month containing the current date; weeks run Monday–Sunday. No user-configurable reporting period is in scope for this feature.
- The task-creation flow ("Plan your day") needs to capture a title, a scheduled time, and a category per task for this feature; richer task metadata (goal linking, notes, priority) is handled by the existing/other task features and is not redefined here.
- New users start with all four categories enabled by default and can disable the ones that don't apply to them (e.g., Job Application Mode) from account/profile settings; where exactly that toggle lives in the UI is a plan-level decision, not a scope question.
- Real-time cross-tab sync is not required; reflecting newly planned tasks on next page load/refresh is sufficient.
- Day drill-down from the calendar (originally deferred) later became in-scope: clicking a date now switches the Plan-your-day form to that day (2026-10-12), used to drive the per-day copy flow — this is narrower than full day-view drill-down, just day selection.
