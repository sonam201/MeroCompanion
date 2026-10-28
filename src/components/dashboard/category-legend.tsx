import { taskCategoryLabel, type TaskCategory } from "@/lib/dashboard/categories";

export function CategoryLegend({ categories }: { categories: TaskCategory[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      {categories.map((category) => (
        <li key={category} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: `var(--series-${category})` }}
            aria-hidden
          />
          {taskCategoryLabel(category)}
        </li>
      ))}
    </ul>
  );
}
