import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown until the user has at least one task scheduled for today. Once task
// CRUD exists, the dashboard page swaps this for the real widgets based on a
// query like: SELECT EXISTS(SELECT 1 FROM tasks WHERE user_id = ? AND
// scheduled_at::date = current_date).
export function EmptyDashboardState() {
  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-4 fade-in slide-in-from-bottom-4 py-16 text-center duration-700">
      <div className="animate-pulse rounded-full bg-muted p-5">
        <CalendarClock className="size-10 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Nothing planned for today yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add tasks and this dashboard turns into your day&apos;s plan — progress,
          schedule, and focus sessions, all in one place.
        </p>
      </div>
      <Button size="lg">Plan your day</Button>
    </div>
  );
}
