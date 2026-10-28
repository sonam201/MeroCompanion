# Phase 0 Research: Plan-Your-Day Dashboard

No `NEEDS CLARIFICATION` markers remain from `spec.md` (all five were resolved in
`/speckit-clarify`). This research covers the *implementation-approach* decisions the plan needs
that the spec deliberately left open (spec stays technology-agnostic).

## 1. Task categorization taxonomy

**Decision**: Replace the existing, unused `task_tag` enum (`application`, `interview_prep`,
`networking`, `skill_building`) on the `tasks` table with a new `task_category` enum (`other`,
`study`, `job_application`, `work`), and rename the column `tag` → `category`.

**Rationale**: The old tag values were scaffolded in the original schema/ARCHITECTURE.md pass but
no task-CRUD feature has ever been built against them — the column is unused in every environment.
The new categories from clarification directly generalize the old intent (job-search-specific tags)
to also serve non-job-seekers (Study Mode, Work, Other), which is what the spec now calls for.

**Alternatives considered**: Keep `tag` and add a second `category` column — rejected as duplicate
taxonomies on the same row with no distinct purpose (YAGNI); the old tag was never surfaced in any
UI, so there's nothing to preserve.

## 2. Per-user enabled-categories storage

**Decision**: Add `enabled_task_categories` as a Postgres text array column on `users`, defaulting
to all four category values.

**Rationale**: Matches the existing style of simple, denormalized per-user settings already used by
`reminder_preferences` (a jsonb blob on a single row per user). A max-four-value fixed set doesn't
need a join table.

**Alternatives considered**: A `user_task_categories` join table — rejected as unnecessary
normalization for a small, fixed, closed set of values (Simplicity/YAGNI).

## 3. Day Plan representation

**Decision**: "Day Plan" (per spec's Key Entities) is not a new table — it's the set of `tasks` rows
for a user where `date_trunc('day', scheduled_at)` equals the target date. Replicate/copy operate on
that derived grouping directly.

**Rationale**: Task rows already carry everything a "day plan" needs (`userId` + `scheduledAt`); a
separate table would just be a redundant grouping key with no attributes of its own.

**Alternatives considered**: An explicit `day_plans` table keyed by `(userId, date)` — rejected, adds
a join and a sync-keeping burden for zero new information.

## 4. Distinct-time-per-day enforcement

**Decision**: Enforced in the server actions (create/replicate/copy), not as a database constraint:
reject a write that would leave two tasks at the same `scheduledAt` time for the same user on the
same day.

**Rationale**: Keeps the rule in one reviewable place. A Postgres expression/partial unique index
for "same user, same calendar day, same time-of-day" is achievable but adds schema complexity for a
single-feature rule; a rare double-submit race is low-risk here and safely retryable.

**Alternatives considered**: DB-level unique expression index on `(user_id, scheduled_at)` — kept in
mind as a hardening option if double-submits become a real problem post-launch, not needed for v1.

## 5. Replicate/copy overwrite handling

**Decision**: Each of `replicateDayPlan` and `copyDayPlan` takes an `overwrite: boolean` (default
`false`). A call with `overwrite: false` that finds existing tasks on any target date performs no
writes and returns the list of conflicting dates; the client shows a confirmation dialog and retries
with `overwrite: true`, which deletes-then-recreates tasks only on the conflicting target dates.

**Rationale**: Matches FR-009 (ask before overwrite; no-op on decline) with a single action per
operation rather than a separate "check" endpoint plus a "commit" endpoint.

**Alternatives considered**: Two-step check/commit actions — rejected as an unnecessary extra round
trip; the single-action-with-flag pattern already gives the client everything it needs to decide.

## 6. Analytics aggregation

**Decision**: Computed server-side (in `src/lib/dashboard/queries.ts`), read directly by the
dashboard server component on initial load — completed-vs-planned task counts and summed Pomodoro
focused minutes (`ended_at - started_at` where `ended_at IS NOT NULL`), grouped by `category`, for
the Monday–Sunday week and the calendar month containing today. Because this read goes straight
through Drizzle (no API route makes it client-fetchable), a mutation's client-side success handler
calls Next.js's `router.refresh()` to re-run the server component in place, rather than maintaining
a parallel client-side query cache for the same data. TanStack Query is still used, but for mutation
state (`useMutation`'s pending/error/success) rather than as a data-fetching layer here.

**Rationale**: Matches the existing pattern in `src/app/dashboard/page.tsx` (already a server
component doing a direct Drizzle query); `router.refresh()` is the idiomatic App Router way to
reflect a server-side data change after a client mutation, and avoids standing up a redundant
client-side read path that would just duplicate the server query.

**Alternatives considered**: Fully client-fetched dashboard (TanStack Query from first paint) —
rejected; would lose the server-rendered fast-first-paint the existing dashboard already has, for no
benefit.

## 7. Chart rendering

**Decision**: Hand-built HTML/SVG bar chart per the dataviz skill (form → color → validated palette
→ marks → hover/legend), not a charting library.

**Rationale**: The chart here is a single grouped-bar view (task-category series over week/month
buckets) — well within what a plain HTML/SVG component handles per the skill's `components.md` and
`marks-and-anatomy.md` references. Avoids reintroducing the shadcn/Recharts dependency stack that
was reverted for being built outside the spec process; keeps the new-dependency count at zero
(Free-Tier-First/Simplicity).

**Alternatives considered**: Recharts (used in the reverted dashboard) — rejected, no new
dependency needed for a chart this simple, and the reverted work is exactly what this re-spec is
replacing.

## 8. Calendar component

**Decision**: Plain Tailwind/JS month-grid component — no date-picker library. Renders a static
7-column grid for the current month with today visually highlighted; no click/drill-down handlers.

**Rationale**: Spec (via clarification-era discussion and FR-003) explicitly limits scope to
"current date/day, no drill-down." Native `Date`/`Intl.DateTimeFormat` cover the month-grid math
needed; a picker library would be scope creep for a non-interactive display widget.

**Alternatives considered**: `react-day-picker` (used in the reverted dashboard) — rejected as
unnecessary for a display-only, non-interactive grid.

## 9. Pomodoro start action

**Decision**: The "Let's start" card's button creates a `pomodoro_sessions` row (`started_at =
now()`) for the task and shows an "in progress" indicator. Full timer UX (countdown, break cycles,
ending/completing the session) is a separate future feature, not built here.

**Rationale**: Matches the spec's own scope boundary (Key Entities: "session mechanics beyond 'can
be started from here'... not redefined by this feature"). Building a full timer now would be scope
creep relative to what `/speckit-specify` actually captured.

**Alternatives considered**: Building the full Pomodoro timer alongside this feature — rejected,
out of this spec's scope; tracked as a natural next `/speckit-specify` candidate instead.

## Follow-up housekeeping

`ARCHITECTURE.md`'s domain model bullet for `Task` currently lists the old tag values
(`Application / Interview Prep / Networking / Skill-building`). Since this feature changes that
enum, `tasks.md` must include a task to update that line (and the `tag` → `category` rename) to
keep the architecture doc accurate — not a stack change, just a domain-model doc sync.
