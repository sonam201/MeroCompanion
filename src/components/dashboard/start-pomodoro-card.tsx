import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mock data - the task scheduled closest to the current time of day.
// Replace once task CRUD exists: pick the task with the nearest
// scheduled_at to now() that isn't done yet, for the signed-in user.
const nextTask = {
  title: "Apply to 3 frontend roles",
  time: "2:00 PM",
  tag: "Application",
  estimatedPomodoros: 2,
};

export function StartPomodoroCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Next up</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{nextTask.tag}</Badge>
            <span className="text-sm text-muted-foreground">{nextTask.time}</span>
          </div>
          <p className="mt-2 font-medium text-foreground">{nextTask.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ~{nextTask.estimatedPomodoros} focus sessions
          </p>
        </div>

        <Button size="lg" className="w-full">
          Let&apos;s start
        </Button>
      </CardContent>
    </Card>
  );
}
