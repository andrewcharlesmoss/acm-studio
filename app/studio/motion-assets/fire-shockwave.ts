import { createElement as svg, useId } from "react";
import type { MotionEffect } from "./motion-asset.ts";

export const fireShockwave: MotionEffect = {
  effect: "fire-shockwave", name: "Fire Shockwave", width: 1920, height: 1080, durationFrames: 60,
};

const tau = Math.PI * 2;
const angles = Array.from({ length: 112 }, (_, index) => index * tau / 112);
const clamp = (value: number) => Math.max(0, Math.min(1, value));
// Keep the same SVG attributes in the browser and the local exporter.
const coordinate = (value: number) => value.toFixed(3);

function ease(start: number, end: number, value: number) {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}

function contour(angle: number, time: number) {
  return 24 * Math.sin(5 * angle - 8 * time)
    + 17 * Math.sin(11 * angle + 11 * time)
    + 14 * Math.sin(19 * angle - 9 * time)
    + 6 * Math.sin(41 * angle + 21 * time);
}

function outline(radius: number, time: number, roughness: number, phase: number) {
  const points = angles.map(angle => {
    const distance = Math.max(0, radius + contour(angle + phase, time) * roughness);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  });
  const midpoint = (a: typeof points[number], b: typeof points[number]) => `${coordinate((a.x + b.x) / 2)} ${coordinate((a.y + b.y) / 2)}`;
  return `M${midpoint(points[points.length - 1], points[0])}${points.map((point, index) =>
    `Q${coordinate(point.x)} ${coordinate(point.y)} ${midpoint(point, points[(index + 1) % points.length])}`).join("")}Z`;
}

function series(index: number, step: number) {
  const value = (index + 1) * step;
  return value - Math.floor(value);
}

const folds = Array.from({ length: 126 }, (_, index) => ({
  angle: tau * series(index, 0.618033989),
  depth: series(index, 0.402127308),
  length: 0.28 + series(index, 0.713193476) * 0.89,
  width: 20 + series(index, 0.328312067) * 78,
  phase: tau * series(index, 0.244369786),
}));

const embers = Array.from({ length: 126 }, (_, index) => ({
  angle: tau * series(index, 0.569840291),
  reach: 170 + series(index, 0.416073731) * 890,
  delay: series(index, 0.754877666) * 0.20,
  life: 0.17 + series(index, 0.669881835) * 0.61,
  size: 0.8 + series(index, 0.141592654) * 3,
  lift: 19 + series(index, 0.271828183) * 105,
}));

type GradientStop = [number, string, number?];
const ignition: GradientStop[] = [[0, "#FFFCEE"], [0.12, "#FFF3B1"], [0.32, "#FFD14B", 0.86], [0.54, "#FF810D", 0.67], [0.84, "#FD480A", 0.37], [1, "#F13306", 0]];
const halo: GradientStop[] = [[0.27, "#FF6111", 0], [0.5, "#FF6111", 0.08], [0.68, "#FF630B", 0.66], [0.86, "#FA3F07", 0.50], [1, "#E42B05", 0]];
const flame: GradientStop[] = [[0.42, "#FF7B0A", 0], [0.57, "#FF9C17", 0.23], [0.71, "#FFBD2C", 0.72], [0.83, "#FFDD53", 0.78], [0.92, "#FFA420", 0.64], [1, "#FF6809", 0]];
const curl: GradientStop[] = [[0, "#FFFBE6"], [0.23, "#FFE87C", 0.95], [0.52, "#FFAC1A", 0.69], [0.78, "#F35A08", 0.27], [1, "#F34804", 0]];
const plume: GradientStop[] = [[0, "#FFDA5C", 0.91], [0.33, "#FF9B0E", 0.86], [0.62, "#DF4307", 0.68], [0.83, "#AC2204", 0.26], [1, "#C42904", 0]];

function radialGradient(id: string, stops: GradientStop[], radius?: number) {
  const geometry = radius === undefined ? { cx: "42%", cy: "47%", r: "54%" }
    : { gradientUnits: "userSpaceOnUse", cx: 0, cy: 0, r: coordinate(radius) };
  return svg("radialGradient", { id, ...geometry }, stops.map(([offset, colour, opacity]) =>
    svg("stop", { key: offset, offset, stopColor: colour, stopOpacity: opacity })));
}

const curlShape = "M-0.58 0.02C-0.33-0.22-0.42-0.64-0.04-0.49C0.28-0.39 0.35-0.96 0.91-0.7C0.69-0.48 0.39-0.44 0.53-0.18C0.68 0.1 1.05 0.07 1.18 0.29C0.56 0.5 0.36 0.05 0.13 0.33C-0.02 0.53-0.43 0.57-0.66 0.32Z";
const plumeShape = "M-0.63 0.07C-0.69-0.37-0.38-0.49-0.18-0.45C-0.02-0.41-0.13-0.79 0.19-0.72C0.47-0.66 0.43-0.31 0.67-0.3C0.83-0.29 1.04-0.14 0.94 0.04C0.73 0.01 0.62 0.2 0.55 0.33C0.48 0.56 0.07 0.49-0.07 0.56C-0.31 0.68-0.62 0.43-0.63 0.07Z";
const filamentShape = "M-0.52 0.03C-0.37-0.23-0.26-0.05-0.19-0.23S-0.06-0.42 0.05-0.26S0.21-0.15 0.29-0.32S0.59-0.67 0.85-0.60C0.58-0.58 0.46-0.45 0.37-0.30S0.19 0.01 0.03-0.22S-0.03-0.08-0.16-0.11S-0.34-0.05-0.52 0.03Z";

