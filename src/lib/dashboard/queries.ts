import { and, asc, desc, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pomodoroSessions, tasks, users } from "@/lib/db/schema";
import { TASK_CATEGORY_IDS, type TaskCategory } from "@/lib/dashboard/categories";

export type ActivePeriod = {
  id: string;
  taskId: string;
  taskTitle: string;
  kind: "focus" | "break";
  startedAt: Date;
  plannedMinutes: number;
  pausedAt: Date | null;
  pausedMs: number;
};

export type CategoryStat = {
  category: TaskCategory;
  tasksCompleted: number;
  tasksPlanned: number;
  focusedMinutes: number;
};

export type AnalyticsWindow = {
  rangeStart: string;
  rangeEnd: string;
  hasAnyTaskData: boolean;
  byCategory: CategoryStat[];
};

export type DashboardAnalytics = {
  week: AnalyticsWindow;
  month: AnalyticsWindow;
};

export type LetsStartTask = {
  id: string;
  title: string;
  category: TaskCategory;
  scheduledAt: Date;
};

export type PlannedTask = {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  category: TaskCategory;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Date.toISOString() always reports UTC, so naively slicing it after local
// date arithmetic silently shifts by a day on any server not running in UTC.
// Shifting by the local offset before formatting corrects for that.
function toLocalDateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function timeOf(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

// Monday-Sunday week containing `now`, per Clarification (2026-09-30).
function getWeekRange(now: Date): { start: Date; end: Date } {
  const today = startOfDay(now);
  const dayOfWeek = today.getDay(); // 0=Sun..6=Sat
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = addDays(today, -daysSinceMonday);
  const end = addDays(start, 7);
  return { start, end };
}

function getMonthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export async function getEnabledTaskCategories(userId: string): Promise<TaskCategory[]> {
  const [row] = await db
    .select({ enabledTaskCategories: users.enabledTaskCategories })
    .from(users)
    .where(eq(users.id, userId));

  const enabled = (row?.enabledTaskCategories ?? []).filter((c): c is TaskCategory =>
    (TASK_CATEGORY_IDS as string[]).includes(c),
  );
  return enabled.length > 0 ? enabled : [...TASK_CATEGORY_IDS];
}

// Strictly forward-looking: only today's own tasks scheduled at or after now
// are candidates. An overdue-but-incomplete task is never shown here (spec
// Clarification 2026-09-30) - it stays visible elsewhere, just not as "next up".
export async function getTodayLetsStartTask(userId: string): Promise<LetsStartTask | null> {
  const now = new Date();
  const startOfTomorrow = addDays(startOfDay(now), 1);

  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      category: tasks.category,
      scheduledAt: tasks.scheduledAt,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        sql`${tasks.status} != 'done'`,
        gte(tasks.scheduledAt, now),
        lt(tasks.scheduledAt, startOfTomorrow),
      ),
    )
    .orderBy(asc(tasks.scheduledAt))
    .limit(1);

  if (!row || !row.scheduledAt) {
    return null;
  }
  return { id: row.id, title: row.title, category: row.category, scheduledAt: row.scheduledAt };
}

// All of a user's tasks for one calendar date - used by the Plan-your-day
// page to pre-populate the timeline when revisiting an already-planned day,
// and to decide whether that day counts as "already planned" (for showing
// the copy-into-this-day controls only when it isn't).
export async function getPlannedTasksForDate(
  userId: string,
  dateStr: string,
): Promise<PlannedTask[]> {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = addDays(start, 1);

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      category: tasks.category,
      scheduledAt: tasks.scheduledAt,
      scheduledEndAt: tasks.scheduledEndAt,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.scheduledAt, start), lt(tasks.scheduledAt, end)))
    .orderBy(asc(tasks.scheduledAt));

  return rows
    .filter((row) => row.scheduledAt !== null)
    .map((row) => ({
      id: row.id,
      title: row.title,
      time: timeOf(row.scheduledAt as Date),
      endTime: row.scheduledEndAt ? timeOf(row.scheduledEndAt) : undefined,
      category: row.category,
    }));
}

