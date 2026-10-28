import Link from "next/link";
import { WeeklyMonthlyChart } from "@/components/dashboard/weekly-monthly-chart";
import type { DashboardAnalytics, DashboardTrends } from "@/lib/dashboard/queries";

export function AnalyticsSection({
  analytics,
  trends,
}: {
  analytics: DashboardAnalytics;
  trends: DashboardTrends;
}) {
  const hasAnyTaskData = analytics.week.hasAnyTaskData || analytics.month.hasAnyTaskData;

  if (!hasAnyTaskData) {
    return (
      <div className="dashboard-empty-state rounded-lg border border-dashed border-gray-300 bg-white/80 p-8 text-center backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
        <p className="text-base font-semibold">Nothing planned yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Plan your day to start tracking your weekly and monthly progress.
        </p>
        <Link
          href="/dashboard/plan-day"
          className="mt-4 inline-block rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
        >
          Plan your day
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">This week &amp; month</p>
        <Link
          href="/dashboard/plan-day"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow"
        >
          Plan another day
        </Link>
      </div>
      <WeeklyMonthlyChart analytics={analytics} trends={trends} />
    </div>
  );
}
