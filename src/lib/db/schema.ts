import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Auth.js tables (standard schema expected by @auth/drizzle-adapter)
// ---------------------------------------------------------------------------
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  // Set by the user on the post-signup "set a password" step. Null for
  // accounts that only ever use Google OAuth.
  password: text("password"),
  image: text("image"),
  enabledTaskCategories: text("enabled_task_categories")
    .array()
    .notNull()
    .default(["other", "study", "job_application", "work"]),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);
export const taskCategory = pgEnum("task_category", [
  "other",
  "study",
  "job_application",
  "work",
]);
export const pomodoroKind = pgEnum("pomodoro_kind", ["focus", "break"]);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category"),
    targetDate: date("target_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_id_idx").on(table.userId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    priority: taskPriority("priority").notNull().default("medium"),
    category: taskCategory("category").notNull().default("other"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    // Optional end of this task's planned time slot. Null means a point-in-time
    // task (occupies just its own hour on the Plan-your-day timeline); set means
    // it spans from scheduledAt through this timestamp. Distinct from dueAt
    // (a deadline), which this feature doesn't use.
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    estimatedPomodoros: integer("estimated_pomodoros").notNull().default(1),
    // Missed-start reminder tracking (feature 004). Null = that stage hasn't
    // been sent yet; set once and never cleared, including after editing
    // scheduledAt - see specs/004-missed-pomodoro-reminders/data-model.md.
    firstReminderSentAt: timestamp("first_reminder_sent_at", { withTimezone: true }),
    secondReminderSentAt: timestamp("second_reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_goal_id_idx").on(table.goalId),
    index("tasks_scheduled_at_idx").on(table.scheduledAt),
  ],
);

export const pomodoroSessions = pgTable(
  "pomodoro_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    plannedFocusMin: integer("planned_focus_min").notNull().default(25),
    plannedBreakMin: integer("planned_break_min").notNull().default(5),
    completed: boolean("completed").notNull().default(false),
    kind: pomodoroKind("kind").notNull().default("focus"),
    // Pause/resume: pausedAt is set while the current pause is in effect (null
    // when running or never paused). pausedMs accumulates total paused time
    // across however many pause/resume cycles, so the effective end time is
    // always startedAt + plannedMinutes + pausedMs - shifting the deadline
    // forward by exactly how long it was paused, rather than tracking
    // "remaining time" as its own mutable value.
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    pausedMs: integer("paused_ms").notNull().default(0),
  },
  (table) => [
    index("pomodoro_sessions_user_id_idx").on(table.userId),
    index("pomodoro_sessions_task_id_idx").on(table.taskId),
  ],
);

export const sessionNotes = pgTable(
  "session_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => pomodoroSessions.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("session_notes_task_id_idx").on(table.taskId),
    index("session_notes_session_id_idx").on(table.sessionId),
  ],
);

// schedule shape: { times: ["09:00", "13:00"], days: [1,2,3,4,5] } (1=Mon..7=Sun)
export const reminderPreferences = pgTable("reminder_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(true),
  timezone: text("timezone").notNull().default("UTC"),
  schedule: jsonb("schedule")
    .notNull()
    .default({ times: ["09:00"], days: [1, 2, 3, 4, 5] }),
  nextSendAt: timestamp("next_send_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    type: text("type").notNull(),
    payloadSummary: text("payload_summary"),
  },
  (table) => [index("notification_log_user_id_idx").on(table.userId)],
);

// Sliding-window rate limiting: one row per attempt. A key is checked by
// counting rows for it newer than (now - window). No adapter/session
// relation - this isn't user-scoped, it's keyed by whatever the caller
// chooses (e.g. "otp-request:<email>", "password-fail:<email>").
export const rateLimitAttempts = pgTable(
  "rate_limit_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rate_limit_attempts_key_idx").on(table.key)],
);
