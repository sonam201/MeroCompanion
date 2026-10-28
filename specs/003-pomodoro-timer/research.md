# Phase 0 Research: Pomodoro Timer

No `NEEDS CLARIFICATION` markers remain from `spec.md` (both were resolved in `/speckit-clarify`).
This covers the implementation-approach decisions the plan needs that the spec deliberately left
open.

## 1. Countdown correctness across reload

**Decision**: The client never stores "seconds remaining" as its own decrementing state. Instead it
computes `remaining = periodStartedAt + plannedMinutes*60000 - Date.now()` fresh on every tick (and
on first render). `periodStartedAt` comes from the DB (`pomodoro_sessions.started_at`), read once
when the active period loads.

**Rationale**: Directly satisfies FR-002/SC-001. A decrementing local counter would drift under
background-tab throttling (browsers slow `setInterval` in inactive tabs) and would reset to the full
duration on reload since it lives only in React state. Recomputing from a fixed timestamp is immune
to both problems by construction.

**Alternatives considered**: Server-sent events / polling an endpoint every second to push "seconds
remaining" — rejected as unnecessary infrastructure (Free-Tier-First/Simplicity) for a value the
client can derive itself from one timestamp it already has.

## 2. Single running period per user (FR-009a)

**Decision**: Enforced inside the `startPomodoroForTask` action (extended to accept `kind`). Before
inserting a new period row, query for any existing row for the user with `ended_at IS NULL`. If it
belongs to the same task, return that existing row instead of creating a new one (FR-009). If it
belongs to a different task, set its `ended_at = now()` first (ending it, preserving its elapsed
time per FR-008), then insert the new period.

**Rationale**: Matches the spec's chosen behavior exactly (auto-stop-the-other-one, no separate
confirmation step) and keeps the rule in the one place new periods get created.

**Alternatives considered**: A separate "is anything running" pre-check action the client calls
before deciding whether to show a confirmation dialog — rejected; the spec explicitly chose
automatic stop-and-switch over a confirmation step, so there's nothing for a dialog to ask.

## 3. Distinguishing focus from break for analytics (FR-012)

**Decision**: Add a `pomodoro_kind` enum (`focus`, `break`) and a `pomodoro_sessions.kind` column,
`NOT NULL DEFAULT 'focus'`. The dashboard's existing focused-minutes query (`getDashboardAnalytics`
in feature 002) adds `WHERE kind = 'focus'` to its Pomodoro-time sum.

**Rationale**: The existing table already has exactly the shape a period needs (`started_at`,
`ended_at`, `taskId`, `userId`); the only thing missing is a way to tell a focus row from a break
row. A new column is the minimal change; defaulting existing rows to `'focus'` is correct since
every row created before this feature came from 002's original (focus-only) `startPomodoroForTask`.

**Alternatives considered**: A separate `pomodoro_breaks` table — rejected, doubles the schema and
every query that needs "all periods for a task" for no benefit over one column.

## 4. Natural completion vs. early stop

**Decision**: One action, `endPomodoroPeriod({ periodId })`, sets `ended_at = now()`. It's called
both when the client detects the countdown has reached zero and when the user clicks "Stop" mid-way.

**Rationale**: The spec's tolerance ("within a few seconds", SC-001) means the small gap between the
mathematically exact zero-point and the moment the client's tick fires and the request lands is
immaterial. One action for both cases avoids branching logic for no measurable accuracy gain.

**Alternatives considered**: Two actions (`completePeriod` computing `ended_at` as the exact planned
end time vs. `stopPeriod` using `now()`) — rejected as needless precision the spec doesn't ask for.

## 5. The ring/alert sound

**Decision**: Generate a short tone with the Web Audio API (`OscillatorNode`) at the moment a period
ends, rather than shipping an audio file.

**Rationale**: Zero new dependencies and zero binary assets to commit (Free-Tier-First/Simplicity).
Every evergreen browser supports the Web Audio API. The visual "done" state (FR-010) is the
authoritative signal regardless of whether sound plays, so a generated tone is sufficient — it
doesn't need to be a polished audio asset.

**Alternatives considered**: An `<audio>` element with a bundled MP3/WAV — rejected as an added
asset for a one-off beep the Web Audio API already covers natively.

## 6. "Offer to start the next phase" persistence

**Decision**: Not persisted as its own state. Once a period's `ended_at` is set, there is no
"running" period; the offer to start the next phase (break, or another focus round) is transient
client UI state tied to having just observed that transition. If the user navigates away before
acting on it and comes back later, they simply see the normal "no running period" dashboard state
(today's next-up task, from feature 002) rather than a remembered "you were about to start a break"
prompt.

**Rationale**: The spec's Assumptions explicitly don't require this to survive — "no fixed number of
cycles," user can stop or resume the rhythm at will. Persisting the offer would need a new concept
(a period that's "over but pending a decision") for a UX nicety the spec doesn't ask for.

**Alternatives considered**: Persist a "pending next phase" flag on the task — rejected, adds a new
piece of state for behavior the spec doesn't require to survive a reload.
