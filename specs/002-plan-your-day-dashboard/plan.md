# Implementation Plan: Plan-Your-Day Dashboard

**Branch**: `002-plan-your-day-dashboard` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-plan-your-day-dashboard/spec.md`

## Summary

Replace the current placeholder dashboard (`src/app/dashboard/page.tsx`) with three always-present
areas — an analytics/progress section, a compact current-date calendar, and a "Let's start" task
card — plus the "Plan your day" flow that creates the task data those areas depend on. The
analytics section shows an empty-state call-to-action until the user has any task in the current
week/month, then shows completed-vs-planned counts and total focused Pomodoro time, both broken
down by a fixed task-category preset the user can opt into per-account. No new npm dependencies:
charts are hand-built HTML/SVG per the dataviz skill, the calendar is a plain date-grid component,
and data access reuses the existing Drizzle/Neon/Auth.js/TanStack Query stack.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router)

**Primary Dependencies**: Next.js, Tailwind CSS v4, Drizzle ORM, Auth.js v5 (session lookup only —
no auth logic changes), TanStack Query (client-side refetch after mutations). No new packages.

**Storage**: Neon Postgres via Drizzle. Modifies `tasks` (`tag`/`task_tag` → `category`/
`task_category` enum) and `users` (adds `enabled_task_categories`); reuses `pomodoro_sessions`
unchanged. See `data-model.md`.

**Testing**: Manual verification via `quickstart.md`. No automated test suite is configured in the
project (consistent with feature 001); `npm run build` and `npm run lint` remain mandatory gates
per the constitution.

**Target Platform**: Web browser (desktop + mobile viewport), served by the existing Next.js app

**Project Type**: Web application — single Next.js project (no separate frontend/backend split)

**Performance Goals**: Standard web responsiveness; dashboard's server-rendered initial load should
feel instant on Neon's free tier (a cold Neon connection can add a few seconds — no numeric SLA
specified in the spec beyond that).

**Constraints**: No new runtime dependencies (Free-Tier-First/Simplicity); all task/plan/session
data access must filter by the authenticated session's `userId`; chart must follow the dataviz
skill's validated categorical palette and non-negotiables (no dual-axis, fixed hue order, legend +
labels).

**Scale/Scope**: One dashboard route, one new "Plan your day" flow (card or sub-route), a handful
of server actions (create day plan, replicate, copy, toggle category preference, start Pomodoro
session), two schema changes (no new tables).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Free-Tier-First | PASS | No new services, no new npm packages; reuses Neon/Drizzle/Resend-free stack unchanged |
| II. Web-First MVP Scope | PASS | This is exactly the "dashboard, task CRUD" MVP item from `ARCHITECTURE.md`'s next steps; no mobile/AI scope creep |
| III. Explicit Per-User Authorization | PASS (enforced in design) | Every new server action and query filters by `session.user.id`; task/day-plan/category-preference data is never trusted from client input for identity |
| IV. Progressive Passwordless-to-Password Auth | N/A | This feature doesn't touch sign-in/sign-up |
| V. Simplicity/YAGNI | PASS | Day Plan is a derived grouping, not a new table; category preference is a plain array column, not a join table; distinct-time rule is app-layer, not a DB expression index; no chart/calendar library added |

No violations. Complexity Tracking table omitted (not needed).

**Post-design re-check (after Phase 1)**: Still PASS on all rows above — `data-model.md` and
`contracts/server-actions.md` did not introduce anything requiring a new table, dependency, or
cross-user query path.

## Project Structure

### Documentation (this feature)

```text
specs/002-plan-your-day-dashboard/
├── plan.md                  # This file
├── research.md              # Phase 0 output
├── data-model.md            # Phase 1 output
├── contracts/
│   └── server-actions.md    # Phase 1 output — server action signatures/behavior
├── quickstart.md            # Phase 1 output
└── tasks.md                 # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── dashboard/
│       ├── page.tsx                      # Server component: loads today's incomplete tasks,
│       │                                  # analytics aggregates, enabled categories; composes
│       │                                  # the three sections below
│       ├── plan-day/
│       │   └── page.tsx                  # "Plan your day" flow (own route, linked from the
│       │                                  # empty-state CTA and from a "re-plan" affordance)
│       └── actions.ts                    # "use server" — createDayPlan, replicateDayPlan,
│                                          # copyDayPlan, toggleTaskCategory, startPomodoroForTask
├── components/
│   └── dashboard/
│       ├── analytics-section.tsx         # Empty state OR stats view (client, reacts to TanStack
│       │                                  # Query cache updates after planning)
│       ├── weekly-monthly-chart.tsx      # Hand-built SVG/HTML chart per dataviz skill
│       ├── category-legend.tsx           # Shared legend/label piece used by the chart
│       ├── month-calendar.tsx            # Plain date-grid, current day highlighted, no drill-down
│       ├── lets-start-card.tsx           # Nearest incomplete task + start-Pomodoro control
│       └── plan-day-form.tsx             # Task list editor + replicate/copy controls, used by
│                                          # plan-day/page.tsx
└── lib/
    └── dashboard/
        ├── queries.ts                    # Drizzle queries: today's tasks, week/month aggregates,
        │                                  # day-plan lookups by date range
        └── categories.ts                 # TASK_CATEGORIES constant + validation helpers shared
                                           # by server actions and UI

drizzle/                                  # New generated migration: task_category enum + column
                                           # rename, users.enabled_task_categories
```

**Structure Decision**: Single Next.js project (Option 1), matching feature 001. Dashboard-specific
UI lives under `src/components/dashboard/`, data/query helpers under `src/lib/dashboard/`, and all
new mutations are Server Actions co-located with the route in `src/app/dashboard/actions.ts` (same
pattern as `src/lib/auth-actions.ts`). No new API routes — Server Actions cover every mutation this
feature needs.

## Complexity Tracking

*No constitution violations — table not needed.*
