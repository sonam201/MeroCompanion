import { AuthError } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  async function signInWithPassword(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/sign-in?error=CredentialsSignin");
      }
      throw err;
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in with Google or your password.</p>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            That email/password combination didn&apos;t work.
          </p>
        )}

        <form action={signInWithGoogle} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium dark:border-gray-700"
          >
            Continue with Google
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          or
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <form action={signInWithPassword} className="flex flex-col gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="password"
            name="password"
            required
            placeholder="Password"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="submit"
            className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Sign in
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500">
          New here?{" "}
          <Link href="/sign-up" className="underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
