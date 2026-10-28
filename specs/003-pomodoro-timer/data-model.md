# Phase 1 Data Model: Pomodoro Timer

## New: `pomodoro_kind` enum

```
focus | break
```

## Modified: `pomodoro_sessions`

Existing table (`src/lib/db/schema.ts`, introduced in feature 002); this feature adds one column.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | unchanged |
| `userId` | text, FK → `users.id` | unchanged |
| `taskId` | uuid, FK → `tasks.id` | unchanged |
| `startedAt` | timestamp with tz, default now() | unchanged — this is what the client derives the countdown from (FR-002) |
| `endedAt` | timestamp with tz, nullable | unchanged. `NULL` = still running (drives FR-009/FR-009a's "is anything running" check); set = period is over, either naturally (reached zero) or stopped early (FR-007/FR-008) — this feature doesn't need to distinguish which, per research.md §4 |
| `plannedFocusMin` | integer, default 25 | unchanged — a fixed app-wide default (not per-task), read when `kind = 'focus'` to compute the countdown duration |
| `plannedBreakMin` | integer, default 5 | unchanged — a fixed app-wide default (not per-task), read when `kind = 'break'` |
| `completed` | boolean, default false | unchanged, not used by this feature (pre-existing column from 002's original schema; left as-is) |
| **`kind`** | **enum `pomodoro_kind`, `NOT NULL`, default `'focus'`** | **New**. Distinguishes a focus period from a break period. Existing rows default to `'focus'` (correct — they all came from 002's focus-only action). Drives FR-012 (only `kind = 'focus'` rows count toward focused-minutes analytics). |

**Validation rules** (enforced in the server action, not DB constraints — consistent with how 002
handled its own per-day rules):
- A user may have at most one row with `endedAt IS NULL` at any time (FR-009a) — enforced by
  ending any other open row before inserting a new one, not by a DB constraint.
- `kind` is set at creation time from which control the user clicked ("Start Pomodoro" → `focus`,
  "Start break" → `break`, "Start another focus round" → `focus`) and never changes afterward.

**State transition**: `startedAt` set at creation → `endedAt IS NULL` while running → `endedAt` set
(via `endPomodoroPeriod`) once complete or stopped. No other states.

## Read shape used by the UI

```ts
type ActivePeriod = {
  id: string;
  taskId: string;
  taskTitle: string;
  kind: "focus" | "break";
  startedAt: Date;
  plannedMinutes: number; // plannedFocusMin or plannedBreakMin, whichever matches kind
};
```

Produced by `getActivePeriod(userId)` — the single row (if any) with `endedAt IS NULL` for that
user, joined to its task for the title. `null` when nothing is running.
