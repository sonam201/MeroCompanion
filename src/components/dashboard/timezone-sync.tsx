"use client";

import { useEffect } from "react";
import { syncUserTimezone } from "@/app/dashboard/actions";

// Renders nothing - just opportunistically reports the browser's timezone to
// the server on every dashboard load, so the missed-task-reminder cron job
// has a real per-user timezone to work with instead of defaulting everyone
// to UTC. See specs/004-missed-pomodoro-reminders/research.md §2.
export function TimezoneSync() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void syncUserTimezone({ timezone });
  }, []);

  return null;
}
