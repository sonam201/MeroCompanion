"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export async function signInWithGoogleAction(redirectTo: string) {
  await signIn("google", { redirectTo });
}

export async function signInWithPasswordAction(
  redirectTo: string,
  currentPath: string,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`${currentPath}?error=CredentialsSignin`);
    }
    throw err;
  }
}

export async function signUpWithEmailAction(redirectTo: string, formData: FormData) {
  await signIn("resend", {
    email: formData.get("email"),
    redirectTo,
  });
}
