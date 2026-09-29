"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Just date/day display for now - clicking a date doesn't drill into a full
// day view yet. That's a deliberately deferred follow-up, not an oversight.
export function MiniCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar mode="single" selected={date} onSelect={setDate} className="p-0" />
      </CardContent>
    </Card>
  );
}
