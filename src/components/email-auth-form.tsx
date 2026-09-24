import { signIn } from "@/lib/auth";

export function EmailAuthForm({ submitLabel }: { submitLabel: string }) {
  return (
    <form
      className="mt-6 flex flex-col gap-3"
      action={async (formData) => {
        "use server";
        await signIn("resend", {
          email: formData.get("email"),
          redirectTo: "/dashboard",
        });
      }}
    >
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {submitLabel}
      </button>
    </form>
  );
}
