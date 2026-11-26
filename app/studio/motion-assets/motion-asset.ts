export const motionFps = 30;
const singleStrokeProjectVersion = "0.1.0";
export const motionProjectVersion = "0.2.0";
const effectProjectVersions = {
  "fire-burst": "0.3.0",
  "fire-shockwave": "0.4.0",
  "volumetric-fireball": "0.5.0",
  "rolling-fireball": "0.6.0",
  "volumetric-fireball-soft-fade": "0.7.0",
} as const;
const effectVersions: readonly string[] = Object.values(effectProjectVersions);
export const motionFileLimit = 24 * 1024;

export type MotionAsset = {
  name: string;
  path: string;
  viewBox: [number, number, number, number];
  width: number;
  height: number;
  colour: string;
  thickness: number;
  drawFrames: number;
  holdFrames: number;
};

export type MotionEffect = Pick<MotionAsset, "name" | "width" | "height"> & {
  effect: keyof typeof effectProjectVersions;
  durationFrames: number;
};

export type MotionClip = MotionAsset | MotionEffect;
export const motionEffectDuration = { min: 18, max: 90 };
export const volumetricExportRequirement = "Fireball MOV export requires local Studio on a Mac with Metal and the Swift toolchain.";

export function isVolumetricEffect(effect: MotionEffect["effect"] | undefined) {
  return effect === "volumetric-fireball" || effect === "volumetric-fireball-soft-fade" || effect === "rolling-fireball";
}

export function motionEffectFrameLimit(effect: MotionEffect["effect"]) {
  return isVolumetricEffect(effect) ? 450 : motionEffectDuration.max;
}

type Point = [number, number];
type Segment = { from: Point; to: Point; controls?: [Point, Point] };
type Sketch = { start: Point; segments: Segment[]; closed: boolean };
type Size = Pick<MotionAsset, "width" | "height">;
export type MotionPreviewGeometry = {
  span: Size;
  boxFor: (size: Size) => Size & { x: number; y: number };
};

const wave = "M11,330 C75,330 91,90 155,90 C213,90 223,360 281,360 C342,360 352,130 409,130";
const circle = "M210 11 C319.905 11 409 100.095 409 210 C409 319.905 319.905 409 210 409 C100.095 409 11 319.905 11 210 C11 100.095 100.095 11 210 11 Z";

export function motionPreset(shape: "wave" | "circle"): MotionAsset {
  return {
    name: shape === "wave" ? "Wave" : "Circle",
    path: shape === "wave" ? wave : circle,
    viewBox: [0, 0, 420, 420],
    width: 800, height: 800, colour: "#33C480", thickness: 9, drawFrames: 30, holdFrames: 60,
  };
}

const numberToken = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i;
const pathLimit = 12000;
const segmentLimit = 128;
const pathError = "Use an SVG path with absolute M, L, C, and Z commands.";
const segmentError = "Use an SVG path with up to 128 segments.";
const numberIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
const integerIn = (value: unknown, low: number, high: number): value is number =>
  numberIn(value, low, high) && Number.isInteger(value);

export function motionDimensionLimit(other: number) {
  return other > 1080 ? 1080 : 1920;
}

function parseSketch(path: string, [x, y, width, height]: MotionAsset["viewBox"]): Sketch {
  let rest = path.trim();
  function readPoint(): Point {
    function number() {
      rest = rest.replace(/^[\s,]+/, "");
      const match = numberToken.exec(rest);
      if (!match) throw new Error(pathError);
      rest = rest.slice(match[0].length);
      return Number(match[0]);
    }
    const px = number(), py = number();
    if (!numberIn(px, x, x + width) || !numberIn(py, y, y + height)) {
      throw new Error("Keep the path and its control points inside the SVG viewBox.");
    }
    return [px, py];
  }
  if (!rest.startsWith("M")) throw new Error(pathError);
  rest = rest.slice(1);
  const start = readPoint();
  let previous = start;
  const segments: Segment[] = [];
  let closed = false;
  let command = "L"; // Additional coordinate pairs after M are line segments.
  while (rest.trim()) {
    rest = rest.trimStart();
    if (/^[LCZ]/.test(rest)) {
      command = rest[0];
      rest = rest.slice(1);
    }
    if (command === "Z") {
      if (rest.trim() || !segments.length) throw new Error(pathError);
      if (distance(previous, start) > 0) segments.push({ from: previous, to: start });
      closed = true;
      break;
    }
    if (segments.length >= segmentLimit) throw new Error(segmentError);
    const controls: Segment["controls"] = command === "C" ? [readPoint(), readPoint()] : undefined;
    const to = readPoint();
    if (distance(previous, to) || controls?.some(point => distance(previous, point))) {
      segments.push({ from: previous, to, controls });
    }
    previous = to;
  }
  if (!segments.length) throw new Error("Choose a path with a visible stroke.");
  return { start, segments, closed };
}

