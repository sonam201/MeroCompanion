"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { endPomodoroPeriod, pausePomodoroPeriod, resumePomodoroPeriod } from "@/app/dashboard/actions";
import { playPomodoroRing } from "@/lib/dashboard/pomodoro-sound";

export type TimerPeriod = {
  id: string;
  kind: "focus" | "break";
  startedAt: string; // ISO
  plannedMinutes: number;
  pausedAt: string | null; // ISO, set while currently paused
  pausedMs: number; // accumulated paused time across prior pause/resume cycles
};

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Countdown, ring-on-zero, and pause/stop controls for one running period.
// Remaining time is always recomputed from startedAt + plannedMinutes +
// pausedMs against Date.now() (or against pausedAt while frozen) - never a
// decrementing local counter - so background-tab throttling or a reload
// can't cause drift (FR-002, SC-001). Pausing shifts the effective deadline
// forward by however long the pause lasts, rather than treating "remaining
// time" as its own mutable value.
export function PomodoroTimer({
  period,
  onEnded,
}: {
  period: TimerPeriod;
  onEnded: (reason: "completed" | "stopped") => void;
}) {
  const [pausedAt, setPausedAt] = useState<string | null>(period.pausedAt);
  const [pausedMs, setPausedMs] = useState<number>(period.pausedMs);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isPaused = pausedAt !== null;
  const endsAt = new Date(period.startedAt).getTime() + period.plannedMinutes * 60000 + pausedMs;

  // While paused, the remaining time is a pure derivation of props/state -
  // computed directly during render, no effect/setState needed. While
  // running, it's driven by the ticking interval below instead.
  const frozenRemainingMs = isPaused ? endsAt - new Date(pausedAt as string).getTime() : null;
  const [tickingRemainingMs, setTickingRemainingMs] = useState(() => endsAt - Date.now());
  const remainingMs = frozenRemainingMs ?? tickingRemainingMs;

  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    endedRef.current = false;

    if (isPaused) {
      return;
    }

    const tick = async () => {
      const remaining = endsAt - Date.now();
      setTickingRemainingMs(remaining);
      if (remaining <= 0 && !endedRef.current) {
        endedRef.current = true;
        await endPomodoroPeriod({ periodId: period.id });
        playPomodoroRing();
        toast.success(period.kind === "focus" ? "Focus period complete!" : "Break complete!");
        onEndedRef.current("completed");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt, period.id, period.kind, isPaused]);

  const handlePause = async () => {
    if (endedRef.current || isPaused) return;
    setPausing(true);
    const result = await pausePomodoroPeriod({ periodId: period.id });
    setPausing(false);
    if (result.ok) {
      toast.success("Paused.");
      setPausedAt(result.pausedAt);
    } else {
      toast.error("Couldn't pause — try again.");
    }
  };

  const handleResume = async () => {
    if (endedRef.current || !isPaused) return;
    setResuming(true);
    const result = await resumePomodoroPeriod({ periodId: period.id });
    setResuming(false);
    if (result.ok) {
      toast.success("Resumed.");
      setPausedMs(result.pausedMs);
      setPausedAt(null);
    } else {
      toast.error("Couldn't resume — try again.");
    }
  };

  const handleStop = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setStopping(true);
    await endPomodoroPeriod({ periodId: period.id });
    playPomodoroRing();
    toast.success("Stopped.");
    onEndedRef.current("stopped");
  };

  const isDone = remainingMs <= 0;
  const digitColor = period.kind === "focus" ? "text-amber-400" : "text-emerald-400";
  const digitGlow =
    period.kind === "focus"
      ? "[text-shadow:0_0_18px_rgba(251,191,36,0.55)]"
      : "[text-shadow:0_0_18px_rgba(52,211,153,0.55)]";

  return (
    <div>
      <div className="rounded-2xl bg-black px-8 py-6 text-center shadow-lg">
        <p className="text-xs tracking-[0.2em] text-gray-400 uppercase">
          {period.kind === "focus" ? "Focus" : "Break"}
          {isPaused && " · Paused"}
        </p>
        <p
          className={`font-digital mt-1 text-6xl font-bold tracking-widest tabular-nums transition-opacity sm:text-7xl ${digitColor} ${digitGlow} ${isPaused ? "opacity-50" : ""}`}
        >
          {formatRemaining(remainingMs)}
        </p>
      </div>
      {!isDone && (
        <div className="mt-3 flex gap-2">
          {isPaused ? (
            <button
              type="button"
              onClick={handleResume}
              disabled={resuming}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {resuming ? "Resuming…" : "Resume"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              disabled={pausing}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {pausing ? "Pausing…" : "Pause"}
            </button>
          )}
          <button
            type="button"
            onClick={handleStop}
            disabled={stopping}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {stopping ? "Stopping…" : "Stop"}
          </button>
        </div>
      )}
    </div>
  );
}
