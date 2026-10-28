# Implementation Plan: Pomodoro Timer

**Branch**: `003-pomodoro-timer` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-pomodoro-timer/spec.md`

## Summary

Turn the dashboard's existing "Start Pomodoro" button into a real timer: a focus countdown that
survives reload (derived from the period's DB-recorded start time, not client memory), an audible
ring + visual done-state when it hits zero, an offered transition into a break period and back into
another focus round, and an early-stop control. Reuses the existing `pomodoro_sessions` table and
the `startPomodoroForTask` action from feature 002 (extended, not duplicated) rather than
introducing a parallel mechanism. One schema addition (a `kind` column distinguishing focus from
break) is needed so break time can be excluded from the dashboard's focused-minutes analytics per
Clarification 2026-09-30.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router)

**Primary Dependencies**: None new. The countdown is derived client-side from a server-recorded
timestamp (no polling/websocket needed for correctness); the ring is a short tone generated with
the browser's native Web Audio API — no audio asset file or npm package required.

**Storage**: Neon Postgres via Drizzle. Adds a `pomodoro_kind` enum (`focus`, `break`) and a
`pomodoro_sessions.kind` column, `NOT NULL DEFAULT 'focus'` (existing rows, all created by 002's
`startPomodoroForTask`, are focus periods). No new tables.

**Testing**: Manual verification via `quickstart.md`, consistent with features 001/002. No
automated test suite is configured in this project; `npm run build` and `npm run lint` remain
mandatory gates.

**Target Platform**: Web browser (desktop + mobile viewport), same Next.js app

**Project Type**: Web application — single Next.js project (no separate frontend/backend split)

**Performance Goals**: Countdown display accurate to within a few seconds of true remaining time
(SC-001) — achieved by recomputing `remaining = startedAt + plannedMinutes - Date.now()` on every
tick rather than decrementing a stored counter, so background-tab throttling can't cause drift.

**Constraints**: No new runtime dependencies; only one running period per user account-wide
(FR-009a); all period reads/writes scoped to the authenticated session's `userId`; break time must
never be added into the existing focused-minutes analytics query (FR-012).

**Scale/Scope**: One schema change (enum + column), two server action changes (extend
`startPomodoroForTask` to accept a `kind` and enforce the single-running-period rule; add one
`endPomodoroPeriod` action used for both natural completion and early stop), one new query
(`getActivePeriod`), a reworked `lets-start-card.tsx` plus a new small timer component and a tiny
sound helper. No new routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Free-Tier-First | PASS | No new services, no new npm packages — Web Audio API is browser-native |
| II. Web-First MVP Scope | PASS | This is exactly "Pomodoro: per-task timer, configurable focus/break length" from `ARCHITECTURE.md`'s MVP scope |
| III. Explicit Per-User Authorization | PASS (enforced in design) | Every action/query re-derives `userId` from the session; a period never resolves across users |
| IV. Progressive Passwordless-to-Password Auth | N/A | Unrelated to auth |
| V. Simplicity/YAGNI | PASS | Extends 002's existing action/table instead of parallel new ones; one `endPomodoroPeriod` action covers both natural completion and early stop; "offer to start next phase" is kept as transient client state rather than a new persisted concept (spec doesn't require it to survive reload) |

No violations. Complexity Tracking table omitted.

**Post-design re-check (after Phase 1)**: Still PASS on all rows — `data-model.md` and
`contracts/server-actions.md` introduced nothing beyond the single planned schema change.

## Project Structure

### Documentation (this feature)

```text
specs/003-pomodoro-timer/
├── plan.md                  # This file
├── research.md              # Phase 0 output
├── data-model.md            # Phase 1 output
├── contracts/
│   └── server-actions.md    # Phase 1 output
└── quickstart.md            # Phase 1 output
```

### Source Code (repository root)

```text
src/
├── app/dashboard/
│   └── actions.ts                       # Extend startPomodoroForTask(taskId, kind?); add
│                                         # endPomodoroPeriod(periodId)
├── components/dashboard/
│   ├── lets-start-card.tsx              # Reworked: shows the running/just-finished period's
│   │                                     # timer UI when one exists, else today's existing
│   │                                     # "next up task" behavior from 002 (unchanged)
│   └── pomodoro-timer.tsx               # New: countdown display, ring-on-zero, stop control,
│                                         # "start break"/"start next focus" offer
└── lib/dashboard/
    ├── queries.ts                       # Add getActivePeriod(userId); update the analytics
    │                                     # focused-minutes query to filter kind = 'focus'
    └── pomodoro-sound.ts                # New: tiny Web Audio API beep helper, no asset file

drizzle/                                 # New migration: pomodoro_kind enum + pomodoro_sessions.kind
```

**Structure Decision**: Single Next.js project (unchanged pattern from 001/002). All new logic lives
alongside the existing dashboard feature's files rather than a separate "pomodoro" route, since the
timer only ever appears inside the dashboard's "Let's start" card per the spec.

## Complexity Tracking

*No constitution violations — table not needed.*