function parsePath(path: string, viewBox: MotionAsset["viewBox"]): Sketch[] {
  if (typeof path !== "string" || path.length > pathLimit) throw new Error(pathError);
  const sketches = path.trim().split(/(?=M)/).map(stroke => parseSketch(stroke, viewBox));
  if (sketches.reduce((count, sketch) => count + sketch.segments.length, 0) > segmentLimit) {
    throw new Error(segmentError);
  }
  return sketches;
}

export function readMotionAsset(input: unknown): MotionAsset {
  if (!input || typeof input !== "object") throw new Error("Choose a valid motion project.");
  const value = input as MotionAsset;
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 100) {
    throw new Error("Enter an asset name from 1 to 100 characters.");
  }
  if (!Array.isArray(value.viewBox) || value.viewBox.length !== 4
    || !numberIn(value.viewBox[0], -100000, 100000) || !numberIn(value.viewBox[1], -100000, 100000)
    || !numberIn(value.viewBox[2], 0.01, 100000) || !numberIn(value.viewBox[3], 0.01, 100000)) {
    throw new Error("Use an SVG with a valid viewBox.");
  }
  if (!integerIn(value.width, 128, motionDimensionLimit(value.height))
    || !integerIn(value.height, 128, motionDimensionLimit(value.width))) {
    throw new Error("Use dimensions from 128 px up to 1920 × 1080 or 1080 × 1920.");
  }
  if (typeof value.colour !== "string" || !/^#[0-9a-f]{6}$/i.test(value.colour) || !integerIn(value.thickness, 1, 64)) {
    throw new Error("Use a solid stroke colour and a thickness from 1 to 64 px.");
  }
  if (!integerIn(value.drawFrames, 3, 297) || !integerIn(value.holdFrames, 3, 300 - value.drawFrames)
    || value.drawFrames % 3 || value.holdFrames % 3) {
    throw new Error("Set at least 0.1 s for drawing and holding, with a total of up to 10 s.");
  }
  const path = parsePath(value.path, value.viewBox).map(pathData).join(" ");
  if (path.length > pathLimit) throw new Error("Use a shorter SVG path.");
  return {
    name: value.name.trim(), viewBox: [...value.viewBox], path,
    width: value.width, height: value.height, colour: value.colour.toUpperCase(),
    thickness: value.thickness, drawFrames: value.drawFrames, holdFrames: value.holdFrames,
  };
}

function readMotionEffect(input: unknown): MotionEffect {
  if (!input || typeof input !== "object" || !("effect" in input)
    || typeof input.effect !== "string" || !Object.hasOwn(effectProjectVersions, input.effect)) {
    throw new Error("Choose a motion project with a supported special effect.");
  }
  const { effect, name, width, height, durationFrames } = input as MotionEffect;
  if (typeof name !== "string" || !name.trim() || name.length > 100) {
    throw new Error("Enter an asset name from 1 to 100 characters.");
  }
  if (!integerIn(width, 128, motionDimensionLimit(height)) || !integerIn(height, 128, motionDimensionLimit(width))) {
    throw new Error("Use dimensions from 128 px up to 1920 × 1080 or 1080 × 1920.");
  }
  const limit = motionEffectFrameLimit(effect);
  if (!integerIn(durationFrames, motionEffectDuration.min, limit) || durationFrames % 3) {
    throw new Error(`Set a duration from 0.6 to ${limit / motionFps} s in steps of 0.1 s.`);
  }
  return { name: name.trim(), width, height, effect, durationFrames };
}

export function motionProject(asset: MotionClip) {
  if ("effect" in asset) {
    const validated = readMotionEffect(asset);
    const version = effectProjectVersions[validated.effect];
    return { format: "acm-motion", version, asset: validated };
  }
  const validated = readMotionAsset(asset);
  const version = validated.path.indexOf("M", 1) === -1 ? singleStrokeProjectVersion : motionProjectVersion;
  return { format: "acm-motion", version, asset: validated };
}