// Distinct calendar dates in the week strictly before `beforeDate` that have
// at least one task - populates the "copy from a day" picker with only days
// that are actually available to copy from, most recent first. Deliberately
// capped to the last 7 days only, not further back.
export async function getPlannedDates(
  userId: string,
  beforeDate: string,
  lookbackDays = 7,
): Promise<string[]> {
  const before = new Date(`${beforeDate}T00:00:00`);
  const after = addDays(before, -lookbackDays);

  const rows = await db
    .select({ scheduledAt: tasks.scheduledAt })
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), gte(tasks.scheduledAt, after), lt(tasks.scheduledAt, before)),
    )
    .orderBy(desc(tasks.scheduledAt));

  const dates: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    const key = toLocalDateString(row.scheduledAt);
    if (!seen.has(key)) {
      seen.add(key);
      dates.push(key);
    }
  }
  return dates;
}

// The caller's one running period (endedAt IS NULL), if any, across all their
// tasks. Read on dashboard load so a running timer survives reload (FR-002)
// and so two tabs derive the same countdown from the same startedAt.
export async function getActivePeriod(userId: string): Promise<ActivePeriod | null> {
  const [row] = await db
    .select({
      id: pomodoroSessions.id,
      taskId: pomodoroSessions.taskId,
      taskTitle: tasks.title,
      kind: pomodoroSessions.kind,
      startedAt: pomodoroSessions.startedAt,
      plannedFocusMin: pomodoroSessions.plannedFocusMin,
      plannedBreakMin: pomodoroSessions.plannedBreakMin,
      pausedAt: pomodoroSessions.pausedAt,
      pausedMs: pomodoroSessions.pausedMs,
    })
    .from(pomodoroSessions)
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .where(and(eq(pomodoroSessions.userId, userId), isNull(pomodoroSessions.endedAt)));

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    taskId: row.taskId,
    taskTitle: row.taskTitle,
    kind: row.kind,
    startedAt: row.startedAt,
    plannedMinutes: row.kind === "focus" ? row.plannedFocusMin : row.plannedBreakMin,
    pausedAt: row.pausedAt,
    pausedMs: row.pausedMs,
  };
}

async function getAnalyticsWindow(
  userId: string,
  enabledCategories: TaskCategory[],
  start: Date,
  end: Date,
): Promise<AnalyticsWindow> {
  const taskRows = await db
    .select({
      category: tasks.category,
      status: tasks.status,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.scheduledAt, start), lt(tasks.scheduledAt, end)))
    .groupBy(tasks.category, tasks.status);

  const focusRows = await db
    .select({
      category: tasks.category,
      // Raw wall-clock duration minus pausedMs - without this, time spent
      // paused was being counted as focused time.
      minutes: sql<number>`coalesce(sum(extract(epoch from (${pomodoroSessions.endedAt} - ${pomodoroSessions.startedAt})) - ${pomodoroSessions.pausedMs} / 1000.0), 0) / 60`.mapWith(
        Number,
      ),
    })
    .from(pomodoroSessions)
    .innerJoin(tasks, eq(pomodoroSessions.taskId, tasks.id))
    .where(
      and(
        eq(tasks.userId, userId),
        gte(tasks.scheduledAt, start),
        lt(tasks.scheduledAt, end),
        isNotNull(pomodoroSessions.endedAt),
        eq(pomodoroSessions.kind, "focus"),
      ),
    )
    .groupBy(tasks.category);

  // A disabled category with historical data in this window must still show
  // (FR-002b) - disabling only stops it being offered for new tasks.
  const categoriesWithData = new Set(taskRows.map((r) => r.category));
  const categoriesToShow = new Set<TaskCategory>([...enabledCategories, ...categoriesWithData]);

  let hasAnyTaskData = false;
  const byCategory: CategoryStat[] = [...categoriesToShow].map((category) => {
    const rowsForCategory = taskRows.filter((r) => r.category === category);
    const tasksPlanned = rowsForCategory.reduce((sum, r) => sum + r.count, 0);
    const tasksCompleted = rowsForCategory
      .filter((r) => r.status === "done")
      .reduce((sum, r) => sum + r.count, 0);
    const focusedMinutes = focusRows.find((r) => r.category === category)?.minutes ?? 0;

    if (tasksPlanned > 0) {
      hasAnyTaskData = true;
    }

    return { category, tasksCompleted, tasksPlanned, focusedMinutes };
  });

  return {
    rangeStart: toLocalDateString(start),
    rangeEnd: toLocalDateString(end),
    hasAnyTaskData,
    byCategory,
  };
}

