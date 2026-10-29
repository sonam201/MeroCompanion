import type { CSSProperties } from "react";

const STAR_COUNT = 70;

// Deterministic PRNG so star positions are stable across server renders
// (no hydration mismatch, no client JS needed for layout).
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Ambient background for every page (mounted once in the root layout).
// Deliberately colorless/low-opacity - see globals.css's .star-field
// comment for why: it should never tint or darken a page's own background.
export function StarField() {
  const rand = seededRandom(20261030);
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    top: `${(rand() * 100).toFixed(2)}%`,
    left: `${(rand() * 100).toFixed(2)}%`,
    size: (rand() * 1.4 + 0.6).toFixed(2),
    delay: `${(rand() * 6).toFixed(2)}s`,
    duration: `${(3 + rand() * 5).toFixed(2)}s`,
  }));

  return (
    <div className="star-field" aria-hidden="true">
      <div className="star-field-layer">
        {stars.map((s, i) => (
          <span
            key={i}
            className="star-field-dot"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
              "--twinkle-delay": s.delay,
              "--twinkle-duration": s.duration,
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
