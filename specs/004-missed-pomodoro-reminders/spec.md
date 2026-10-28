# Feature Specification: Missed Pomodoro Start Reminders

**Feature Branch**: `004-missed-pomodoro-reminders`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Missed Pomodoro start email reminders: if a task has a scheduled start time (from the Plan Your Day timeline) and the user has not started a Pomodoro session for that task by the scheduled time, send a reminder email 5 minutes after the scheduled time, and a second reminder email 10 minutes after the scheduled time if a session still hasn't been started. No further reminders after the 10-minute one. If the user starts a Pomodoro session for the task at any point, no further reminders for that task are sent, even if a reminder window has already passed. Detection runs via periodic polling (GitHub Actions, per the project's free-tier scheduled-reminder-polling convention), not only while the user has the app open. Reminders are only sent for tasks scheduled for the current day and only while the task is not yet completed. Reuse the existing Gmail SMTP mailer for delivery."

## Clarifications

### Session 2026-10-26

- Q: When the server-side check (which has no browser to read a timezone from) decides whether a task is "today" and whether 5/10 minutes have passed, which timezone should it use for that user? → A: Opportunistically detect and store the browser's timezone into `reminderPreferences.timezone` every time the user loads the dashboard, falling back to UTC until first detected.
- Q: What exactly counts as "missed," confirmed → A: The user not opening/appearing in the app and not clicking "Let's start" (starting a Pomodoro session) for that task by the threshold — i.e. no Pomodoro session has been started for the task, which is what FR-001/FR-005 already specify. No change to those requirements; confirms the existing wording is correct.
- Q: If the periodic check is delayed (or this is its first run) long enough that a task's 10-minute threshold is already crossed before it's ever been checked, should it still get both reminder emails back-to-back, or just the most relevant one? → A: Send both the first and second reminder, back-to-back, in that order, the moment the check first sees both thresholds already crossed — no special-casing beyond the existing FR-002/FR-004 rules.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First missed-start reminder (Priority: P1)

A user plans a task for a specific time on their Plan Your Day timeline, but when that time arrives they haven't opened the app and haven't started a Pomodoro session for it. Five minutes after the scheduled time, they receive an email telling them they have a task they planned to start that they haven't started yet.

**Why this priority**: This is the core value of the feature — catching the moment a planned task is first missed, while re-engagement is still easy. Without this, the feature doesn't exist.

**Independent Test**: Schedule a task for a time in the near future, let that time pass by 5+ minutes without starting a Pomodoro session for it, and confirm exactly one reminder email arrives referencing that task.

**Acceptance Scenarios**:

1. **Given** a task scheduled for today at a specific time, with no Pomodoro session started against it, **When** 5 minutes have passed since that scheduled time, **Then** the user receives one reminder email naming the task and its scheduled time.
2. **Given** a task scheduled for later today, **When** its scheduled time has not yet arrived, **Then** no reminder email is sent for it.
3. **Given** a task the user marked done before its scheduled time arrived, **When** 5 minutes past that scheduled time elapse, **Then** no reminder email is sent for it.

---

### User Story 2 - Second missed-start reminder (Priority: P2)

If the user still hasn't started the task 10 minutes after its scheduled time (i.e. they missed or ignored the first reminder), they get one more email. This is the last nudge — no further reminders follow it.

**Why this priority**: Extends the core behavior with a second chance for someone who missed the first email, without turning into spam. It depends on User Story 1's detection mechanism already existing, so it ships second.

**Independent Test**: Let a scheduled task's time pass by 10+ minutes with no Pomodoro session ever started for it, and confirm a second, distinct reminder email arrives (in addition to the first) and that no third email ever follows.

**Acceptance Scenarios**:

1. **Given** a task whose first (5-minute) reminder was already sent and which still has no Pomodoro session started against it, **When** 10 minutes have passed since its scheduled time, **Then** the user receives a second reminder email for that task.
2. **Given** a task whose second (10-minute) reminder was already sent, **When** any further time passes with the task still not started, **Then** no additional reminder email is ever sent for that task.

---

### User Story 3 - Starting the task silences further reminders (Priority: P3)

A user gets the first missed-start reminder, then actually starts a Pomodoro session for that task a couple of minutes later. They should not receive the second (10-minute) reminder for a task they've already started, even though the 10-minute mark hasn't arrived yet when they start it.

**Why this priority**: Confirms the feature doesn't nag someone who has already acted — essential for the feature to feel helpful rather than annoying, but only observable once Story 1 (and ideally Story 2) exist.

**Independent Test**: Trigger the first reminder for a task, then start a Pomodoro session for that same task before the 10-minute mark, and confirm no second reminder email ever arrives for it.

**Acceptance Scenarios**:

1. **Given** a task whose first reminder was already sent, **When** the user starts a Pomodoro session for that task before the 10-minute mark, **Then** no second reminder email is sent for that task.
2. **Given** a task that has never had a reminder sent yet, **When** the user starts a Pomodoro session for it before the 5-minute mark, **Then** no reminder email is ever sent for that task.

---

### Edge Cases

