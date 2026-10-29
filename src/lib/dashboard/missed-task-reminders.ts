import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export type MissedTaskReminderCheckResult = {
  checkedAt: string;
  firstRemindersSent: number;
  secondRemindersSent: number;
  autoCompletedCount: number;
};

type MissedTaskRow = {
  id: string;
  title: string;
  scheduledAt: string;
  ownerEmail: string;
};

// AT TIME ZONE with a dynamic (column-valued) zone name has no typed helper
// in Drizzle, so both passes below are written as sql templates rather than
// the query builder - see specs/004-missed-pomodoro-reminders/research.md §2.
// coalesce(rp.timezone, 'UTC') covers a user who has no reminder_preferences
// row yet (left join), matching the documented UTC fallback.
function buildMissedTaskQuery(minutesLate: number, requireFirstSent: boolean) {
  return sql<MissedTaskRow>`
    select t.id as "id", t.title as "title", t.scheduled_at as "scheduledAt", u.email as "ownerEmail"
    from tasks t
    join "user" u on u.id = t.user_id
    left join reminder_preferences rp on rp.user_id = t.user_id
    where t.status <> 'done' -- re-checked fresh every call, so marking a task
                              -- done silences it immediately, no cancel step
      and t.scheduled_at is not null
      and not exists (select 1 from pomodoro_sessions ps where ps.task_id = t.id)
      -- ^ same reasoning: starting a session removes the task from every
      -- future pass the instant it exists, not just going forward from here
      and ${
        requireFirstSent
          // "Other" is the uncategorized catch-all with no strict follow-through
          // expectation - it only ever gets the one-time first nudge, never the
          // escalating second reminder, so it's excluded from this pass entirely.
          ? sql`t.first_reminder_sent_at is not null and t.second_reminder_sent_at is null and t.category <> 'other'`
          : sql`t.first_reminder_sent_at is null`
      }
      and (t.scheduled_at at time zone coalesce(rp.timezone, 'UTC'))::date
          = (now() at time zone coalesce(rp.timezone, 'UTC'))::date
      and (t.scheduled_at at time zone coalesce(rp.timezone, 'UTC'))
          <= (now() at time zone coalesce(rp.timezone, 'UTC')) - (interval '1 minute' * ${minutesLate})
  `;
}

async function sendReminderEmails(
  rows: MissedTaskRow[],
  stage: "first" | "second",
  column: "first_reminder_sent_at" | "second_reminder_sent_at",
): Promise<number> {
  let sent = 0;
  for (const row of rows) {
    const scheduledLabel = new Date(row.scheduledAt).toLocaleString();
    const subject =
      stage === "first"
        ? `Missed task: "${row.title}"`
        : `Still missed: "${row.title}" (second reminder)`;
    const text =
      `You planned to start "${row.title}" at ${scheduledLabel}, but haven't started a ` +
      `Pomodoro session for it yet. Open MeroCompanion to get started.`;

    const result = await sendMail({ to: row.ownerEmail, subject, text });
    if (!result.ok) {
      console.error(`Failed to send ${stage} reminder for task ${row.id}:`, result.error);
      continue;
    }

    await db.execute(
      sql`update tasks set ${sql.raw(column)} = now() where id = ${row.id}`,
    );
    sent += 1;
  }
  return sent;
}

// A task the user actually started (a pomodoro_sessions row exists) but
// never explicitly marked done: once its scheduled *end* time has passed,
// leaving it sitting as "todo" forever is wrong in two ways - it keeps
// showing as the dashboard's "next up" task long after its window closed,
// and any session left running (endedAt still null, e.g. the browser tab
// was closed before the countdown finished) never gets closed out, so it
// never counts toward focused-time analytics. Point-in-time tasks (no
// scheduled_end_at) are deliberately excluded - there's no "finish time" to
// judge them against, so they still require an explicit "Mark done".
function buildAutoCompleteQuery() {
  return sql<{ id: string }>`
    select t.id as "id"
    from tasks t
    left join reminder_preferences rp on rp.user_id = t.user_id
    where t.status <> 'done'
      and t.scheduled_end_at is not null
      and exists (select 1 from pomodoro_sessions ps where ps.task_id = t.id)
      and (t.scheduled_end_at at time zone coalesce(rp.timezone, 'UTC'))
          <= (now() at time zone coalesce(rp.timezone, 'UTC'))
  `;
}

async function autoCompleteFinishedTasks(): Promise<number> {
  const due = await db.execute(buildAutoCompleteQuery());
  const rows = due.rows as unknown as { id: string }[];

  for (const row of rows) {
    // Close any still-open session first so its elapsed time is counted
    // (same close-out this task's own "Mark done" button already does -
    // src/app/dashboard/actions.ts's completeTask), then mark the task done.
    await db.execute(
      sql`update pomodoro_sessions set ended_at = now() where task_id = ${row.id} and ended_at is null`,
    );
    await db.execute(sql`update tasks set status = 'done' where id = ${row.id}`);
  }

  return rows.length;
}

// Orchestrates both reminder passes for the scheduled missed-task-reminders
// cron route - see
// specs/004-missed-pomodoro-reminders/contracts/cron-missed-task-reminders.md.
// The second pass intentionally runs AFTER the first completes (not in
// parallel), over the now-updated rows, so a task that just got its first
// reminder in this same call is already visible to the second pass if it's
// also ≥10 minutes late - that's what satisfies FR-014's catch-up rule
// without any special-case branch.
export async function runMissedTaskReminderCheck(): Promise<MissedTaskReminderCheckResult> {
  const firstDue = await db.execute(buildMissedTaskQuery(5, false));
  const firstRemindersSent = await sendReminderEmails(
    firstDue.rows as unknown as MissedTaskRow[],
    "first",
    "first_reminder_sent_at",
  );

  const secondDue = await db.execute(buildMissedTaskQuery(10, true));
  const secondRemindersSent = await sendReminderEmails(
    secondDue.rows as unknown as MissedTaskRow[],
    "second",
    "second_reminder_sent_at",
  );

  const autoCompletedCount = await autoCompleteFinishedTasks();

  return {
    checkedAt: new Date().toISOString(),
    firstRemindersSent,
    secondRemindersSent,
    autoCompletedCount,
  };
}
