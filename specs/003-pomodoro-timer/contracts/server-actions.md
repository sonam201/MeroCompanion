# Contracts: Server Actions

Both live in `src/app/dashboard/actions.ts` alongside the existing 002 actions. Every action
re-derives `userId` from `auth()` server-side (Constitution III).

## `startPomodoroForTask` (extended from feature 002)

```ts
type StartPomodoroForTaskInput = {
  taskId: string;
  kind?: "focus" | "break"; // defaults to "focus"
};

type StartPomodoroForTaskResult =
  | { ok: true; period: { id: string; startedAt: string; kind: "focus" | "break" } }
  | { ok: false; error: "not_found" | "already_completed" };
```

- Unchanged from 002 for the `not_found`/`already_completed` checks.
- **New behavior**:
  1. Look up the caller's currently running period (`endedAt IS NULL`), if any, across all tasks.
  2. If it belongs to `taskId` and matches the requested `kind`, return it as-is (FR-009 — resume,
     don't duplicate).
  3. If it belongs to a *different* task (or the same task but a different `kind` — e.g., resuming
     "Start Pomodoro" after a break offer without having started the break), end it
     (`endedAt = now()`) first (FR-009a, FR-008 — elapsed time preserved), then proceed.
  4. Insert a new row with `kind` (default `"focus"`), `startedAt = now()`.
- The result's `period.startedAt` is what the client uses to derive the countdown (research.md §1).

## `endPomodoroPeriod` (new)

```ts
type EndPomodoroPeriodInput = { periodId: string };

type EndPomodoroPeriodResult = { ok: true } | { ok: false; error: "not_found" };
```

- Sets `endedAt = now()` on a period owned by the caller that isn't already ended.
- Used for both natural completion (client calls it the moment its countdown reaches zero) and
  early stop (client calls it when the user clicks "Stop") — research.md §4.
- `not_found` covers both a nonexistent/not-owned id and a period that's already ended (idempotent
  no-op from the caller's point of view — the UI never expects this to matter since it only ever
  calls this once per period).

## Read paths (query helpers, not actions)

`src/lib/dashboard/queries.ts`:

- `getActivePeriod(userId)` → the `ActivePeriod` shape from `data-model.md`, or `null`. Read on
  dashboard load so a running timer survives reload (FR-002) and so two tabs derive the same
  countdown from the same `startedAt` (edge case in spec.md).
- `getDashboardAnalytics(userId)` (from 002) — **modified**: its focused-minutes sum now filters
  `pomodoro_sessions.kind = 'focus'` (FR-012). Its task-completion counts are unaffected (they read
  from `tasks.status`, not `pomodoro_sessions`).