export function readMotionProject(value: unknown) {
  const file = value as ReturnType<typeof motionProject>;
  if (!file || file.format !== "acm-motion") {
    throw new Error("Choose an ACM Motion project saved in a supported version.");
  }
  const effectVersion = effectVersions.indexOf(file.version);
  if (effectVersion !== -1) {
    const asset = readMotionEffect(file.asset);
    const requiredVersion = effectProjectVersions[asset.effect];
    if (effectVersion < effectVersions.indexOf(requiredVersion)) {
      throw new Error(`Use ACM Motion project v${requiredVersion} for this special effect.`);
    }
    return asset;
  }
  if (file.version !== singleStrokeProjectVersion && file.version !== motionProjectVersion) {
    throw new Error("Choose an ACM Motion project saved in a supported version.");
  }
  const asset = readMotionAsset(file.asset);
  if (file.version === singleStrokeProjectVersion && asset.path.indexOf("M", 1) !== -1) {
    throw new Error("Use ACM Motion project v0.2.0 for sketches with multiple strokes.");
  }
  return asset;
}

function distance(a: Point, b: Point) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function mix(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function shorten({ from, to, controls }: Segment, t: number): Segment {
  if (!controls) return { from, to: mix(from, to, t) };
  const first = mix(from, controls[0], t);
  const middle = mix(controls[0], controls[1], t);
  const last = mix(controls[1], to, t);
  const second = mix(first, middle, t);
  return { from, controls: [first, second], to: mix(second, mix(middle, last, t), t) };
}

function pathData({ start, segments, closed }: Sketch) {
  const point = (p: Point) => p.join(" ");
  const commands = segments.map(segment => segment.controls
    ? `C${segment.controls.map(point).join(" ")} ${point(segment.to)}`
    : `L${point(segment.to)}`);
  if (closed && !segments.at(-1)?.controls) commands.pop(); // Close the final straight segment once.
  return [`M${point(start)}`, ...commands, ...(closed ? ["Z"] : [])].join(" ");
}

function cubicExtrema(from: number, first: number, second: number, to: number) {
  const start = first - from, middle = second - first, end = to - second;
  const a = start - 2 * middle + end, b = 2 * (middle - start), c = start;
  if (Math.abs(a) <= Number.EPSILON * Math.max(Math.abs(b), Math.abs(c))) return b ? [-c / b] : [];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

function sketchBounds(sketches: Sketch[]) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  function include([x, y]: Point) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  for (const sketch of sketches) {
    for (const segment of sketch.segments) {
      const { from, to, controls } = segment;
      include(from);
      include(to);
      if (!controls) continue;
      for (const axis of [0, 1]) {
        for (const t of cubicExtrema(from[axis], controls[0][axis], controls[1][axis], to[axis])) {
          if (t > 0 && t < 1) include(shorten(segment, t).to);
        }
      }
    }
  }
  return { left, top, right, bottom };
}

export function motionGeometry(asset: MotionAsset) {
  const source = parsePath(asset.path, asset.viewBox);
  const [x, y, width, height] = asset.viewBox;
  // Reserve padding for every supported stroke so changing thickness never moves the path.
  const inset = 34;
  const bounds = sketchBounds(source);
  const span = { width: (bounds.right - bounds.left) / width, height: (bounds.bottom - bounds.top) / height };
  const preview: MotionPreviewGeometry = {
    span,
    boxFor(size) {
      const drawingWidth = size.width - inset * 2, drawingHeight = size.height - inset * 2;
      const inkWidth = span.width * drawingWidth, inkHeight = span.height * drawingHeight;
      const clearance = asset.thickness + 12;
      const boxWidth = Math.max(36, inkWidth + clearance), boxHeight = Math.max(36, inkHeight + clearance);
      return {
        x: inset + (bounds.left - x) / width * drawingWidth - (boxWidth - inkWidth) / 2,
        y: inset + (bounds.top - y) / height * drawingHeight - (boxHeight - inkHeight) / 2,
        width: boxWidth,
        height: boxHeight,
      };
    },
  };
  const map = (point: Point): Point => [
    inset + (point[0] - x) / width * (asset.width - inset * 2),
    inset + (point[1] - y) / height * (asset.height - inset * 2),
  ];
  const sketches: Sketch[] = source.map(stroke => ({
    start: map(stroke.start), closed: stroke.closed,
    segments: stroke.segments.map(({ from, to, controls }) => ({
      from: map(from), to: map(to), controls: controls && [map(controls[0]), map(controls[1])],
    })),
  }));
  let length = 0;
  const strokes = sketches.map(sketch => {
    const startDistance = length;
    const segments = sketch.segments.map(segment => {
      const steps = segment.controls ? 96 : 1;
      const distances = [length];
      let previous = segment.from;
      for (let i = 1; i <= steps; i++) {
        const point = shorten(segment, i / steps).to;
        length += distance(previous, point);
        distances.push(length);
        previous = point;
      }
      return { segment, distances, steps };
    });
    return { sketch, segments, startDistance, endDistance: length, fullPath: pathData(sketch) };
  });
  const fullPath = strokes.map(stroke => stroke.fullPath).join(" ");
  function pathAt(frame: number) {
    if (frame <= 0) return "";
    if (frame >= asset.drawFrames) return fullPath;
    const target = length * frame / asset.drawFrames;
    const paths: string[] = [];
    for (const stroke of strokes) {
      if (stroke.endDistance <= target) { paths.push(stroke.fullPath); continue; }
      if (stroke.startDistance >= target) break;
      const segments: Segment[] = [];
      for (const { segment, distances, steps } of stroke.segments) {
        const next = distances.findIndex(value => value > target);
        if (next < 0) { segments.push(segment); continue; }
        if (next > 0 && target > distances[next - 1]) {
          const fraction = (target - distances[next - 1]) / (distances[next] - distances[next - 1]);
          segments.push(shorten(segment, (next - 1 + fraction) / steps));
        }
        break;
      }
      paths.push(pathData({ start: stroke.sketch.start, segments, closed: false }));
      break;
    }
    return paths.join(" ");
  }
  return {
    preview,
    strokes: strokes.map(({ sketch, startDistance, endDistance }) => ({
      sketch,
      startFrame: startDistance / length * asset.drawFrames,
      endFrame: endDistance / length * asset.drawFrames,
    })),
    pathAt,
    frameCount: asset.drawFrames + asset.holdFrames,
  };
}

export function motionSvg(asset: MotionAsset, path: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.width}" height="${asset.height}" viewBox="0 0 ${asset.width} ${asset.height}">${path ? `<path d="${path}" fill="none" stroke="${asset.colour}" stroke-width="${asset.thickness}" stroke-linecap="round" stroke-linejoin="round"/>` : ""}</svg>\n`;
}

