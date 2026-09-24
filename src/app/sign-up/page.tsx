import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { EmailAuthForm } from "@/components/email-auth-form";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  async function signUpWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign up with Google, or verify your email and set a password.
        </p>

        <form action={signUpWithGoogle} className="mt-6">
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

        <p className="text-sm text-gray-500">
          Enter your email and we&apos;ll send you a link to verify it and set a password.
          This is also the address your reminder emails will go to.
        </p>

        <EmailAuthForm submitLabel="Send verification link" redirectTo="/onboarding/set-password" />

        <p className="mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
