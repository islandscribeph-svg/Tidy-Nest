// Validated categorical palette (dataviz skill default, light-mode instance) -
// fixed hue order, never cycled. Used for part-to-whole charts with <= 6 slices.
export const CATEGORICAL_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

// Sequential single-hue ramp (blue), light -> dark, for magnitude encoding
// across more categories than the categorical palette should carry.
export const SEQUENTIAL_BLUE = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
  "#0d366b",
];

export function sequentialColorFor(rank: number, count: number): string {
  if (count <= 1) return SEQUENTIAL_BLUE[SEQUENTIAL_BLUE.length - 1];
  const idx = Math.round((rank / (count - 1)) * (SEQUENTIAL_BLUE.length - 1));
  return SEQUENTIAL_BLUE[idx];
}

// Same hex values as the STAGE_COLORS Tailwind dot classes in lib/pipeline.ts
// (sky/indigo/violet/amber/emerald/neutral/rose-400), kept in sync manually
// since Tailwind classes can't be read back into inline SVG fills.
export const STAGE_HEX: Record<string, string> = {
  NEW_LEAD: "#38bdf8",
  CONTACTED: "#818cf8",
  CONSULTATION: "#a78bfa",
  IN_PROGRESS: "#fbbf24",
  CLOSED: "#34d399",
  UNQUALIFIED: "#a3a3a3",
  DEAD: "#fb7185",
};
