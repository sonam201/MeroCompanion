import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { PlanDayForm } from "@/components/dashboard/plan-day-form";
import {
  getEnabledTaskCategories,
  getPlannedDates,
  getPlannedTasksForDate,
} from "@/lib/dashboard/queries";

function todayIsoDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

// A malformed ?date= (wrong shape, or a calendar date that doesn't exist,
// e.g. 2026-02-30) would otherwise flow straight into the DB queries below as
// an Invalid Date, surfacing as a raw 500 instead of a clean 404.
function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // Same local-offset correction as todayIsoDate() above - a naive
  // toISOString() here would shift by a day on any non-UTC server and
  // reject otherwise-valid dates.
  const offset = d.getTimezoneOffset();
  const normalized = new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
  return normalized === value;
}

export default async function PlanDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const { date: dateParam } = await searchParams;
  if (dateParam !== undefined && !isValidIsoDate(dateParam)) {
    notFound();
  }
  const today = todayIsoDate();
  const date = dateParam ?? today;

  const [enabledCategories, initialTasks, plannedDates] = await Promise.all([
    getEnabledTaskCategories(session.user.id),
    getPlannedTasksForDate(session.user.id, date),
    getPlannedDates(session.user.id, date),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-3 min-[400px]:p-4 sm:p-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-block rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Plan your day</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <PlanDayForm
          key={date}
          date={date}
          isToday={date === today}
          enabledCategories={enabledCategories}
          initialTasks={initialTasks}
          plannedDates={plannedDates}
        />
        <MonthCalendar selectedDate={date} />
      </div>
    </main>
  );
}
