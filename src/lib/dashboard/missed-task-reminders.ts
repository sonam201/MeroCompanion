import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export type MissedTaskReminderCheckResult = {
  checkedAt: string;
  firstRemindersSent: number;
  secondRemindersSent: number;
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
          ? sql`t.first_reminder_sent_at is not null and t.second_reminder_sent_at is null`
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

  return {
    checkedAt: new Date().toISOString(),
    firstRemindersSent,
    secondRemindersSent,
  };
}
