"use server";

import { and, asc, eq, gte, isNull, lt, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pomodoroSessions, reminderPreferences, tasks, users } from "@/lib/db/schema";
import { isTaskCategory, type TaskCategory } from "@/lib/dashboard/categories";
import { getEnabledTaskCategories } from "@/lib/dashboard/queries";

// Every action re-derives the user id from the session server-side - the
// client never supplies it (Constitution III: explicit per-user authorization).
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

function dayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function timeOf(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

// endTime is optional: set, the task spans scheduledAt..scheduledEndAt and
// merges across the hours it covers on the Plan-your-day timeline; omitted,
// it stays a point-in-time entry in just its own hour.
type PlannedTaskItem = { title: string; time: string; endTime?: string; category: TaskCategory };

async function getTasksForDate(userId: string, dateStr: string) {
  const { start, end } = dayRange(dateStr);
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.scheduledAt, start), lt(tasks.scheduledAt, end)))
    .orderBy(asc(tasks.scheduledAt));
}

async function replaceTasksForDate(userId: string, dateStr: string, items: PlannedTaskItem[]) {
  const { start, end } = dayRange(dateStr);
  await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.scheduledAt, start), lt(tasks.scheduledAt, end)));

  if (items.length === 0) {
    return;
  }

  await db.insert(tasks).values(
    items.map((item) => ({
      userId,
      title: item.title,
      category: item.category,
      scheduledAt: new Date(`${dateStr}T${item.time}:00`),
      scheduledEndAt: item.endTime ? new Date(`${dateStr}T${item.endTime}:00`) : null,
    })),
  );
}

// ---------------------------------------------------------------------------
// createDayPlan
// ---------------------------------------------------------------------------

export type CreateDayPlanInput = {
  date: string;
  tasks: PlannedTaskItem[];
};

export type CreateDayPlanResult =
  | { ok: true; created: number }
  | { ok: false; error: "duplicate_time" | "disabled_category" | "empty" };

export async function createDayPlan(input: CreateDayPlanInput): Promise<CreateDayPlanResult> {
  const userId = await requireUserId();

  if (input.tasks.length === 0) {
    return { ok: false, error: "empty" };
  }

  const enabled = await getEnabledTaskCategories(userId);
  for (const task of input.tasks) {
    if (!isTaskCategory(task.category) || !enabled.includes(task.category)) {
      return { ok: false, error: "disabled_category" };
    }
  }

  const requestedTimes = input.tasks.map((task) => task.time);
  if (new Set(requestedTimes).size !== requestedTimes.length) {
    return { ok: false, error: "duplicate_time" };
  }

  const existing = await getTasksForDate(userId, input.date);
  const existingTimes = new Set(
    existing.map((row) => (row.scheduledAt ? timeOf(row.scheduledAt) : null)).filter(Boolean),
  );
  if (requestedTimes.some((time) => existingTimes.has(time))) {
    return { ok: false, error: "duplicate_time" };
  }

  await db.insert(tasks).values(
    input.tasks.map((task) => ({
      userId,
      title: task.title,
      category: task.category,
      scheduledAt: new Date(`${input.date}T${task.time}:00`),
      scheduledEndAt: task.endTime ? new Date(`${input.date}T${task.endTime}:00`) : null,
    })),
  );

  return { ok: true, created: input.tasks.length };
}

// ---------------------------------------------------------------------------
// clearDayPlan
// ---------------------------------------------------------------------------

export type ClearDayPlanInput = { date: string };

export type ClearDayPlanResult = { ok: true };