function lottiePath(sketch: Sketch) {
  const vertices = [sketch.start, ...sketch.segments.map(segment => segment.to)];
  const tangentsIn: Point[] = vertices.map(() => [0, 0]);
  const tangentsOut: Point[] = vertices.map(() => [0, 0]);
  sketch.segments.forEach(({ controls, from, to }, index) => {
    if (!controls) return;
    tangentsOut[index] = [controls[0][0] - from[0], controls[0][1] - from[1]];
    tangentsIn[index + 1] = [controls[1][0] - to[0], controls[1][1] - to[1]];
  });
  if (sketch.closed) {
    vertices.pop();
    tangentsIn[0] = tangentsIn.pop()!;
    tangentsOut.pop();
  }
  return { v: vertices, i: tangentsIn, o: tangentsOut, c: sketch.closed };
}

export function motionLottie(asset: MotionAsset) {
  const { strokes, frameCount } = motionGeometry(asset);
  const prop = <T,>(k: T) => ({ a: 0, k });
  const colour = [1, 3, 5].map(index => Number.parseInt(asset.colour.slice(index, index + 2), 16) / 255);
  const transform = { p: prop([0, 0]), a: prop([0, 0]), s: prop([100, 100]), r: prop(0), o: prop(100) };
  return {
    v: "5.12.2", nm: asset.name, fr: motionFps, ip: 0, op: frameCount, w: asset.width, h: asset.height, assets: [],
    layers: [{
      ty: 4, ind: 1, nm: asset.name, ks: transform, ip: 0, op: frameCount, st: 0, sr: 1, bm: 0,
      shapes: strokes.map(({ sketch, startFrame, endFrame }) => ({
        ty: "gr", it: [
          { ty: "sh", ks: prop(lottiePath(sketch)) },
          { ty: "st", c: prop(colour), o: prop(100), w: prop(asset.thickness), lc: 2, lj: 2 },
          { ty: "tm", s: prop(0), e: { a: 1, k: [
            { t: startFrame, s: [0], e: [100], o: { x: [0.33], y: [0.33] }, i: { x: [0.67], y: [0.67] } },
            { t: endFrame, s: [100] },
          ] }, o: prop(0), m: 1 },
          { ty: "tr", ...transform },
        ],
      })),
    }],
  };
}
