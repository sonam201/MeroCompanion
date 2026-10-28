import type { TrendPoint } from "@/lib/dashboard/queries";

const WIDTH = 600;
const HEIGHT = 160;
const PADDING_LEFT = 32;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 22;

// Day-by-day completion-rate trend (0-100%) for the selected week/month -
// shows incline/decline of follow-through over time, complementing the
// per-category magnitude bars above it. Single series, so per the dataviz
// skill a legend isn't needed (the heading names it); reuses the validated
// categorical slot-1 blue already defined in .dashboard-viz.
export function CompletionTrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return null;
  }

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const xFor = (i: number) =>
    PADDING_LEFT + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const yFor = (rate: number) => PADDING_TOP + plotHeight - (rate / 100) * plotHeight;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.rate).toFixed(1)}`)
    .join(" ");

  // All labels for a week (<=10 points); thin out to ~7 labels for a month.
  const labelEvery = points.length <= 10 ? 1 : Math.ceil(points.length / 7);

  return (
    <div className="dashboard-viz">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        Completion rate trend
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Daily completion rate trend"
      >
        {[0, 50, 100].map((gridRate) => (
          <g key={gridRate}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={yFor(gridRate)}
              y2={yFor(gridRate)}
              stroke="var(--viz-track)"
              strokeWidth={1}
            />
            <text
              x={PADDING_LEFT - 6}
              y={yFor(gridRate) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--viz-ink)"
            >
              {gridRate}%
            </text>
          </g>
        ))}
        <path d={linePath} fill="none" stroke="var(--series-other)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={p.date} cx={xFor(i)} cy={yFor(p.rate)} r={3} fill="var(--series-other)" />
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text
              key={`label-${p.date}`}
              x={xFor(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--viz-ink)"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
