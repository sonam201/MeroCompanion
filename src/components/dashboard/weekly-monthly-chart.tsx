"use client";

import { useState } from "react";
import { CategoryLegend } from "@/components/dashboard/category-legend";
import { CompletionTrendChart } from "@/components/dashboard/completion-trend-chart";
import { TASK_CATEGORY_IDS, taskCategoryLabel, type TaskCategory } from "@/lib/dashboard/categories";
import type {
  AnalyticsWindow,
  CategoryStat,
  DashboardAnalytics,
  DashboardTrends,
} from "@/lib/dashboard/queries";

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) {
    return `${rounded}m`;
  }
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function orderedStats(window: AnalyticsWindow): CategoryStat[] {
  const byCategory = new Map(window.byCategory.map((stat) => [stat.category, stat]));
  return TASK_CATEGORY_IDS.filter((id) => byCategory.has(id)).map((id) => byCategory.get(id)!);
}

function CompletionBars({ stats }: { stats: CategoryStat[] }) {
  const maxPlanned = Math.max(1, ...stats.map((s) => s.tasksPlanned));

  return (
    <div className="space-y-2">
      {stats.map((stat) => (
        <div key={stat.category} className="flex items-center gap-2 text-sm">
          <span className="w-32 shrink-0 truncate text-gray-500">
            {taskCategoryLabel(stat.category)}
          </span>
          <span
            className="relative h-3 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--viz-track)" }}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(stat.tasksPlanned / maxPlanned) * 100}%`,
                backgroundColor: `var(--series-${stat.category})`,
                opacity: 0.3,
              }}
            />
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(stat.tasksCompleted / maxPlanned) * 100}%`,
                backgroundColor: `var(--series-${stat.category})`,
              }}
            />
          </span>
          <span className="w-16 shrink-0 text-right tabular-nums" style={{ color: "var(--viz-ink)" }}>
            {stat.tasksCompleted}/{stat.tasksPlanned}
          </span>
        </div>
      ))}
    </div>
  );
}

function FocusedTimeBars({ stats }: { stats: CategoryStat[] }) {
  const maxMinutes = Math.max(1, ...stats.map((s) => s.focusedMinutes));

  return (
    <div className="space-y-2">
      {stats.map((stat) => (
        <div key={stat.category} className="flex items-center gap-2 text-sm">
          <span className="w-32 shrink-0 truncate text-gray-500">
            {taskCategoryLabel(stat.category)}
          </span>
          <span
            className="relative h-3 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--viz-track)" }}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(stat.focusedMinutes / maxMinutes) * 100}%`,
                backgroundColor: `var(--series-${stat.category})`,
              }}
            />
          </span>
          <span className="w-16 shrink-0 text-right tabular-nums" style={{ color: "var(--viz-ink)" }}>
            {formatMinutes(stat.focusedMinutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

function WindowPanel({ title, window }: { title: string; window: AnalyticsWindow }) {
  const stats = orderedStats(window);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mb-1 text-xs text-gray-500">Tasks completed</p>
      <CompletionBars stats={stats} />
      <p className="mt-3 mb-1 text-xs text-gray-500">Focused time</p>
      <FocusedTimeBars stats={stats} />
    </div>
  );
}

export function WeeklyMonthlyChart({
  analytics,
  trends,
}: {
  analytics: DashboardAnalytics;
  trends: DashboardTrends;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const allCategories = new Set<TaskCategory>([
    ...analytics.week.byCategory.map((s) => s.category),
    ...analytics.month.byCategory.map((s) => s.category),
  ]);
  const legendCategories = TASK_CATEGORY_IDS.filter((id) => allCategories.has(id));

  return (
    <div className="dashboard-viz space-y-4">
      <div className="flex items-center justify-between gap-3">
        <CategoryLegend categories={legendCategories} />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "week" | "month")}
          className="rounded-md border border-gray-300 bg-white/80 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900/80"
        >
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
      </div>
      <WindowPanel
        title={period === "week" ? "This week" : "This month"}
        window={analytics[period]}
      />
      <CompletionTrendChart points={trends[period]} />
    </div>
  );
}
