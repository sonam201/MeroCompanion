"use client";

import Image from "next/image";
import { useState } from "react";
import { EmailOtpSignupForm } from "@/components/auth/email-otp-signup-form";
import { PasswordSignInForm } from "@/components/auth/password-sign-in-form";

type Panel = "signin" | "signup" | null;

export function AuthLanding({
  initialPanel,
  currentPath,
  error,
}: {
  initialPanel: Panel;
  currentPath: string;
  error?: string;
}) {
  const [panel, setPanel] = useState<Panel>(initialPanel);

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden">
      <Image src="/time.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      {/* Low-opacity light wash: keeps the bright photo intact while giving the text a
          contrast floor regardless of which part of the image sits behind it. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0.15), rgba(255,255,255,0.45))",
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 p-8 text-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 drop-shadow-sm">
            MeroCompanion
          </h1>
          <p className="mt-2 text-gray-800 drop-shadow-sm">
            Track job-search tasks and goals, run focused Pomodoro sessions, and get reminder
            emails on your own schedule.
          </p>
        </div>

        {panel === null && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPanel("signup")}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-transform duration-150 hover:scale-105 hover:bg-gray-800"
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => setPanel("signin")}
              className="rounded-md border border-gray-900/20 bg-white/70 px-4 py-2 text-sm font-medium text-gray-900 backdrop-blur transition-transform duration-150 hover:scale-105 hover:bg-white"
            >
              Sign in
            </button>
          </div>
        )}

        {panel === "signup" && (
          <div className="w-full rounded-lg bg-white/80 p-6 text-left shadow-lg backdrop-blur">
            <h2 className="text-center text-lg font-semibold text-gray-900">
              Create your account
            </h2>
            <p className="mt-1 text-center text-sm text-gray-600">
              Verify your email with a code, then set a password.
            </p>

            <EmailOtpSignupForm />

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setPanel("signin")}
                className="underline"
              >
                Sign in
              </button>
            </p>
          </div>
        )}

        {panel === "signin" && (
          <div className="w-full rounded-lg bg-white/80 p-6 text-left shadow-lg backdrop-blur">
            <h2 className="text-center text-lg font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-center text-sm text-gray-600">
              Sign in with your email and password.
            </p>

            {error && (
              <p className="mt-3 text-center text-sm text-red-600">
                That email/password combination didn&apos;t work.
              </p>
            )}

            <PasswordSignInForm redirectTo="/dashboard" currentPath={currentPath} />

            <p className="mt-4 text-center text-sm text-gray-600">
              New here?{" "}
              <button
                type="button"
                onClick={() => setPanel("signup")}
                className="underline"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