export async function clearDayPlan(input: ClearDayPlanInput): Promise<ClearDayPlanResult> {
  const userId = await requireUserId();
  await replaceTasksForDate(userId, input.date, []);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// copyDayPlan
// ---------------------------------------------------------------------------

export type CopyDayPlanInput = {
  sourceDate: string;
  targetDate: string;
  overwrite?: boolean;
};

export type CopyDayPlanResult = { ok: true } | { ok: false; conflict: true };

export async function copyDayPlan(input: CopyDayPlanInput): Promise<CopyDayPlanResult> {
  const userId = await requireUserId();

  const sourceTasks = await getTasksForDate(userId, input.sourceDate);
  const sourceItems: PlannedTaskItem[] = sourceTasks
    .filter((task) => task.scheduledAt !== null)
    .map((task) => ({
      title: task.title,
      category: task.category,
      time: timeOf(task.scheduledAt as Date),
      endTime: task.scheduledEndAt ? timeOf(task.scheduledEndAt) : undefined,
    }));

  const existing = await getTasksForDate(userId, input.targetDate);
  if (existing.length > 0 && !input.overwrite) {
    return { ok: false, conflict: true };
  }

  await replaceTasksForDate(userId, input.targetDate, sourceItems);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// toggleTaskCategory
// ---------------------------------------------------------------------------

export type ToggleTaskCategoryInput = {
  category: TaskCategory;
  enabled: boolean;
};

export type ToggleTaskCategoryResult = { ok: true; enabledTaskCategories: TaskCategory[] };

export async function toggleTaskCategory(
  input: ToggleTaskCategoryInput,
): Promise<ToggleTaskCategoryResult> {
  const userId = await requireUserId();
  const current = await getEnabledTaskCategories(userId);

  const next = input.enabled
    ? Array.from(new Set([...current, input.category]))
    : current.filter((c) => c !== input.category);

  await db.update(users).set({ enabledTaskCategories: next }).where(eq(users.id, userId));

  return { ok: true, enabledTaskCategories: next };
}

// ---------------------------------------------------------------------------
// startPomodoroForTask
// ---------------------------------------------------------------------------

export type PomodoroKind = "focus" | "break";

export type ActivePeriodResult = {
  id: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
  kind: PomodoroKind;
  plannedMinutes: number;
  pausedAt: string | null;
  pausedMs: number;
};

export type StartPomodoroForTaskInput = { taskId: string; kind?: PomodoroKind };

export type StartPomodoroForTaskResult =
  | { ok: true; period: ActivePeriodResult }
  | { ok: false; error: "not_found" | "already_completed" };

export async function startPomodoroForTask(
  input: StartPomodoroForTaskInput,
): Promise<StartPomodoroForTaskResult> {
  const userId = await requireUserId();
  const kind: PomodoroKind = input.kind ?? "focus";

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)));

  if (!task) {
    return { ok: false, error: "not_found" };
  }
  if (task.status === "done") {
    return { ok: false, error: "already_completed" };
  }

  // Only one period may run per user at a time (FR-009a). If this exact task
  // already has this exact kind running, resume it instead of duplicating
  // (FR-009); otherwise end whatever else is running first, preserving its
  // elapsed time (FR-008), before starting the new one.
  const [running] = await db
    .select()
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)));

  if (running && running.taskId === task.id && running.kind === kind) {
    return {
      ok: true,
      period: {
        id: running.id,
        taskId: running.taskId,
        taskTitle: task.title,
        startedAt: running.startedAt.toISOString(),
        kind: running.kind,
        plannedMinutes: running.kind === "focus" ? running.plannedFocusMin : running.plannedBreakMin,
        pausedAt: running.pausedAt ? running.pausedAt.toISOString() : null,
        pausedMs: running.pausedMs,
      },
    };
  }

  if (running) {
    await db
      .update(pomodoroSessions)
      .set({ endedAt: new Date() })
      .where(eq(pomodoroSessions.id, running.id));
  }

  const [period] = await db
    .insert(pomodoroSessions)
    .values({ userId, taskId: task.id, kind })
    .returning();

  return {
    ok: true,
    period: {
      id: period.id,
      taskId: period.taskId,
      taskTitle: task.title,
      startedAt: period.startedAt.toISOString(),
      kind: period.kind,
      plannedMinutes: period.kind === "focus" ? period.plannedFocusMin : period.plannedBreakMin,
      pausedAt: null,
      pausedMs: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// endPomodoroPeriod
// ---------------------------------------------------------------------------
//
// Used for both natural completion (client calls it the moment its countdown
// reaches zero) and early stop (client calls it when the user clicks "Stop") -
// the small gap between the exact zero-point and when this request lands is
// immaterial given the "within a few seconds" tolerance (SC-001).

export type EndPomodoroPeriodInput = { periodId: string };

export type EndPomodoroPeriodResult = { ok: true } | { ok: false; error: "not_found" };

export async function endPomodoroPeriod(
  input: EndPomodoroPeriodInput,
): Promise<EndPomodoroPeriodResult> {
  const userId = await requireUserId();

  const [period] = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, input.periodId),
        eq(pomodoroSessions.userId, userId),
        isNull(pomodoroSessions.endedAt),
      ),
    );

  if (!period) {
    return { ok: false, error: "not_found" };
  }

  await db
    .update(pomodoroSessions)
    .set({ endedAt: new Date() })
    .where(eq(pomodoroSessions.id, period.id));

  return { ok: true };
}

