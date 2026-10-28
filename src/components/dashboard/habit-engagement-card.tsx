import type { AnalyticsWindow, DashboardAnalytics } from "@/lib/dashboard/queries";

function completionRate(window: AnalyticsWindow): number {
  const planned = window.byCategory.reduce((sum, s) => sum + s.tasksPlanned, 0);
  const completed = window.byCategory.reduce((sum, s) => sum + s.tasksCompleted, 0);
  return planned === 0 ? 0 : Math.round((completed / planned) * 100);
}

export function HabitEngagementCard({
  analytics,
  streakDays,
}: {
  analytics: DashboardAnalytics;
  streakDays: number;
}) {
  const weekRate = completionRate(analytics.week);
  const monthRate = completionRate(analytics.month);

  return (
    <div className="dashboard-card p-4">
      <p className="text-sm font-medium">Engagement</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-2xl font-semibold tabular-nums">{streakDays}</p>
          <p className="text-xs text-gray-500">day streak</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{weekRate}%</p>
          <p className="text-xs text-gray-500">this week</p>
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{monthRate}%</p>
          <p className="text-xs text-gray-500">this month</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {streakDays === 0
          ? "Complete every task on a day to start a streak."
          : `${streakDays} day${streakDays === 1 ? "" : "s"} in a row, fully followed through.`}
      </p>
    </div>
  );
}
