import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ProfileMenu } from "@/components/profile-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { HabitEngagementCard } from "@/components/dashboard/habit-engagement-card";
import { LetsStartCard } from "@/components/dashboard/lets-start-card";
import { QuoteCard } from "@/components/dashboard/quote-card";
import { TodayLabel } from "@/components/dashboard/today-label";
import {
  getActivePeriod,
  getDashboardAnalytics,
  getDashboardTrends,
  getHabitStreak,
  getTodayLetsStartTask,
} from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const [user, analytics, trends, letsStartTask, activePeriod, streakDays] = await Promise.all([
    db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, session.user.id))
      .then(([row]) => row),
    getDashboardAnalytics(session.user.id),
    getDashboardTrends(session.user.id),
    getTodayLetsStartTask(session.user.id),
    getActivePeriod(session.user.id),
    getHabitStreak(session.user.id),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-3 min-[400px]:p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <ProfileMenu email={session.user.email ?? ""}>
          <SignOutButton />
        </ProfileMenu>
      </div>

      {!user?.password && (
        <div className="dashboard-card p-4 text-sm">
          You don&apos;t have a password set yet, so sign-in still requires a fresh emailed
          code each time.{" "}
          <Link href="/onboarding/set-password" className="underline">
            Set one now
          </Link>
          .
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <AnalyticsSection analytics={analytics} trends={trends} />
          <HabitEngagementCard analytics={analytics} streakDays={streakDays} />
        </div>
        <div className="flex flex-col gap-6">
          <TodayLabel />
          <QuoteCard />
          <LetsStartCard task={letsStartTask} activePeriod={activePeriod} />
        </div>
      </div>
    </main>
  );
}
