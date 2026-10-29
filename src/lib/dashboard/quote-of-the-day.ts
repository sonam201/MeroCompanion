import quotes from "./quotes.json";

// 400 quotes, curated once (not fetched live) from open sources - see
// quotes.json's own header comment at generation time. ZenQuotes.io
// (free, keyless API), vinitshahdeo/inspirational-quotes (MIT),
// bmumz/inspirational-quotes-api (MIT), and a filtered slice of
// akhiltak/inspirational-quotes' Quotes.csv (MIT), deduplicated.
export type Quote = { quote: string; author: string };

const QUOTES = quotes as Quote[];

// A fixed epoch plus a day index modulo the pool size: the same calendar
// date always maps to the same quote (stable across reloads and for every
// visitor that day), and since the pool has more entries than a year has
// days, any run of 365 (or 366, for a leap year) consecutive days never
// repeats a quote - no state/DB needed to enforce that.
const EPOCH = new Date("2024-01-01T00:00:00Z").getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getQuoteOfTheDay(now: Date = new Date()): Quote {
  const daysSinceEpoch = Math.floor((now.getTime() - EPOCH) / MS_PER_DAY);
  const index = ((daysSinceEpoch % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[index];
}
