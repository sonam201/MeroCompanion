"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
      <p className="text-sm font-medium tracking-wide text-gray-400 uppercase">500</p>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-gray-500">
        An unexpected error occurred. Try again, or head back to the dashboard.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
