import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthLanding } from "@/components/auth/auth-landing";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <AuthLanding
      initialPanel={error ? "signin" : "signup"}
      currentPath="/sign-up"
      error={error}
    />
  );
}
