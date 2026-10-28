"use client";

import { signInWithPasswordAction } from "@/lib/auth-actions";

export function PasswordSignInForm({
  redirectTo,
  currentPath,
}: {
  redirectTo: string;
  currentPath: string;
}) {
  const action = signInWithPasswordAction.bind(null, redirectTo, currentPath);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="rounded-md border border-gray-300 bg-white/80 px-3 py-2 text-base text-gray-900"
      />
      <input
        type="password"
        name="password"
        required
        placeholder="Password"
        className="rounded-md border border-gray-300 bg-white/80 px-3 py-2 text-base text-gray-900"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white transition-colors hover:bg-gray-800"
      >
        Sign in
      </button>
    </form>
  );
}
