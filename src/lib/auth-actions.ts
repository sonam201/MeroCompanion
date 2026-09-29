"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { verificationTokens } from "@/lib/db/schema";
import { generateOtp, hashOtp } from "@/lib/otp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;

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

export async function requestSignupOtpAction(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const code = generateOtp();

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashOtp(code),
    expires: new Date(Date.now() + OTP_TTL_MS),
  });

  const resend = new Resend(process.env.AUTH_RESEND_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "Your MeroCompanion verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });

  if (error) {
    return { ok: false, error: "Couldn't send the code. Try again." };
  }

  return { ok: true };
}

export async function verifySignupOtpAction(
  email: string,
  otp: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await signIn("credentials", { email, otp, redirectTo: "/onboarding/set-password" });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Incorrect or expired code." };
    }
    throw err;
  }
}
