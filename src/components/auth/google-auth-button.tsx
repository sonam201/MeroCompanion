"use client";

import { signInWithGoogleAction } from "@/lib/auth-actions";

export function GoogleAuthButton({ redirectTo }: { redirectTo: string }) {
  const action = signInWithGoogleAction.bind(null, redirectTo);

  return (
    <form action={action}>
      <button
        type="submit"
        className="w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm font-medium text-gray-900 backdrop-blur transition-colors hover:bg-white"
      >
        Continue with Google
      </button>
    </form>
  );
}
