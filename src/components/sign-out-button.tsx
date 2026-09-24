import { signOut } from "@/lib/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"
      >
        Sign out
      </button>
    </form>
  );
}
