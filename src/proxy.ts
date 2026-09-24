import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedPrefixes = ["/dashboard", "/onboarding"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Already signed in and clicking a (possibly stale) magic-link email:
  // skip re-processing the token and just go to the dashboard, instead of
  // creating another redundant session.
  if (pathname.startsWith("/api/auth/callback/") && req.auth) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !req.auth) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
