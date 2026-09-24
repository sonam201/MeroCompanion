import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">MeroCompanion</h1>
      <p className="max-w-md text-gray-500">
        Track job-search tasks and goals, run focused Pomodoro sessions, and get
        reminder emails on your own schedule.
      </p>
      {session?.user ? (
        <Link
          href="/dashboard"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Go to dashboard
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/sign-up"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-700"
          >
            Sign in
          </Link>
        </div>
      )}
    </main>
  );
}
