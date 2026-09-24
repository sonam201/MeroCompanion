import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EmailAuthForm } from "@/components/email-auth-form";

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;ll email you a link to sign in — no password needed. This is also the
          address your reminder emails will go to.
        </p>

        <EmailAuthForm submitLabel="Send sign-in link" />

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
