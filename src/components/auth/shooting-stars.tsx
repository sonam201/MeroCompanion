import type { CSSProperties } from "react";

const STREAKS = [
  { x: "5%", y: "8%", delay: "0s", duration: "7.5s" },
  { x: "55%", y: "4%", delay: "2.8s", duration: "8.5s" },
  { x: "20%", y: "35%", delay: "5.4s", duration: "7s" },
  { x: "70%", y: "20%", delay: "9.2s", duration: "9s" },
];

// Landing-page-only accent, layered between the background photo and the
// sign-up/sign-in content - see globals.css's .shooting-stars comment for
// why this is an original implementation, not shadcn.io's component.
export function ShootingStars() {
  return (
    <div className="shooting-stars" aria-hidden="true">
      {STREAKS.map((s, i) => (
        <span
          key={i}
          className="shooting-star"
          style={
            {
              "--x": s.x,
              "--y": s.y,
              "--delay": s.delay,
              "--duration": s.duration,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
