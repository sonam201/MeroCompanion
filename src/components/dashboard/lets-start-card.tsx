"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { completeTask, startPomodoroForTask, type PomodoroKind } from "@/app/dashboard/actions";
import { PomodoroTimer, type TimerPeriod } from "@/components/dashboard/pomodoro-timer";
import { taskCategoryLabel } from "@/lib/dashboard/categories";
import { playPomodoroRing } from "@/lib/dashboard/pomodoro-sound";
import type { ActivePeriod, LetsStartTask } from "@/lib/dashboard/queries";

type Offer = { taskId: string; taskTitle: string; nextKind: PomodoroKind };

function toTimerPeriod(period: ActivePeriod): TimerPeriod {
  return {
    id: period.id,
    kind: period.kind,
    startedAt: period.startedAt.toISOString(),
    plannedMinutes: period.plannedMinutes,
    pausedAt: period.pausedAt ? period.pausedAt.toISOString() : null,
    pausedMs: period.pausedMs,
  };
}

export function LetsStartCard({
  task,
  activePeriod,
}: {
  task: LetsStartTask | null;
  activePeriod: ActivePeriod | null;
}) {
  const router = useRouter();

  const [currentPeriod, setCurrentPeriod] = useState<TimerPeriod | null>(
    activePeriod ? toTimerPeriod(activePeriod) : null,
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(activePeriod?.taskId ?? null);
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(
    activePeriod?.taskTitle ?? null,
  );
  const [offer, setOffer] = useState<Offer | null>(null);

  const startMutation = useMutation({
    mutationFn: (vars: { taskId: string; kind?: PomodoroKind }) => startPomodoroForTask(vars),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(
          result.error === "already_completed"
            ? "That task is already marked done."
            : "Couldn't start — try refreshing the page.",
        );
        return;
      }
      playPomodoroRing();
      toast.success(
        result.period.kind === "focus" ? "Focus period started." : "Break started.",
      );
      setCurrentPeriod({
        id: result.period.id,
        kind: result.period.kind,
        startedAt: result.period.startedAt,
        plannedMinutes: result.period.plannedMinutes,
        pausedAt: result.period.pausedAt,
        pausedMs: result.period.pausedMs,
      });
      setActiveTaskId(result.period.taskId);
      setActiveTaskTitle(result.period.taskTitle);
      setOffer(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => completeTask({ taskId }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Task marked done.");
        router.refresh();
      } else {
        toast.error("Couldn't mark that task done — try refreshing the page.");
      }
    },
  });

  // Natural completion offers the next phase without a page refresh
  // (research.md §6 - the offer is transient client state, not persisted).
  // A deliberate stop just falls back to the normal dashboard state.
  const handlePeriodEnded = (endedPeriod: TimerPeriod, reason: "completed" | "stopped") => {
    setCurrentPeriod(null);
    if (reason === "stopped" || !activeTaskId || !activeTaskTitle) {
      setOffer(null);
      router.refresh();
      return;
    }
    setOffer({
      taskId: activeTaskId,
      taskTitle: activeTaskTitle,
      nextKind: endedPeriod.kind === "focus" ? "break" : "focus",
    });
  };

  if (currentPeriod) {
    return (
      <div className="dashboard-card p-4">
        <p className="text-sm font-medium">{activeTaskTitle}</p>
        <div className="mt-2">
          <PomodoroTimer
            period={currentPeriod}
            onEnded={(reason) => handlePeriodEnded(currentPeriod, reason)}
          />
        </div>
      </div>
    );
  }

  if (offer) {
    return (
      <div className="dashboard-card p-4">
        <p className="text-sm font-medium">{offer.taskTitle}</p>
        <p className="mt-2 text-sm text-gray-500">
          {offer.nextKind === "break" ? "Focus period complete." : "Break complete."}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => startMutation.mutate({ taskId: offer.taskId, kind: offer.nextKind })}
            disabled={startMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {startMutation.isPending
              ? "Starting…"
              : offer.nextKind === "break"
                ? "Start break"
                : "Start another focus round"}
          </button>
          <button
            type="button"
            onClick={() => {
              playPomodoroRing();
              toast.success("Stopped.");
              setOffer(null);
              router.refresh();
            }}
            disabled={startMutation.isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Stop
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="dashboard-card p-4">
        <p className="text-sm font-medium">Let&apos;s start</p>
        <p className="mt-2 text-sm text-gray-500">
          Nothing left scheduled for today. Enjoy the rest of your day, or plan tomorrow now.
        </p>
      </div>
    );
  }

  const time = task.scheduledAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="dashboard-card p-4">
      <p className="text-sm font-medium">Let&apos;s start</p>
      <p className="mt-2 text-base font-semibold">{task.title}</p>
      <p className="text-sm text-gray-500">
        {time} · {taskCategoryLabel(task.category)}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => startMutation.mutate({ taskId: task.id })}
          disabled={startMutation.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {startMutation.isPending ? "Starting…" : "Start Pomodoro"}
        </button>
        <button
          type="button"
          onClick={() => completeMutation.mutate(task.id)}
          disabled={completeMutation.isPending}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {completeMutation.isPending ? "Marking done…" : "Mark done"}
        </button>
      </div>
      {startMutation.data && !startMutation.data.ok && (
        <p className="mt-2 text-sm text-red-600">Couldn&apos;t start this task. Try refreshing.</p>
      )}
    </div>
  );
}
