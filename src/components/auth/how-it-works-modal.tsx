"use client";

import { useRef, useState } from "react";

type Feature = { emoji: string; title: string; body: string };

const FEATURES: Feature[] = [
  {
    emoji: "🗓️",
    title: "Plan your day",
    body: "Add the things you want to get done today and pick a time for each one. See your whole day laid out on one simple timeline.",
  },
  {
    emoji: "⏱️",
    title: "Focus with Pomodoro",
    body: "Start a focus timer right from any task. Work, then take a break when it rings - pause and resume anytime, even after a refresh.",
  },
  {
    emoji: "📊",
    title: "See your progress",
    body: "Watch how many tasks you finish each week and month, how much focused time you put in, and how many days in a row you follow through.",
  },
  {
    emoji: "📧",
    title: "Never miss a plan",
    body: "Forget to start something you planned? We'll quietly email you a reminder, so a busy day doesn't mean a forgotten task.",
  },
  {
    emoji: "🔒",
    title: "Free, and yours alone",
    body: "Sign up with just your email - no credit card, ever. Everything you plan and track stays private to your account.",
  },
];

// A click-to-open, swipe-through explainer for first-time visitors on the
// landing page. Cards are plain scroll-snapped full-width panels rather than
// a JS carousel library - simplest thing that gives the "one feature at a
// time, swipe for the next" feel on both touch and mouse-drag scrolling.
export function HowItWorksModal() {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToCard = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: (el.scrollWidth / FEATURES.length) * index, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / FEATURES.length;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(FEATURES.length - 1, Math.max(0, index)));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        className="how-it-works-trigger rounded-full border border-gray-900/15 bg-white/70 px-4 py-1.5 text-sm font-medium text-gray-800 backdrop-blur transition-transform duration-150 hover:scale-105 hover:bg-white"
      >
        What is MeroCompanion?
      </button>

      {open && (
        <div
          className="how-it-works-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="how-it-works-panel relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              ✕
            </button>

            <h2 className="pr-8 text-lg font-semibold text-gray-900">How MeroCompanion works</h2>
            <p className="mt-1 text-sm text-gray-500">Swipe through - five things, five seconds each.</p>

            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {FEATURES.map((feature, i) => (
                <div
                  key={feature.title}
                  className="flex w-full shrink-0 snap-center flex-col items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center"
                >
                  <span className="text-4xl">{feature.emoji}</span>
                  <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
                    {i + 1} of {FEATURES.length}
                  </p>
                  <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-center gap-1.5">
              {FEATURES.map((feature, i) => (
                <button
                  key={feature.title}
                  type="button"
                  aria-label={`Go to "${feature.title}"`}
                  onClick={() => scrollToCard(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
