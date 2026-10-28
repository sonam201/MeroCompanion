# Contracts: Server Actions

All actions live in `src/app/dashboard/actions.ts` (`"use server"`), matching the existing
`src/lib/auth-actions.ts` pattern. Every action re-derives `userId` from `auth()` server-side — the
client never supplies it (Constitution III).

## `createDayPlan`

```ts
type CreateDayPlanInput = {
  date: string; // ISO date, the day being planned
  tasks: Array<{
    title: string;
    time: string;     // "HH:mm", 24h, must be distinct within this request
    category: TaskCategory; // must be in the caller's enabledTaskCategories
  }>;
};

type CreateDayPlanResult =
  | { ok: true; created: number }
  | { ok: false; error: "duplicate_time" | "disabled_category" | "empty" };
```

- `tasks: []` → `{ ok: false, error: "empty" }`, no write (FR-010).
- Duplicate `time` within the input array, or against an existing task already on that date → no
  partial write; whole request rejected with `duplicate_time` (Clarification Q4).
- Any `category` not in the caller's `enabledTaskCategories` → rejected with `disabled_category`
  (FR-002b) — never silently dropped or coerced.

## `replicateDayPlan`

```ts
type ReplicateDayPlanInput = {
  sourceDate: string; // the day plan to copy forward
  overwrite?: boolean; // default false
};

type ReplicateDayPlanResult =
  | { ok: true; writtenDates: string[] }
  | { ok: false; conflictDates: string[] }; // only when overwrite is false/omitted
```

- Targets: the 7 calendar days immediately following `sourceDate` (FR-007, Assumption).
- `overwrite: false` (default) + any target date already has tasks → no writes; returns
  `conflictDates` so the client can confirm (FR-009, research.md §5).
- `overwrite: true` → existing tasks on conflicting target dates are replaced (delete + recreate);
  non-conflicting target dates are written normally.

## `copyDayPlan`

```ts
type CopyDayPlanInput = {
  sourceDate: string;
  targetDate: string;
  overwrite?: boolean; // default false
};

type CopyDayPlanResult =
  | { ok: true }
  | { ok: false; conflict: true }; // targetDate already has tasks and overwrite was false
```

- Same overwrite semantics as `replicateDayPlan`, single target (FR-008, FR-009).

## `toggleTaskCategory`

```ts
type ToggleTaskCategoryInput = {
  category: TaskCategory;
  enabled: boolean;
};

type ToggleTaskCategoryResult = { ok: true; enabledTaskCategories: TaskCategory[] };
```

- Updates `users.enabledTaskCategories` for the calling user (FR-002b). Disabling a category only
  removes it from the "Plan your day" category picker going forward — it does not hide historical
  data already recorded under it from the analytics breakdown (FR-002b).

## `startPomodoroForTask`

```ts
type StartPomodoroForTaskInput = { taskId: string };

type StartPomodoroForTaskResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: "not_found" | "already_completed" };
```

- Creates a `pomodoro_sessions` row (`startedAt = now()`) for a task owned by the caller (FR-005).
- Rejects `taskId`s that don't belong to the caller or don't exist (`not_found`) and tasks already
  `status: "done"` (`already_completed`).
- Out of scope: pausing, ending, or otherwise managing the session afterward — that's the full
  Pomodoro-timer feature (research.md §9), not this one.

## `completeTask` (added during implementation, not in the original design pass)

```ts
type CompleteTaskInput = { taskId: string };

type CompleteTaskResult = { ok: true } | { ok: false; error: "not_found" };
```

- Sets `status: "done"` on a task owned by the caller and closes out any still-open Pomodoro
  session for it (`endedAt = now()` where previously null), so its focused time is captured.
- Added because "Let's start" is the only task-facing UI this feature builds, and no other
  task-completion control exists anywhere in the app yet (full task-list CRUD is a separate,
  not-yet-built feature). Without this, Clarification Q2's behavior ("completed tasks drop out of
  Let's start and feed analytics instead") would have no way to be triggered or demonstrated.

## Read paths (not actions — server component + query helpers)

`src/lib/dashboard/queries.ts` exposes plain async functions (no client-callable boundary needed,
called directly from the dashboard server component):

- `getTodayLetsStartTask(userId)` → the nearest **upcoming** incomplete task for today (scheduled
  at or after now; overdue incomplete tasks are excluded) per FR-004/FR-012, or `null`.
- `getDashboardAnalytics(userId)` → `DashboardAnalytics` shape from `data-model.md`.
- `getEnabledTaskCategories(userId)` → `TaskCategory[]`.
