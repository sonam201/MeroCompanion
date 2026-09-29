import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitAttempts } from "@/lib/db/schema";

// Sliding-window check: true if `key` has fewer than `max` recorded attempts
// within the last `windowMs`. Does not record anything itself - call
// recordAttempt separately once the caller decides the attempt counts.
export async function isUnderRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimitAttempts)
    .where(and(eq(rateLimitAttempts.key, key), gte(rateLimitAttempts.createdAt, since)));

  return Number(row?.count ?? 0) < max;
}

export async function recordAttempt(key: string): Promise<void> {
  await db.insert(rateLimitAttempts).values({ key });
}

export async function clearAttempts(key: string): Promise<void> {
  await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
}