- A task has no scheduled time (unscheduled / backlog-style task): it's never eligible for a reminder, since there's no scheduled time to measure "missed" against.
- A task's scheduled time is edited (moved earlier or later) after it was originally planned: the reminder windows are evaluated against whatever the scheduled time currently is at the time of each check, not the original value.
- The user deletes a task before either reminder fires: no reminder is sent for a task that no longer exists.
- The user has multiple tasks that are all missed around the same time: each task is evaluated and reminded independently — one task's reminder never substitutes for another's.
- The periodic check that looks for missed tasks doesn't run at the exact 5:00 or 10:00 minute mark (it runs on a fixed interval): the first check that happens at or after each threshold sends that reminder — reminders are not required to fire at the exact minute, only promptly after the threshold is crossed.
- The periodic check is delayed, was down, or this is its very first run, such that a task's 10-minute threshold is already crossed before the task has ever been checked: the system sends both the first and second reminder, back-to-back in that order, in that same check — it never skips the first reminder just because the second is also already due, and it never sends more than these two.
- A task is scheduled for today but today's date rolls over to tomorrow before its reminders are evaluated (e.g. a task scheduled very late at night): once it's no longer "today" for that user, it stops being eligible for either reminder it hasn't already received.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST identify, on an ongoing basis, tasks that are scheduled for the current day, are not yet completed, have a scheduled time that is now at least 5 minutes in the past, and have no Pomodoro session started against them.
- **FR-002**: For each task newly matching FR-001's condition, the system MUST send exactly one "first reminder" email to the task owner, and MUST NOT send a second first-reminder email for the same task.
- **FR-003**: The system MUST identify tasks matching FR-001's condition where the scheduled time is now at least 10 minutes in the past, and where the first reminder has already been sent.
- **FR-004**: For each task newly matching FR-003's condition, the system MUST send exactly one "second reminder" email to the task owner, and MUST NOT send any further reminder email for that task afterward.
- **FR-005**: The moment a Pomodoro session is started for a task, the system MUST stop sending any reminder (first or second) for that task from that point forward, regardless of whether a reminder window has already been crossed.
- **FR-006**: The system MUST NOT send a reminder for a task once that task is marked completed, even if a reminder window was already crossed before it was completed.
- **FR-007**: The system MUST NOT send a reminder for a task that has no scheduled time.
- **FR-008**: The system MUST evaluate "scheduled for the current day" and the 5-/10-minute thresholds in a way that is independent of whether the user currently has the app open — detection MUST continue to run on a recurring schedule regardless of user activity.
- **FR-009**: Each reminder email MUST identify which task it refers to and its scheduled time, so the user can tell at a glance what they missed.
- **FR-010**: Reminder emails MUST be delivered through the product's existing email-sending mechanism (no new delivery channel introduced).
- **FR-011**: The system MUST NOT send a reminder email to any user other than the owner of the task in question.
- **FR-012**: The system MUST determine "scheduled for the current day" and the 5-/10-minute thresholds using each user's own local timezone rather than a single fixed timezone, so a task's "missed" status reflects the user's own clock, not the detection job's.
- **FR-013**: The system MUST opportunistically capture each user's local timezone from their browser whenever they load the dashboard, storing it for use by the detection job, and MUST fall back to UTC for a user whose timezone has never yet been captured.
- **FR-014**: If a task's 10-minute threshold (FR-003) is already crossed the first time the task is ever checked — whether due to detection delay, downtime, or this being the feature's first run — the system MUST still send the first reminder (FR-002) immediately followed by the second reminder (FR-004) in that same check, rather than skipping the first or sending only one.

### Key Entities

- **Planned Task**: An existing entity (already part of the product) representing a user's task with a scheduled time; this feature reads its scheduled time, completion status, and owner, but does not change its shape.
- **Pomodoro Session**: An existing entity representing a focus/break period started against a specific task; this feature reads whether one exists for a given task, but does not change its shape.
- **Reminder Record**: A new record of which reminder stage (first or second) has been sent for a given task, so the system never sends the same stage twice and can tell the difference between "not yet due," "first reminder sent," and "second reminder sent."

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user who misses a scheduled task receives the first reminder email within a short, bounded delay after the 5-minute mark (practically, within one detection cycle), without having to open the app.
- **SC-002**: A user who starts a task's Pomodoro session at any point never receives a reminder email for that task afterward — 0% false-positive reminders after a task is started.
- **SC-003**: No task ever receives more than two reminder emails in total, regardless of how long it remains unstarted.
- **SC-004**: No task ever receives a reminder email referencing a different user's task, or is sent to anyone other than the task's owner.
- **SC-005**: Tasks with no scheduled time, tasks already completed, and tasks scheduled for a day other than today never generate a reminder email.

## Assumptions

- Any task with a scheduled time is eligible for these reminders, regardless of its category — no category is special-cased out.
- "Started a Pomodoro session for the task" means at least one Pomodoro session exists that is linked to that specific task, regardless of whether that session is later paused, completed, or abandoned — starting it is what silences future reminders, not finishing it.
- "Not yet completed" refers to the task's own completion status at the moment each check runs.
- Detection runs on a recurring interval (handled by scheduled polling, per the project's established free-tier convention) rather than firing at the exact instant a threshold is crossed; "5 minutes" and "10 minutes" are the minimum delay before a reminder is eligible to send, not a precise firing instant.
- Editing a task's scheduled time after a reminder has already been sent for it does not retract or reset that already-sent reminder; only starting a session or marking it done silences further reminders.
- "Current day" is evaluated per the user's own local day boundary, using a timezone captured opportunistically from their browser on dashboard load (see FR-012/FR-013) rather than the detection job's own timezone. A user who has never opened the dashboard since this feature shipped is treated as UTC until their first visit captures their real timezone.
- This feature ships as always-on for every user with a verified account; no user-facing setting to disable these reminder emails is in scope for this version (the product's existing but unused reminder-preferences data is not surfaced in the UI by this feature).
- Email delivery failures (e.g. the mailer being temporarily unavailable) are treated as best-effort — a failed send is not retried mid-cycle, since the next detection cycle naturally re-evaluates any task still missing both its reminders. A task that already received its first reminder but whose second reminder failed to send is not treated as "caught up"; the next cycle still attempts it.
