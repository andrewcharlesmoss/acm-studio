import { createElement as svg, useId } from "react";
import type { MotionEffect, MotionPreviewGeometry } from "./motion-asset.ts";

export const fireBurst: MotionEffect = {
  effect: "fire-burst", name: "Fire Burst", width: 1920, height: 1080, durationFrames: 60,
};

export const fireBurstPreview: MotionPreviewGeometry = {
  span: { width: 1, height: 1 },
  boxFor: ({ width, height }) => ({ x: 0, y: 0, width, height }),
};

export const fireBurstPoster = (asset: MotionEffect) => Math.round(asset.durationFrames * 0.22);

const designWidth = 960;
const designHeight = 540;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
// Round the artwork coordinates so different JS engines hydrate the same SVG attributes.
const artworkNumber = (value: number) => value.toFixed(4);

function sample(seed: number) {
  const hash = Math.imul(seed + 1, 0x9E3779B1);
  const mixed = Math.imul(hash ^ (hash >>> 16), 0x21F0AAAD);
  return ((mixed ^ (mixed >>> 15)) >>> 0) / 0x100000000;
}

// Smooth, uneven lobes keep the expanding cloud from reading as a grid of circles.
function billow(seed: number) {
  const points = Array.from({ length: 24 }, (_, index) => {
    const angle = Math.PI * index / 12;
    const ripple = Math.sin(angle * 5 + seed) * 0.12;
    const radius = 0.77 + ripple + sample(seed + index) * 0.24;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  const midpoint = (a: number, b: number) => ((a + b) / 2).toFixed(3);
  const start = points[0], end = points[points.length - 1];
  return `M${midpoint(end.x, start.x)} ${midpoint(end.y, start.y)} ${points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return `Q${point.x.toFixed(3)} ${point.y.toFixed(3)} ${midpoint(point.x, next.x)} ${midpoint(point.y, next.y)}`;
  }).join(" ")}Z`;
}

const outlines = Array.from({ length: 8 }, (_, index) => billow(index * 29));
const plumes = Array.from({ length: 52 }, (_, index) => {
  const seed = index * 11 + 720;
  const angle = index * 2.399963 + sample(seed) * 0.6;
  const reach = 30 + sample(seed + 1) * 235;
  return {
    x: Math.cos(angle) * reach * 1.34,
    y: Math.sin(angle) * reach * 0.67,
    reach,
    size: 28 + sample(seed + 2) * 63,
    delay: sample(seed + 3) * 0.15,
    swell: 0.55 + sample(seed + 4) * 0.45,
    lift: 15 + sample(seed + 5) * 113,
    turn: sample(seed + 6) * 360,
    tint: sample(seed + 7),
    outline: outlines[index % outlines.length],
    index,
  };
}).sort((a, b) => b.reach - a.reach);

const sparks = Array.from({ length: 106 }, (_, index) => {
  const seed = 2200 + index * 9;
  const angle = sample(seed) * Math.PI * 2;
  const reach = 85 + sample(seed + 1) * 330;
  return {
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach * 0.43,
    delay: sample(seed + 2) * 0.19,
    life: 0.27 + sample(seed + 3) * 0.53,
    width: 0.65 + sample(seed + 4) ** 2 * 2.3,
    heat: sample(seed + 5),
    gravity: 20 + sample(seed + 6) * 79,
  };
});

type Stop = [offset: number, colour: string, opacity?: number];

const gradients: Record<string, Stop[]> = {
  glow: [[0, "#FFF2AB", 0.9], [0.26, "#FFAC28", 0.65], [0.62, "#FF4615", 0.32], [1, "#EC2D10", 0]],
  flash: [[0, "#FFFEE9"], [0.27, "#FFF39B"], [0.55, "#FFB624", 0.76], [1, "#FF4B0F", 0]],
  smoke: [[0, "#6D5550", 0.8], [0.42, "#4B3937", 0.65], [0.78, "#302527", 0.39], [1, "#291E20", 0.04]],
  flame: [[0, "#FFE66A"], [0.3, "#FFB932"], [0.58, "#FF7216"], [0.8, "#E8390B", 0.64], [1, "#7D180A", 0]],
  coal: [[0, "#FF9E2A"], [0.29, "#F66812"], [0.6, "#B32D0F"], [0.83, "#782419", 0.49], [1, "#4A2422", 0]],
  curl: [[0, "#FFF9C5", 0.94], [0.26, "#FFBF39", 0.75], [0.58, "#FF5C0E", 0.52], [1, "#E83A0C", 0]],
};

export function FireBurstArtwork({ asset, frame }: { asset: MotionEffect; frame: number }) {
  const id = useId();
  // The encoded clip includes a transparent first and last frame.
  if (frame <= 0 || frame >= asset.durationFrames - 1) return null;
  const time = frame / (asset.durationFrames - 1);
  const scale = Math.min(asset.width / designWidth, asset.height / designHeight);
  const fill = (name: keyof typeof gradients) => `url(#${id}-${name})`;

  const smoke = plumes.map(plume => {
    const age = time - plume.delay * 0.75;
    if (age <= 0) return null;
    const expansion = 1 - Math.exp(-6 * age);
    const size = plume.size * (0.12 + 1.12 * expansion);
    const opacity = clamp(age * 8) * (1 - clamp((time - 0.42) / 0.58)) ** 1.6 * plume.swell;
    const x = plume.x * expansion * 0.9;
    const y = plume.y * expansion * 0.85 - plume.lift * age ** 1.3 * 0.67;
    return svg("path", { key: plume.index, d: plume.outline, fill: fill("smoke"), fillOpacity: artworkNumber(opacity),
      transform: `translate(${artworkNumber(x)} ${artworkNumber(y)}) rotate(${artworkNumber(plume.turn + age * 72)}) scale(${artworkNumber(size)} ${artworkNumber(size * 0.89)})`,
    });
  });

  const flames = plumes.map(plume => {
    const age = time - plume.delay;
    const lifetime = 0.32 + plume.swell * 0.19;
    if (age <= 0 || age >= lifetime) return null;
    const expansion = 1 - Math.exp(-7.8 * age);
    const size = plume.size * (0.17 + expansion) * (1 - 0.26 * age / lifetime);
    const opacity = clamp(age * 22) * (1 - (age / lifetime) ** 2) * (0.76 + plume.tint * 0.24);
    const gradient = plume.tint > 0.38 + age * 0.84 ? "flame" : "coal";
    const x = plume.x * expansion;
    const y = plume.y * expansion - plume.lift * age * 0.6;
    return svg("g", { key: plume.index,
      transform: `translate(${artworkNumber(x)} ${artworkNumber(y)}) rotate(${artworkNumber(plume.turn - age * 55)}) scale(${artworkNumber(size)} ${artworkNumber(size * 0.83)})`,
    }, svg("path", { d: plume.outline, fill: fill(gradient), fillOpacity: artworkNumber(opacity) }),
    svg("path", { d: outlines[(plume.index + 1) % outlines.length], fill: fill("curl"), fillOpacity: artworkNumber(opacity), transform: "translate(-0.22 -0.29) rotate(32) scale(0.53 0.35)" }),
    svg("path", { d: outlines[(plume.index + 3) % outlines.length], fill: fill("curl"), fillOpacity: artworkNumber(opacity * 0.65), transform: "translate(0.26 0.1) rotate(-28) scale(0.43 0.28)" }));
  });

  const embers = sparks.map((spark, index) => {
    const age = time - spark.delay;
    if (age <= 0 || age >= spark.life) return null;
    const travel = 1 - Math.exp(-5.8 * age);
    const tail = 1 - Math.exp(-5.8 * Math.max(0, age - 0.027 - spark.width * 0.014));
    const drop = spark.gravity * age * age;
    const x = artworkNumber(spark.x * travel), y = artworkNumber(spark.y * travel + drop);
    const opacity = artworkNumber(clamp(age * 29) * (1 - age / spark.life) ** 0.7);
    return svg("g", { key: index },
      svg("line", { x1: artworkNumber(spark.x * tail), y1: artworkNumber(spark.y * tail + drop),
        x2: x, y2: y, stroke: spark.heat > 0.5 ? "#FFB735" : "#EA5517", strokeOpacity: opacity, strokeWidth: spark.width, strokeLinecap: "round" }),
      svg("circle", { cx: x, cy: y, r: spark.width * 0.56, fill: spark.heat > 0.5 ? "#FFF5AD" : "#FF9A31", fillOpacity: opacity }));
  });

  const glowOpacity = clamp(time * 32) * (1 - clamp(time / 0.48)) ** 1.5;
  const flashOpacity = clamp(time * 42) * (1 - clamp(time / 0.17)) ** 2;

  return svg("g", { transform: `translate(${asset.width / 2} ${asset.height * 0.54}) scale(${scale})` },
    svg("defs", null, Object.entries(gradients).map(([name, stops]) =>
      svg("radialGradient", { key: name, id: `${id}-${name}`, cx: "46%", cy: "42%", r: "58%" },
        stops.map(([offset, colour, opacity]) => svg("stop", { key: offset, offset, stopColor: colour, stopOpacity: opacity }))))),
    smoke,
    svg("ellipse", { rx: 250 + time * 120, ry: 121 + time * 85, fill: fill("glow"), fillOpacity: artworkNumber(glowOpacity) }),
    flames,
    svg("ellipse", { rx: 62 + time * 610, ry: 27 + time * 340, fill: fill("flash"), fillOpacity: artworkNumber(flashOpacity) }),
    embers,
  );
}
