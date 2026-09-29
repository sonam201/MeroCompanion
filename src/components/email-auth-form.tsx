"use client";

import { signUpWithEmailAction } from "@/lib/auth-actions";

export function EmailAuthForm({
  submitLabel,
  redirectTo = "/dashboard",
}: {
  submitLabel: string;
  redirectTo?: string;
}) {
  const action = signUpWithEmailAction.bind(null, redirectTo);

  return (
    <form className="mt-6 flex flex-col gap-3" action={action}>
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="rounded-md border border-gray-300 bg-white/80 px-3 py-2 text-sm text-gray-900"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        {submitLabel}
      </button>
    </form>
  );
}
