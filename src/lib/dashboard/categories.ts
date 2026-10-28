export const TASK_CATEGORIES = [
  { id: "other", label: "Other" },
  { id: "study", label: "Study Mode" },
  { id: "job_application", label: "Job Application Mode" },
  { id: "work", label: "Work" },
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number]["id"];

export const TASK_CATEGORY_IDS = TASK_CATEGORIES.map((c) => c.id) as TaskCategory[];

export function isTaskCategory(value: string): value is TaskCategory {
  return (TASK_CATEGORY_IDS as string[]).includes(value);
}

export function taskCategoryLabel(id: TaskCategory): string {
  return TASK_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