// Consecutive days, walking backward from today, where every task planned for
// that day was completed (and at least one task was planned - an empty day
// doesn't extend the streak). Looks back 90 days, far more than any
// realistic streak needs.
export async function getHabitStreak(userId: string): Promise<number> {
  const now = new Date();
  const start = addDays(startOfDay(now), -90);
  const end = addDays(startOfDay(now), 1);

  const rows = await db
    .select({ scheduledAt: tasks.scheduledAt, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.scheduledAt, start), lt(tasks.scheduledAt, end)));

  const perDay = new Map<string, { planned: number; completed: number }>();
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    const key = startOfDay(row.scheduledAt).toISOString();
    const entry = perDay.get(key) ?? { planned: 0, completed: 0 };
    entry.planned += 1;
    if (row.status === "done") entry.completed += 1;
    perDay.set(key, entry);
  }

  // Today only adds to the streak once it's already fully completed - being
  // mid-day with pending tasks shouldn't zero out an otherwise-intact streak.
  // The base streak is evaluated starting from yesterday.
  let streak = 0;
  const todayEntry = perDay.get(startOfDay(now).toISOString());
  if (todayEntry && todayEntry.planned > 0 && todayEntry.completed >= todayEntry.planned) {
    streak++;
  }

  for (let i = 1; i < 90; i++) {
    const key = addDays(startOfDay(now), -i).toISOString();
    const entry = perDay.get(key);
    if (!entry || entry.planned === 0 || entry.completed < entry.planned) {
      break;
    }
    streak++;
  }
  return streak;
}

export type TrendPoint = {
  date: string; // ISO date (yyyy-mm-dd)
  label: string; // short display label (weekday for week, day-of-month for month)
  planned: number;
  completed: number;
  rate: number; // 0-100, completed/planned
};

export type DashboardTrends = {
  week: TrendPoint[];
  month: TrendPoint[];
};

async function getDailyTrendForRange(
  userId: string,
  start: Date,
  end: Date,
  labelFormat: "weekday" | "day-of-month",
): Promise<TrendPoint[]> {
  const rows = await db
    .select({ scheduledAt: tasks.scheduledAt, status: tasks.status })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.scheduledAt, start), lt(tasks.scheduledAt, end)));

  const perDay = new Map<string, { planned: number; completed: number }>();
  for (const row of rows) {
    if (!row.scheduledAt) continue;
    const key = startOfDay(row.scheduledAt).toISOString();
    const entry = perDay.get(key) ?? { planned: 0, completed: 0 };
    entry.planned += 1;
    if (row.status === "done") entry.completed += 1;
    perDay.set(key, entry);
  }

  const points: TrendPoint[] = [];
  for (let d = new Date(start); d < end; d = addDays(d, 1)) {
    const key = startOfDay(d).toISOString();
    const entry = perDay.get(key) ?? { planned: 0, completed: 0 };
    const rate = entry.planned === 0 ? 0 : Math.round((entry.completed / entry.planned) * 100);
    const label =
      labelFormat === "weekday"
        ? d.toLocaleDateString(undefined, { weekday: "short" })
        : String(d.getDate());
    points.push({
      date: toLocalDateString(d),
      label,
      planned: entry.planned,
      completed: entry.completed,
      rate,
    });
  }
  return points;
}

// Day-by-day completion rate for the same week/month windows used by
// getDashboardAnalytics - feeds the trend line chart. Aggregate across all
// categories (not broken down), since the point here is the overall
// incline/decline of follow-through, not a per-category breakdown.
export async function getDashboardTrends(userId: string): Promise<DashboardTrends> {
  const now = new Date();
  const week = getWeekRange(now);
  const month = getMonthRange(now);

  const [weekPoints, monthPoints] = await Promise.all([
    getDailyTrendForRange(userId, week.start, week.end, "weekday"),
    getDailyTrendForRange(userId, month.start, month.end, "day-of-month"),
  ]);

  return { week: weekPoints, month: monthPoints };
}

export async function getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  const now = new Date();
  const enabledCategories = await getEnabledTaskCategories(userId);
  const week = getWeekRange(now);
  const month = getMonthRange(now);

  const [weekWindow, monthWindow] = await Promise.all([
    getAnalyticsWindow(userId, enabledCategories, week.start, week.end),
    getAnalyticsWindow(userId, enabledCategories, month.start, month.end),
  ]);

  return { week: weekWindow, month: monthWindow };
}
