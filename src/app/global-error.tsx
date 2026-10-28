"use client";

import { useEffect } from "react";

// Only catches errors that escape the root layout itself (very rare - a
// normal render error is caught by error.tsx instead, which stays inside the
// styled layout). This one can't rely on the root layout rendering at all, so
// it provides its own bare <html>/<body> per the Next.js convention.
export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center font-sans">
        <p className="text-sm font-medium tracking-wide text-gray-400 uppercase">500</p>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-gray-500">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
