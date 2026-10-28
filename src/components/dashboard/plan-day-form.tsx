"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  clearDayPlan,
  copyDayPlan,
  createDayPlan,
  type CreateDayPlanInput,
} from "@/app/dashboard/actions";
import { TASK_CATEGORIES, type TaskCategory } from "@/lib/dashboard/categories";
import type { PlannedTask } from "@/lib/dashboard/queries";

type TaskRow = { title: string; time: string; endTime?: string; category: TaskCategory };

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const ROW_HEIGHT_REM = 2.75;

function hourOf(time: string): number {
  return parseInt(time.split(":")[0] ?? "0", 10);
}

function minuteOf(time: string): number {
  return parseInt(time.split(":")[1] ?? "0", 10);
}

function formatHourLabel(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", hour12: true });
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Date.toISOString() always reports UTC, so naively slicing it after local
// date arithmetic silently shifts by a day on any client not running in UTC.
// Shifting by the local offset before formatting corrects for that.
function toLocalDateString(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dayBefore(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return toLocalDateString(d);
}

// Point-in-time tasks (no endTime) occupy just their own hour. A task with an
// endTime spans every hour from its start up to (and including, if the end
// falls partway through an hour) its end - that's the "merge into the slot"
// behavior; without an end time it stays individual.
function endHourExclusive(row: TaskRow): number {
  if (!row.endTime) return hourOf(row.time) + 1;
  const h = hourOf(row.endTime);
  return minuteOf(row.endTime) > 0 ? h + 1 : h;
}

function taskSpanHours(row: TaskRow): number {
  return Math.max(1, endHourExclusive(row) - hourOf(row.time));
}

type PopupState = { hour: number; editingIndex: number | null };

export function PlanDayForm({
  date,
  isToday,
  enabledCategories,
  initialTasks,
  plannedDates,
}: {
  date: string;
  isToday: boolean;
  enabledCategories: TaskCategory[];
  initialTasks: PlannedTask[];
  plannedDates: string[];
}) {
  const router = useRouter();
  const defaultCategory = enabledCategories[0] ?? "other";
  const [rows, setRows] = useState<TaskRow[]>(
    initialTasks.map((t) => ({
      title: t.title,
      time: t.time,
      endTime: t.endTime,
      category: t.category,
    })),
  );

  const [popup, setPopup] = useState<PopupState | null>(null);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupTime, setPopupTime] = useState("");
  const [popupEndTime, setPopupEndTime] = useState("");
  const [popupCategory, setPopupCategory] = useState<TaskCategory>(defaultCategory);

  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [copyFromDate, setCopyFromDate] = useState(plannedDates[0] ?? "");

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: CreateDayPlanInput) => createDayPlan(input),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Day plan saved — ${result.created} task${result.created === 1 ? "" : "s"}.`);
        router.refresh();
      } else {
        toast.error(
          {
            empty: "Add at least one task.",
            duplicate_time: "Two tasks can't share the same time - pick distinct times.",
            disabled_category: "One of the selected categories isn't enabled for your account.",
          }[result.error],
        );
      }
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearDayPlan({ date }),
    onSuccess: () => {
      toast.success(`Cleared ${date}.`);
      setRows([]);
      setConfirmClearOpen(false);
      router.refresh();
    },
  });

  const copyMutation = useMutation({
    mutationFn: (vars: { sourceDate: string; overwrite?: boolean }) =>
      copyDayPlan({ sourceDate: vars.sourceDate, targetDate: date, overwrite: vars.overwrite }),
    onSuccess: (result, vars) => {
      if (!result.ok) {
        const proceed = window.confirm(`${date} already has tasks and will be replaced. Continue?`);
        if (proceed) {
          copyMutation.mutate({ sourceDate: vars.sourceDate, overwrite: true });
        }
        return;
      }
      toast.success(`Copied from ${vars.sourceDate} onto ${date}.`);
      router.refresh();
    },
  });

  const openAddPopup = (hour: number) => {
    setPopup({ hour, editingIndex: null });
    setPopupTitle("");
    setPopupTime(`${hour.toString().padStart(2, "0")}:00`);
    setPopupEndTime("");
    setPopupCategory(defaultCategory);
  };

  const openEditPopup = (index: number) => {
    const row = rows[index];
    setPopup({ hour: hourOf(row.time), editingIndex: index });
    setPopupTitle(row.title);
    setPopupTime(row.time);
    setPopupEndTime(row.endTime ?? "");
    setPopupCategory(row.category);
  };

  const closePopup = () => setPopup(null);

  const savePopup = () => {
    const title = popupTitle.trim();
    if (!title || !popupTime) return;
    if (popupEndTime && popupEndTime <= popupTime) {
      toast.error("End time must be after the start time.");
      return;
    }

    setRows((prev) => {
      const withoutEditing =
        popup?.editingIndex != null ? prev.filter((_, i) => i !== popup.editingIndex) : prev;
      if (withoutEditing.some((r) => r.time === popupTime)) {
        toast.error("Two tasks can't share the same time - pick a different one.");
        return prev;
      }
      return [
        ...withoutEditing,
        { title, time: popupTime, endTime: popupEndTime || undefined, category: popupCategory },
      ];
    });
    closePopup();
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    createMutation.mutate({
      date,
      tasks: rows.map((row) => ({
        title: row.title,
        time: row.time,
        endTime: row.endTime,
        category: row.category,
      })),
    });
  };

  const handleClear = () => setConfirmClearOpen(true);

  // Which hours are covered by a span belonging to a task that *doesn't*
  // start there - those hours render nothing of their own, since the task's
  // block (rendered at its start hour) visually extends down over them.
  const coveredHours = new Set<number>();
  for (const row of rows) {
    const start = hourOf(row.time);
    const span = taskSpanHours(row);
    for (let h = start + 1; h < start + span; h++) {
      coveredHours.add(h);
    }
  }

  const showCopyIntoThisDay = !isToday && rows.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="dashboard-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plan {date}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={clearMutation.isPending || rows.length === 0}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {clearMutation.isPending ? "Clearing…" : "Clear"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending || rows.length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {createMutation.isPending ? "Saving…" : "Save day plan"}
            </button>
          </div>
        </div>

        <div
          className="relative max-h-[32rem] overflow-y-auto"
          style={{ display: "grid", gridTemplateColumns: "4rem 1fr" }}
        >
          {HOURS.map((hour) => (
            <div
              key={`label-${hour}`}
              className="border-t border-gray-100 pt-1 pr-3 text-right text-xs text-gray-400 dark:border-gray-800"
              style={{ gridColumn: 1, gridRow: hour + 1, height: `${ROW_HEIGHT_REM}rem` }}
            >
              {formatHourLabel(hour)}
            </div>
          ))}

          {HOURS.map((hour) => {
            const startsHere = rows
              .map((row, i) => ({ row, i }))
              .filter(({ row }) => hourOf(row.time) === hour);
            const isCovered = coveredHours.has(hour);

            if (startsHere.length === 0 && !isCovered) {
              return (
                <div
                  key={`cell-${hour}`}
                  className="border-t border-gray-100 pl-3 dark:border-gray-800"
                  style={{ gridColumn: 2, gridRow: hour + 1, height: `${ROW_HEIGHT_REM}rem` }}
                >
                  <button
                    type="button"
                    onClick={() => openAddPopup(hour)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add task
                  </button>
                </div>
              );
            }

            if (startsHere.length === 0) {
              // Covered by an earlier task's span - leave empty, the
              // spanning block already visually extends over this row.
              return (
                <div
                  key={`cell-${hour}`}
                  className="border-t border-gray-100 pl-3 dark:border-gray-800"
                  style={{ gridColumn: 2, gridRow: hour + 1, height: `${ROW_HEIGHT_REM}rem` }}
                />
              );
            }

            return (
              <div
                key={`cell-${hour}`}
                className="flex flex-col gap-1 border-t border-gray-100 py-1 pl-3 dark:border-gray-800"
                style={{
                  gridColumn: 2,
                  gridRow: `${hour + 1} / span ${Math.max(...startsHere.map(({ row }) => taskSpanHours(row)))}`,
                }}
              >
                {startsHere.map(({ row, i }) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm dark:bg-blue-950/40"
                    style={{ minHeight: `${taskSpanHours(row) * ROW_HEIGHT_REM - 0.5}rem` }}
                  >
                    <button
                      type="button"
                      onClick={() => openEditPopup(i)}
                      className="flex-1 text-left"
                    >
                      <span className="font-medium">
                        {formatTimeLabel(row.time)}
                        {row.endTime ? ` – ${formatTimeLabel(row.endTime)}` : ""}
                      </span>{" "}
                      {row.title}{" "}
                      <span className="text-gray-500">
                        · {TASK_CATEGORIES.find((c) => c.id === row.category)?.label}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold">
              {popup.editingIndex != null ? "Edit task" : `Add task · ${formatHourLabel(popup.hour)}`}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePopup();
              }}
              className="mt-4 flex flex-col gap-3"
            >
              <input
                type="text"
                autoFocus
                placeholder="Task title"
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-gray-500">
                  Start time
                  <input
                    type="time"
                    value={popupTime}
                    onChange={(e) => setPopupTime(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="flex-1 text-xs text-gray-500">
                  End time (optional)
                  <input
                    type="time"
                    value={popupEndTime}
                    onChange={(e) => setPopupEndTime(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
              </div>
              <select
                value={popupCategory}
                onChange={(e) => setPopupCategory(e.target.value as TaskCategory)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {TASK_CATEGORIES.filter((c) => enabledCategories.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closePopup}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!popupTitle.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {popup.editingIndex != null ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-semibold">Clear this day?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This removes every task planned for {date}. This can&apos;t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                disabled={clearMutation.isPending}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {clearMutation.isPending ? "Clearing…" : "Yes, clear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCopyIntoThisDay && (
        <div className="dashboard-card p-4">
          <p className="text-sm font-medium">Copy into this day</p>
          <p className="mt-1 text-sm text-gray-500">
            {date} doesn&apos;t have a plan yet - start from a day you&apos;ve already planned.
          </p>

          {!copyMenuOpen && (
            <button
              type="button"
              onClick={() => setCopyMenuOpen(true)}
              className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Copy
            </button>
          )}

          {copyMenuOpen && !copyPickerOpen && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyMutation.mutate({ sourceDate: dayBefore(date) })}
                disabled={copyMutation.isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Copy from previous day
              </button>
              <button
                type="button"
                onClick={() => setCopyPickerOpen(true)}
                disabled={plannedDates.length === 0}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
                title={plannedDates.length === 0 ? "No previously planned days yet" : undefined}
              >
                Copy from a day
              </button>
            </div>
          )}

          {copyPickerOpen && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={copyFromDate}
                onChange={(e) => setCopyFromDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                {plannedDates.map((d) => (
                  <option key={d} value={d}>
                    {formatDateLabel(d)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => copyMutation.mutate({ sourceDate: copyFromDate })}
                disabled={!copyFromDate || copyMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {copyMutation.isPending ? "Copying…" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopyPickerOpen(false);
                  setCopyMenuOpen(false);
                }}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
