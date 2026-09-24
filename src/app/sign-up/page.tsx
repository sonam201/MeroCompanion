import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { EmailAuthForm } from "@/components/email-auth-form";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter your email and we&apos;ll send you a link to get started — no password
          needed. This is also the address your reminder emails will go to.
        </p>

        <EmailAuthForm submitLabel="Send sign-up link" />

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
