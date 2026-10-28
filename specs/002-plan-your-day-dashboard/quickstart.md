# Quickstart: Plan-Your-Day Dashboard

Manual validation guide (no automated suite in this project — see `plan.md` Technical Context).
Run against a local dev server with a Neon connection configured (`npm run dev`), signed in as a
test account.

## Prerequisites

- Migration applied (`task_category` enum + `tasks.category` rename, `users.enabled_task_categories`
  default-populated for existing rows).
- A signed-in session with **zero** tasks, to exercise the empty state first.

## 1. Empty-state visit (User Story 1)

1. Sign in with an account that has no tasks anywhere.
2. Load `/dashboard`.
3. **Expect**: analytics section shows the empty-state placeholder + "Plan your day" CTA; the
   calendar shows the current month with today highlighted; the "Let's start" card shows its own
   no-tasks message. All three areas render — nothing is blank/broken (FR-001, SC-001).

## 2. Plan a day (User Story 2)

1. Click "Plan your day".
2. Add 2–3 tasks, each with a distinct time and a category from the enabled set.
3. Try adding a second task at the same time as an existing one → **expect** rejection
   (`duplicate_time`), no save (Clarification Q4).
4. Save with a valid set → **expect** redirect/return to `/dashboard`; analytics section now shows
   real stats (or at least a non-empty state) instead of the placeholder (FR-002, SC-002 — should
   feel well under 2 minutes end-to-end).

## 3. Replicate across the week

1. From the same "Plan your day" flow (or a re-plan entry point), choose "replicate across the
   coming 7 days".
2. If none of the next 7 days have tasks yet → **expect** all 7 populated with a copy of the same
   list, no confirmation prompt needed.
3. Re-run replicate when at least one target day already has tasks → **expect** a confirmation
   listing the conflicting date(s) before anything is overwritten; declining leaves that day
   untouched (FR-009).

## 4. Copy a previous day

1. Pick a day that already has a plan; use "copy" onto a different, empty target day.
2. **Expect** the target day now has an identical task list, independently editable afterward
   (FR-008).
3. Repeat onto a target day that already has tasks → same overwrite-confirmation behavior as step 3
   above.

## 5. "Let's start" correctness (User Story 3)

1. With today populated with tasks at several times, load `/dashboard` at a time between two of
   them (one earlier/passed, one later/upcoming).
2. **Expect**: the card shows the *upcoming* one and never the one whose time already passed, even
   though the passed task remains incomplete (FR-004/FR-012 — overdue incomplete tasks are
   excluded entirely, not just deprioritized).
3. Mark the shown task's Pomodoro as started, then mark the task `done` (however the existing task
   UI exposes that).
4. Reload `/dashboard` → **expect** the completed task never reappears in "Let's start", and its
   contribution now shows up in the analytics completed count (Clarification Q2, FR-002a).
5. With no incomplete tasks left today (but tasks existing on other days) → **expect** "Let's
   start" shows its empty message rather than pulling a task from another day (Clarification Q3).

## 6. Category preferences

1. With the test account having at least one task already recorded under "Job Application Mode"
   this week, disable "Job Application Mode" for the account.
2. Open "Plan your day" → **expect** "Job Application Mode" is no longer offered as a category
   option (FR-002b).
3. Load `/dashboard` → **expect** the analytics chart *still* shows the "Job Application Mode"
   series for the current week (it has historical data in that window) — disabling only stops it
   being offered for new tasks, it does not erase past data (FR-002b).

## 7. Regression check

- `npm run build` and `npm run lint` both pass (constitution requirement).
- The pre-existing "set a password" notice and sign-out flow on `/dashboard` still render correctly
  above/alongside the new sections.
