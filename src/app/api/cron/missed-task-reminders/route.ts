import { runMissedTaskReminderCheck } from "@/lib/dashboard/missed-task-reminders";

// Machine-to-machine only - called by the missed-task-reminders GitHub Actions
// workflow on a schedule, never by the browser. There is no signed-in caller
// here, so this route is protected by a shared secret instead of auth()
// (Constitution III's normal mechanism doesn't apply to a scheduled job with
// no user session) - see plan.md's Constitution Check and
// specs/004-missed-pomodoro-reminders/contracts/cron-missed-task-reminders.md.
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(null, { status: 401 });
  }

  const result = await runMissedTaskReminderCheck();
  return Response.json({ ok: true, ...result });
}