export function FireShockwaveArtwork({ asset, frame }: { asset: MotionEffect; frame: number }) {
  const id = useId();
  if (frame <= 0 || frame >= asset.durationFrames - 1) return null;

  const time = frame / (asset.durationFrames - 1);
  const radius = 24 + 1000 * (1 - Math.exp(-5.5 * time));
  const thickness = (54 + ease(0, 0.18, time) * 228) * (1 - time * 0.53);
  const frontOpacity = ease(0, 0.05, time) * (1 - ease(0.25, 0.56, time));
  const flashOpacity = ease(0, 0.045, time) * (1 - ease(0.06, 0.27, time));
  const flashRadius = 55 + 1080 * (1 - Math.exp(-11 * time));
  const roughness = 0.18 + ease(0, 0.26, time) * 0.91;
  const fill = (name: string) => `url(#${id}-${name})`;
  const foldOpacity = frontOpacity * (1 - ease(0.37, 0.48, time));

  const fireFront = frontOpacity > 0 ? [
    svg("path", { key: "halo", fill: fill("halo"), fillOpacity: coordinate(frontOpacity),
      d: outline(radius + thickness * 0.52, time, roughness, 0.02) }),
    svg("path", { key: "flame", fill: fill("flame"), fillOpacity: coordinate(frontOpacity),
      d: outline(radius + thickness * 0.34, time, roughness, 0) }),
  ] : null;

  const fireFolds = foldOpacity > 0 ? folds.map((fold, index) => {
    const angle = fold.angle + 0.035 * Math.sin(fold.phase + time * 17);
    const depth = radius - thickness * fold.depth * 1.35 + contour(angle, time) * roughness * 0.82;
    const length = thickness * fold.length * 0.63;
    const width = fold.width * (0.43 + ease(0, 0.24, time));
    const rolling = Math.sin(fold.phase + time * 24);
    const opacity = foldOpacity * (0.73 + 0.24 * rolling);
    const turn = angle * 360 / tau + rolling * 45;
    return svg("g", { key: index,
      transform: `translate(${coordinate(Math.cos(angle) * depth)} ${coordinate(Math.sin(angle) * depth)}) rotate(${coordinate(turn)}) scale(${coordinate(length)} ${coordinate(width)})` },
    svg("path", { d: plumeShape, fill: fill("plume"), fillOpacity: coordinate(opacity) }),
    svg("path", { d: curlShape, fill: fill("curl"), fillOpacity: coordinate(opacity * 0.94), transform: "translate(-0.2 -0.06) rotate(17) scale(0.77 0.87)" }),
    svg("path", { d: filamentShape, fill: "#FFE89E", fillOpacity: coordinate(opacity * 0.48),
      transform: `translate(-0.16 ${coordinate(rolling * 0.18)}) rotate(${coordinate(rolling * 31)})` }));
  }) : null;

  const sparks = embers.map((ember, index) => {
    const age = time - ember.delay;
    if (age <= 0 || age >= ember.life) return null;
    const travel = 1 - Math.exp(-4.8 * age);
    const trail = 1 - Math.exp(-4.8 * Math.max(0, age - ember.size * 0.009));
    const x = Math.cos(ember.angle) * ember.reach, y = Math.sin(ember.angle) * ember.reach;
    const lift = ember.lift * age * age;
    const opacity = ease(0, 0.035, age) * (1 - age / ember.life) ** 1.2;
    return svg("line", { key: index, x1: coordinate(x * trail), y1: coordinate(y * trail - lift),
      x2: coordinate(x * travel), y2: coordinate(y * travel - lift), stroke: ember.size > 2.45 ? "#FFE888" : "#FF9F1B",
      strokeOpacity: coordinate(opacity), strokeWidth: coordinate(ember.size * (1 - age * 0.62)), strokeLinecap: "round" });
  });

  return svg("g", { transform: `translate(${asset.width / 2} ${asset.height / 2}) scale(${asset.width / 1000} ${asset.height / 1000})` },
    svg("defs", null,
      radialGradient(`${id}-ignition`, ignition, flashRadius),
      radialGradient(`${id}-halo`, halo, radius + thickness * 0.53),
      radialGradient(`${id}-flame`, flame, radius + thickness * 0.38),
      radialGradient(`${id}-curl`, curl),
      radialGradient(`${id}-plume`, plume)),
    flashOpacity > 0 ? svg("circle", { r: coordinate(flashRadius), fill: fill("ignition"), fillOpacity: coordinate(flashOpacity) }) : null,
    fireFront,
    fireFolds,
    sparks,
  );
}
