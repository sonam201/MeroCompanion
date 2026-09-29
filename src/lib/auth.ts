import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { hashOtp } from "@/lib/otp";
import { clearAttempts, isUnderRateLimit, recordAttempt } from "@/lib/rate-limit";

const PASSWORD_FAIL_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_FAIL_MAX = 5;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No adapter: with only the Credentials provider (no OAuth, no Email
  // provider) and JWT sessions, Auth.js needs no adapter-managed
  // users/accounts/sessions bookkeeping - authorize() below manages the
  // `users` table directly.
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "Code", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        if (typeof email !== "string" || !email) {
          return null;
        }

        const otp = credentials?.otp;
        if (typeof otp === "string" && otp.length > 0) {
          // Sign-up / email-verification path: a one-time code, not a
          // password. Consumed on first attempt regardless of outcome so a
          // leaked/guessed code can't be retried.
          const [tokenRow] = await db
            .select()
            .from(verificationTokens)
            .where(eq(verificationTokens.identifier, email));

          if (!tokenRow) {
            return null;
          }

          await db
            .delete(verificationTokens)
            .where(eq(verificationTokens.identifier, email));

          if (tokenRow.expires < new Date() || tokenRow.token !== hashOtp(otp)) {
            return null;
          }

          let [user] = await db.select().from(users).where(eq(users.email, email));
          if (!user) {
            [user] = await db
              .insert(users)
              .values({ email, emailVerified: new Date() })
              .returning();
          } else if (!user.emailVerified) {
            [user] = await db
              .update(users)
              .set({ emailVerified: new Date() })
              .where(eq(users.id, user.id))
              .returning();
          }

          return { id: user.id, email: user.email, name: user.name };
        }

        const password = credentials?.password;
        if (typeof password !== "string" || !password) {
          return null;
        }

        const failKey = `password-fail:${email}`;
        // Checked before touching the user row so a locked-out attempt and a
        // wrong-password attempt are indistinguishable to the caller (both
        // just return null -> the same generic sign-in error).
        if (!(await isUnderRateLimit(failKey, PASSWORD_FAIL_WINDOW_MS, PASSWORD_FAIL_MAX))) {
          return null;
        }

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user?.password || !user.emailVerified) {
          await recordAttempt(failKey);
          return null;
        }

        const passwordMatches = await compare(password, user.password);
        if (!passwordMatches) {
          await recordAttempt(failKey);
          return null;
        }

        await clearAttempts(failKey);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
});