// ---------------------------------------------------------------------------
// pausePomodoroPeriod / resumePomodoroPeriod
// ---------------------------------------------------------------------------
//
// Pausing freezes the countdown rather than ending the period: pausedAt
// records when the current pause began. Resuming folds that pause's duration
// into pausedMs (accumulated across however many pause/resume cycles) and
// clears pausedAt - which shifts the effective end time
// (startedAt + plannedMinutes + pausedMs) forward by exactly how long it was
// paused, so the countdown picks up from where it was frozen rather than
// jumping. Both return the updated pause fields so the client stays in sync
// with the server's timestamps rather than approximating its own.

export type PausePomodoroPeriodInput = { periodId: string };

export type PausePomodoroPeriodResult =
  | { ok: true; pausedAt: string }
  | { ok: false; error: "not_found" };

export async function pausePomodoroPeriod(
  input: PausePomodoroPeriodInput,
): Promise<PausePomodoroPeriodResult> {
  const userId = await requireUserId();

  const [period] = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, input.periodId),
        eq(pomodoroSessions.userId, userId),
        isNull(pomodoroSessions.endedAt),
        isNull(pomodoroSessions.pausedAt),
      ),
    );

  if (!period) {
    return { ok: false, error: "not_found" };
  }

  const pausedAt = new Date();
  await db
    .update(pomodoroSessions)
    .set({ pausedAt })
    .where(eq(pomodoroSessions.id, period.id));

  return { ok: true, pausedAt: pausedAt.toISOString() };
}

export type ResumePomodoroPeriodInput = { periodId: string };

export type ResumePomodoroPeriodResult =
  | { ok: true; pausedMs: number }
  | { ok: false; error: "not_found" };

export async function resumePomodoroPeriod(
  input: ResumePomodoroPeriodInput,
): Promise<ResumePomodoroPeriodResult> {
  const userId = await requireUserId();

  const [period] = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(
        eq(pomodoroSessions.id, input.periodId),
        eq(pomodoroSessions.userId, userId),
        isNull(pomodoroSessions.endedAt),
      ),
    );

  if (!period || !period.pausedAt) {
    return { ok: false, error: "not_found" };
  }

  const pausedMs = period.pausedMs + (Date.now() - period.pausedAt.getTime());
  await db
    .update(pomodoroSessions)
    .set({ pausedMs, pausedAt: null })
    .where(eq(pomodoroSessions.id, period.id));

  return { ok: true, pausedMs };
}

// ---------------------------------------------------------------------------
// completeTask
// ---------------------------------------------------------------------------
//
// Not part of the original contract set - added because this feature's
// "Let's start" card is the only task-facing UI it builds, and there is no
// other task-completion control anywhere in the app yet (full task-list CRUD
// is a separate, not-yet-built feature). Marking done here is what makes
// FR-004/Clarification Q2 ("completed tasks drop out of Let's start and feed
// analytics instead") actually demonstrable end-to-end.

export type CompleteTaskInput = { taskId: string };

export type CompleteTaskResult = { ok: true } | { ok: false; error: "not_found" };

export async function completeTask(input: CompleteTaskInput): Promise<CompleteTaskResult> {
  const userId = await requireUserId();

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)));

  if (!task) {
    return { ok: false, error: "not_found" };
  }

  await db.update(tasks).set({ status: "done" }).where(eq(tasks.id, task.id));

  // Close out any still-open Pomodoro session for this task so its focused
  // time is actually counted (getDashboardAnalytics only sums sessions with
  // endedAt set).
  await db
    .update(pomodoroSessions)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(pomodoroSessions.taskId, task.id),
        eq(pomodoroSessions.userId, userId),
        isNull(pomodoroSessions.endedAt),
      ),
    );

  return { ok: true };
}

// ---------------------------------------------------------------------------
// syncUserTimezone (feature 004 - missed-task reminders)
// ---------------------------------------------------------------------------

export type SyncUserTimezoneInput = { timezone: string };

export type SyncUserTimezoneResult = { ok: true };

// Opportunistically called on every dashboard load so the missed-task-reminder
// cron job (which has no browser to read an offset from) knows each user's
// real local day/threshold math instead of assuming UTC - see
// specs/004-missed-pomodoro-reminders/research.md §2. Best-effort: an
// unrecognized zone name is silently ignored rather than erroring the page.
export async function syncUserTimezone(
  input: SyncUserTimezoneInput,
): Promise<SyncUserTimezoneResult> {
  const userId = await requireUserId();

  if (!input.timezone || !Intl.supportedValuesOf("timeZone").includes(input.timezone)) {
    return { ok: true };
  }

  await db
    .insert(reminderPreferences)
    .values({ userId, timezone: input.timezone })
    .onConflictDoUpdate({
      target: reminderPreferences.userId,
      set: { timezone: input.timezone },
      where: ne(reminderPreferences.timezone, input.timezone),
    });

  return { ok: true };
}
