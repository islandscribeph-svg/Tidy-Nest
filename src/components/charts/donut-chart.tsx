"use client";

import { useState } from "react";

export type DonutDatum = { label: string; value: number; color: string };

const SIZE = 160;
const CENTER = SIZE / 2;
const RADIUS = 62;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 4;

export function DonutChart({
  data,
  centerLabel,
}: {
  data: DonutDatum[];
  centerLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const nonZeroCount = data.filter((d) => d.value > 0).length;
  const gap = nonZeroCount > 1 ? GAP : 0;

  const lengths = data.map((d) => (total > 0 ? (d.value / total) * CIRCUMFERENCE : 0));
  const offsets = lengths.reduce<number[]>((acc, len, i) => [...acc, i === 0 ? 0 : acc[i - 1] + lengths[i - 1]], []);
  const segments = data.map((d, i) => {
    const len = lengths[i];
    const frac = total > 0 ? d.value / total : 0;
    return {
      ...d,
      index: i,
      percent: total > 0 ? Math.round(frac * 100) : 0,
      dasharray: `${Math.max(len - gap, 0)} ${CIRCUMFERENCE - Math.max(len - gap, 0)}`,
      dashoffset: -offsets[i],
    };
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
        <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#e1e0d9" strokeWidth={STROKE} />
          {segments.map(
            (seg) =>
              seg.value > 0 && (
                <circle
                  key={seg.label}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hovered === seg.index ? STROKE + 4 : STROKE}
                  strokeDasharray={seg.dasharray}
                  strokeDashoffset={seg.dashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-width 120ms ease" }}
                  onMouseEnter={() => setHovered(seg.index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>
                    {seg.label}: {seg.value} ({seg.percent}%)
                  </title>
                </circle>
              ),
          )}
        </g>
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="fill-neutral-900 text-xl font-semibold">
          {total}
        </text>
        <text x={CENTER} y={CENTER + 14} textAnchor="middle" className="fill-neutral-400 text-[10px] uppercase">
          {centerLabel}
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((seg) => (
          <li
            key={seg.label}
            className="flex items-center gap-2 text-sm"
            onMouseEnter={() => setHovered(seg.index)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: seg.color, opacity: hovered === null || hovered === seg.index ? 1 : 0.4 }}
            />
            <span
              className={`min-w-0 flex-1 truncate ${hovered === seg.index ? "text-neutral-900" : "text-neutral-600"}`}
            >
              {seg.label}
            </span>
            <span className="shrink-0 text-neutral-500">
              <span className="font-medium text-neutral-900">{seg.value}</span> ({seg.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
