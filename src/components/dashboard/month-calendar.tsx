"use client";

import { useRouter } from "next/navigation";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

// Clickable month grid for the Plan-your-day page: shows the month
// containing `selectedDate`, highlights it, and navigates to
// /dashboard/plan-day?date=... when another day is clicked. Day drill-down
// beyond switching which day the form plans for is still out of scope.
export function MonthCalendar({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const today = new Date();
  const selected = new Date(`${selectedDate}T00:00:00`);

  const year = selected.getFullYear();
  const month = selected.getMonth();
  const monthLabel = selected.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<number | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="dashboard-card p-4">
      <p className="mb-3 text-sm font-medium">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} />;
          }

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSelected = dateStr === selectedDate;
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <button
              key={i}
              type="button"
              onClick={() => router.push(`/dashboard/plan-day?date=${dateStr}`)}
              className={
                isSelected
                  ? "flex aspect-square items-center justify-center rounded-full bg-blue-600 font-semibold text-white"
                  : isToday
                    ? "flex aspect-square items-center justify-center rounded-full border border-blue-600 font-medium"
                    : "flex aspect-square items-center justify-center rounded-full transition hover:bg-gray-100 dark:hover:bg-gray-800"
              }
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
