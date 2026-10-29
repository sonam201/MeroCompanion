import { getQuoteOfTheDay } from "@/lib/dashboard/quote-of-the-day";

export function QuoteCard() {
  const { quote, author } = getQuoteOfTheDay();

  return (
    <div className="dashboard-card p-3 min-[400px]:p-4">
      <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
        Today&apos;s motivation
      </p>
      <p className="mt-2 text-base leading-snug text-gray-800 italic dark:text-gray-200">
        “{quote}”
      </p>
      <p className="mt-2 text-sm text-gray-500">— {author}</p>
    </div>
  );
}
