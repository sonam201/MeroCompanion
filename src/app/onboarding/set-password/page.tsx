import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ToastOnMount } from "@/components/toast-on-mount";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { error } = await searchParams;

  async function setPassword(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) {
      redirect("/sign-in");
    }

    const password = formData.get("password");
    const confirm = formData.get("confirm");

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password !== confirm
    ) {
      redirect("/onboarding/set-password?error=1");
    }

    const passwordHash = await hash(password, 10);
    await db.update(users).set({ password: passwordHash }).where(eq(users.id, session.user.id));

    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Set a password</h1>
        <p className="mt-2 text-sm text-gray-500">
          You&apos;re signed in. Set a password so you can sign in with your email next time,
          without waiting on another email.
        </p>

        <ToastOnMount
          message={error ? "Passwords must match (min. 8 characters)." : undefined}
        />

        <form className="mt-6 flex flex-col gap-3" action={setPassword}>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="New password (min. 8 characters)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            placeholder="Confirm password"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Save password
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          <Link href="/dashboard" className="underline">
            Skip for now
          </Link>
        </p>
      </div>
    </main>
  );
}
