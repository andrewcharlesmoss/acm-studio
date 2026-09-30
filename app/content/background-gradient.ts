import type { CustomBackgroundGradient, ParagraphBackgroundGradient } from "./model";

// Colour values follow Gutenberg's default gradient palette (lib/theme.json).
const presetStops: [string, string[]][] = [
  ["Vivid cyan blue to vivid purple", ["#0693E3", "#9B51E0"]],
  ["Light green cyan to vivid green cyan", ["#7ADCB4", "#00D082"]],
  ["Luminous vivid amber to luminous vivid orange", ["#FCB900", "#FF6900"]],
  ["Luminous vivid orange to vivid red", ["#FF6900", "#CF2E2E"]],
  ["Very light grey to cyan bluish grey", ["#EEEEEE", "#A9B8C3"]],
  ["Cool to warm spectrum", ["#4AEADC", "#9778D1", "#CF2ABA", "#EE2C82", "#FB6962", "#FEF84C"]],
  ["Blush light purple", ["#FFCEEC", "#9896F0"]],
  ["Blush bordeaux", ["#FECDA5", "#FE2D2D", "#6B003E"]],
  ["Luminous dusk", ["#FFCB70", "#C751C0", "#4158D0"]],
  ["Pale ocean", ["#FFF5CB", "#B6E3D4", "#33A7B5"]],
  ["Electric grass", ["#CAF880", "#71CE7E"]],
  ["Midnight", ["#020381", "#2874FC"]],
];
export const DEFAULT_GRADIENTS: { name: string; value: CustomBackgroundGradient }[] = presetStops.map(([name, colours]) => ({
  name, value: { type: "linear", angle: 135, stops: colours.map((colour, index) => ({ colour, position: index * 100 / (colours.length - 1) })) },
}));

export function validBackgroundGradient(value: unknown): value is ParagraphBackgroundGradient {
  if (typeof value === "string") return ["sunrise", "ocean", "forest", "violet"].includes(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const gradient = value as Record<string, unknown>;
  if (!["linear", "radial"].includes(gradient.type as string) || typeof gradient.angle !== "number" || !Number.isFinite(gradient.angle) || gradient.angle < 0 || gradient.angle > 360 || !Array.isArray(gradient.stops) || gradient.stops.length < 2 || gradient.stops.length > 20) return false;
  return gradient.stops.every((stop, index, stops) => stop && typeof stop === "object" && !Array.isArray(stop)
    && typeof stop.colour === "string" && /^#(?:[\da-f]{6}|[\da-f]{8})$/i.test(stop.colour)
    && typeof stop.position === "number" && Number.isFinite(stop.position) && stop.position >= 0 && stop.position <= 100
    && (index === 0 || stop.position >= stops[index - 1].position));
}

export function editableBackgroundGradient(value?: ParagraphBackgroundGradient): CustomBackgroundGradient {
  if (value && typeof value !== "string") return value;
  const colours = { sunrise: ["#FDE68A", "#FCA5A5"], ocean: ["#BAE6FD", "#A5B4FC"], forest: ["#BBF7D0", "#A7F3D0"], violet: ["#DDD6FE", "#FBCFE8"] }[value ?? "ocean"];
  return { type: "linear", angle: 135, stops: colours.map((colour, index) => ({ colour, position: index * 100 })) };
}
