# Phase 1 Data Model: Plan-Your-Day Dashboard

## Modified: `tasks`

Existing table (`src/lib/db/schema.ts`); this feature changes one column.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | unchanged |
| `userId` | text, FK → `users.id` | unchanged |
| `goalId` | uuid, FK → `goals.id`, nullable | unchanged |
| `title` | text | unchanged |
| `description` | text, nullable | unchanged |
| `status` | enum `task_status` (`todo`, `in_progress`, `done`) | unchanged. `done` = "completed" per spec Clarification Q2 — excluded from "Let's start", counted in analytics |
| `priority` | enum `task_priority` | unchanged, not used by this feature |
| ~~`tag`~~ → **`category`** | ~~enum `task_tag`~~ → **enum `task_category`** (`other`, `study`, `job_application`, `work`) | **Changed**. `NOT NULL`, default `'other'` — every task must have a category (FR-006); no longer nullable since the "Plan your day" form always collects one |
| `scheduledAt` | timestamp with tz | unchanged column, now load-bearing: date part = which day plan a task belongs to; time part = the per-day distinct-time rule (Clarification Q4) and the "nearest upcoming" ordering — at-or-after now only (FR-004, FR-012) |
| `dueAt` | timestamp with tz, nullable | unchanged, not used by this feature |
| `estimatedPomodoros` | integer | unchanged, not used by this feature |
| `createdAt`, `updatedAt` | timestamp with tz | unchanged |

**Validation rules** (enforced in server actions, not DB constraints — see `research.md` §4):
- `category` must be one of the caller's currently-enabled categories (FR-002b).
- No two tasks for the same `userId` may share the same calendar day + exact `scheduledAt` time
  (Clarification Q4).
- A "Plan your day" save with zero tasks must not write a row that would make that day count as
  "has task data" (FR-010) — trivially satisfied by not writing anything when the list is empty.

**State transition**: `status` moves `todo` → `in_progress` (optional, when a Pomodoro session
starts) → `done` (completion). Once `done`, a task is permanently excluded from "Let's start"
candidate selection (Clarification Q2) and is counted as "completed" in analytics (FR-002a).

## New: `task_category` enum

```
other | study | job_application | work
```

Fixed preset per Clarification Q1 — not user-extensible.

## Modified: `users`

| Field | Type | Notes |
|---|---|---|
| ...existing columns... | | unchanged |
| **`enabledTaskCategories`** | **text[], `NOT NULL`, default `{other,study,job_application,work}`** | **New**. Per-account subset of `task_category` values the user has opted into (FR-002b). Drives both which categories appear in the "Plan your day" form and which series appear in the analytics chart. |

## Unchanged, reused: `pomodoro_sessions`

Read (not written to, beyond the new minimal "start" action) by this feature's analytics
aggregation:

| Field used | Purpose here |
|---|---|
| `taskId` | joins to `tasks.category` for the per-category breakdown |
| `startedAt`, `endedAt` | `endedAt - startedAt` summed per category = "total focused Pomodoro time" (FR-002a). Only rows where `endedAt IS NOT NULL` count — an abandoned/never-ended session contributes nothing (research.md §6). |

## Derived concept: Day Plan

Not a table. For a given `userId` and calendar date, the Day Plan is:

```sql
SELECT * FROM tasks
WHERE user_id = :userId
  AND date_trunc('day', scheduled_at) = :date
ORDER BY scheduled_at;
```

- **"Has task data"** (drives the analytics empty state, FR-002) = at least one task row exists
  within the current Monday–Sunday week or calendar month window.
- **Replicate** (FR-007) = for each of the next 7 calendar days after the planned day, insert a copy
  of each task in the source Day Plan with `scheduledAt` shifted to that target date (same
  time-of-day), subject to the overwrite rule (research.md §5).
- **Copy** (FR-008) = same insert logic, but the source is an arbitrary prior Day Plan the user
  picks, and there's exactly one target date.

## Analytics aggregate shape (read model, not a stored entity)

Computed per request in `src/lib/dashboard/queries.ts`, shape consumed by
`analytics-section.tsx`/`weekly-monthly-chart.tsx`:

```ts
type CategoryStat = {
  category: "other" | "study" | "job_application" | "work";
  tasksCompleted: number;
  tasksPlanned: number;
  focusedMinutes: number; // sum of ended_at - started_at across pomodoro_sessions, minutes
};

type AnalyticsWindow = {
  rangeStart: string; // ISO date
  rangeEnd: string;   // ISO date
  hasAnyTaskData: boolean; // drives empty-state vs. chart
  byCategory: CategoryStat[]; // the user's currently-enabled categories, PLUS any disabled
                              // category that still has data in this window (FR-002b) — disabling
                              // only removes a category from future task creation, never from
                              // historical analytics
};

type DashboardAnalytics = {
  week: AnalyticsWindow;  // Monday–Sunday containing today
  month: AnalyticsWindow; // calendar month containing today
};
```
