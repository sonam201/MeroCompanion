import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center sm:p-8">
      <p className="text-sm font-medium tracking-wide text-gray-400 uppercase">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-gray-500">
        That page doesn&apos;t exist, or you may not have access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
