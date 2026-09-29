"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Mock data - tasks completed per day this week. Replace with a real query
// once task CRUD exists (COUNT(*) FROM tasks WHERE status = 'done' AND
// completed on that day, grouped by day, scoped to the signed-in user).
const weeklyData = [
  { day: "Mon", completed: 3 },
  { day: "Tue", completed: 5 },
  { day: "Wed", completed: 2 },
  { day: "Thu", completed: 6 },
  { day: "Fri", completed: 4 },
  { day: "Sat", completed: 1 },
  { day: "Sun", completed: 0 },
];

const SERIES_COLOR = "#2a78d6"; // dataviz skill: categorical slot 1 (blue)
const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#898781";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} tasks completed</p>
    </div>
  );
}

export function WeeklyProgressChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
        <CardDescription>Tasks completed per day</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={{ stroke: AXIS_COLOR }}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                width={28}
              />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} />
              <Bar dataKey="completed" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
