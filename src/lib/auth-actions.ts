"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { sendMail } from "@/lib/mailer";
import { generateOtp, hashOtp } from "@/lib/otp";
import { isUnderRateLimit, recordAttempt } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_HOURLY_WINDOW_MS = 60 * 60 * 1000;
const OTP_HOURLY_MAX = 5;

export async function signInWithPasswordAction(
  redirectTo: string,
  currentPath: string,
  formData: FormData,
) {
  const email = formData.get("email");

  if (typeof email === "string" && email) {
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (!existing) {
      redirect(`${currentPath}?error=NoAccount`);
    }
  }

  try {
    await signIn("credentials", {
      email,
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

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing?.emailVerified) {
    return { ok: false, error: "This email is already registered. Sign in instead." };
  }

  const rateLimitKey = `otp-request:${email}`;
  const [underCooldown, underHourlyCap] = await Promise.all([
    isUnderRateLimit(rateLimitKey, OTP_COOLDOWN_MS, 1),
    isUnderRateLimit(rateLimitKey, OTP_HOURLY_WINDOW_MS, OTP_HOURLY_MAX),
  ]);
  if (!underCooldown || !underHourlyCap) {
    return { ok: false, error: "Too many requests. Try again shortly." };
  }
  await recordAttempt(rateLimitKey);

  const code = generateOtp();

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashOtp(code),
    expires: new Date(Date.now() + OTP_TTL_MS),
  });

  const result = await sendMail({
    to: email,
    subject: "Your MeroCompanion verification code",
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });

  if (!result.ok) {
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
