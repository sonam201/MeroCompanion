// Compact replacement for the full month calendar on the main dashboard -
// just today's day/date as a small reference. The full MonthCalendar now
// lives on /dashboard/plan-day instead, where picking a day actually matters.
export function TodayLabel() {
  const today = new Date();
  const dayLabel = today.toLocaleDateString(undefined, { weekday: "long" });
  const dateLabel = today.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <div className="dashboard-card p-3 min-[400px]:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Today</p>
      <p className="mt-1 text-lg font-semibold">{dayLabel}</p>
      <p className="text-sm text-gray-500">{dateLabel}</p>
    </div>
  );
}
