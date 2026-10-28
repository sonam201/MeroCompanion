"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { requestSignupOtpAction, verifySignupOtpAction } from "@/lib/auth-actions";

export function EmailOtpSignupForm() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await requestSignupOtpAction(email);
    setPending(false);
    if (result.ok) {
      toast.success("Verification code sent — check your inbox.");
      setStep("otp");
    } else {
      toast.error(result.error ?? "Couldn't send the code.");
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    // On success this redirects and never returns; only a failure resolves here.
    const result = await verifySignupOtpAction(email, otp);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Incorrect or expired code.");
    } else {
      toast.success("Verified! Setting up your account…");
    }
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerify} className="mt-6 flex flex-col gap-3">
        <p className="text-base text-gray-600">We sent a code to {email}.</p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="6-digit code"
          className="rounded-md border border-gray-300 bg-white/80 px-3 py-2 text-base text-gray-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          {pending ? "Verifying..." : "Verify & continue"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setOtp("");
          }}
          className="text-xs text-gray-500 underline"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="mt-6 flex flex-col gap-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="rounded-md border border-gray-300 bg-white/80 px-3 py-2 text-base text-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send verification code"}
      </button>
    </form>
  );
}
