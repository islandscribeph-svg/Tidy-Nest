"use client";

import { useRef, useState } from "react";

export type LinePoint = { label: string; value: number };

const VB_WIDTH = 600;
const VB_HEIGHT = 200;
const PAD = { top: 16, right: 12, bottom: 24, left: 34 };

function niceMax(max: number): number {
  if (max <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= max) return candidate;
  }
  return 10 * magnitude;
}

export function LineChart({ data, color = "#2a78d6" }: { data: LinePoint[]; color?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const chartW = VB_WIDTH - PAD.left - PAD.right;
  const chartH = VB_HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));

  const points = data.map((d, i) => ({
    ...d,
    x: PAD.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: PAD.top + chartH - (d.value / max) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? PAD.left} ${PAD.top + chartH} L ${points[0]?.x ?? PAD.left} ${PAD.top + chartH} Z`;

  const gridSteps = [0, 0.5, 1];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VB_WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHovered(nearest);
    const p = points[nearest];
    setTooltipPos({ x: (p.x / VB_WIDTH) * rect.width, y: (p.y / VB_HEIGHT) * rect.height });
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        className="w-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHovered(null)}
      >
        {gridSteps.map((step) => {
          const y = PAD.top + chartH * (1 - step);
          return (
            <g key={step}>
              <line x1={PAD.left} x2={VB_WIDTH - PAD.right} y1={y} y2={y} stroke="#e1e0d9" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" className="fill-neutral-400 text-[9px]">
                {Math.round(max * step)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={color} opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hovered !== null && (
          <line
            x1={points[hovered].x}
            x2={points[hovered].x}
            y1={PAD.top}
            y2={PAD.top + chartH}
            stroke="#c3c2b7"
            strokeWidth={1}
          />
        )}

        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 5 : 4} fill={color} stroke="#fcfcfb" strokeWidth={2} />
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          </g>
        ))}

        {points.map(
          (p, i) =>
            (i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0) && (
              <text key={p.label} x={p.x} y={VB_HEIGHT - 6} textAnchor="middle" className="fill-neutral-400 text-[9px]">
                {p.label}
              </text>
            ),
        )}
      </svg>

      {hovered !== null && tooltipPos && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs shadow-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 8 }}
        >
          <p className="font-medium text-neutral-900">{points[hovered].value}</p>
          <p className="text-neutral-500">{points[hovered].label}</p>
        </div>
      )}
    </div>
  );
}
