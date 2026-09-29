import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

// Mock data - replace once task/pomodoro-session queries exist:
// tasksCompleted = COUNT(tasks WHERE status='done' AND month = this month)
// focusedTime    = SUM(pomodoro_sessions.planned_focus_min WHERE completed AND this month)
// streakDays     = consecutive days with >=1 completed task, counting back from today
const monthlyStats = [
  { label: "Tasks completed", value: "42", sub: "this month" },
  { label: "Focused time", value: "18h 30m", sub: "this month" },
  { label: "Current streak", value: "6 days", sub: "keep it going" },
];

export function MonthlyStats() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {monthlyStats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardContent>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="mt-1 text-2xl font-semibold">{stat.value}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
