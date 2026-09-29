import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const [user] = await db
    .select({ password: users.password })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">Signed in as {session.user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {!user?.password && (
        <div className="rounded-md border border-gray-300 p-4 text-sm dark:border-gray-700">
          You don&apos;t have a password set yet, so sign-in still requires a fresh emailed
          code each time.{" "}
          <Link href="/onboarding/set-password" className="underline">
            Set one now
          </Link>
          .
        </div>
      )}

      <p className="text-sm text-gray-500">
        Tasks, goals, and Pomodoro sessions land here next.
      </p>
    </main>
  );
}
