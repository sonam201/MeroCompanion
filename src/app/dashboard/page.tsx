import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SignOutButton } from "@/components/sign-out-button";
import { WeeklyProgressChart } from "@/components/dashboard/weekly-progress-chart";
import { MonthlyStats } from "@/components/dashboard/monthly-stats";
import { MiniCalendar } from "@/components/dashboard/mini-calendar";
import { StartPomodoroCard } from "@/components/dashboard/start-pomodoro-card";
import { EmptyDashboardState } from "@/components/dashboard/empty-dashboard-state";

// Mock for now - replace with a real query once task CRUD exists:
// SELECT EXISTS(SELECT 1 FROM tasks WHERE user_id = ? AND scheduled_at::date = current_date)
const hasTasksToday = false;

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Signed in as {session.user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {!user?.password && (
        <div className="rounded-md border border-border p-4 text-sm">
          You don&apos;t have a password set yet, so sign-in still requires a fresh emailed
          code each time.{" "}
          <Link href="/onboarding/set-password" className="underline">
            Set one now
          </Link>
          .
        </div>
      )}

      {hasTasksToday ? (
        <>
          <MonthlyStats />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WeeklyProgressChart />
            </div>
            <StartPomodoroCard />
          </div>

          <MiniCalendar />
        </>
      ) : (
        <EmptyDashboardState />
      )}
    </main>
  );
}
