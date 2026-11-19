export const motionFps = 30;
export const motionProjectVersion = "0.1.0";
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

type Point = [number, number];
type Segment = { from: Point; to: Point; controls?: [Point, Point] };
type Sketch = { start: Point; segments: Segment[]; closed: boolean };

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
const pathError = "Use one SVG path with absolute M, L, C, and Z commands.";
const numberIn = (value: unknown, low: number, high: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
const integerIn = (value: unknown, low: number, high: number): value is number =>
  numberIn(value, low, high) && Number.isInteger(value);

export function motionDimensionLimit(other: number) {
  return other > 1080 ? 1080 : 1920;
}

function parsePath(path: string, [x, y, width, height]: MotionAsset["viewBox"]): Sketch {
  if (typeof path !== "string" || path.length > pathLimit) throw new Error(pathError);
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
    if (segments.length >= 128) throw new Error("Use an SVG path with up to 128 segments.");
    const controls: Segment["controls"] = command === "C" ? [readPoint(), readPoint()] : undefined;
    const to = readPoint();
    if (distance(previous, to) || controls?.some(point => distance(previous, point))) {
      segments.push({ from: previous, to, controls });
    }
    previous = to;
  }
  if (!segments.length) throw new Error("Choose a path with a visible stroke.");
  if (segments.length > 128) throw new Error("Use an SVG path with up to 128 segments.");
  return { start, segments, closed };
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
  const path = pathData(parsePath(value.path, value.viewBox));
  if (path.length > pathLimit) throw new Error("Use a shorter SVG path.");
  return {
    name: value.name.trim(), viewBox: [...value.viewBox], path,
    width: value.width, height: value.height, colour: value.colour.toUpperCase(),
    thickness: value.thickness, drawFrames: value.drawFrames, holdFrames: value.holdFrames,
  };
}

export function motionProject(asset: MotionAsset) {
  return { format: "acm-motion", version: motionProjectVersion, asset: readMotionAsset(asset) };
}

export function readMotionProject(value: unknown) {
  const file = value as ReturnType<typeof motionProject>;
  if (!file || file.format !== "acm-motion" || file.version !== motionProjectVersion) {
    throw new Error("Choose an ACM Motion project saved in a supported version.");
  }
  return readMotionAsset(file.asset);
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

export function motionGeometry(asset: MotionAsset) {
  const source = parsePath(asset.path, asset.viewBox);
  const [x, y, width, height] = asset.viewBox;
  // Reserve padding for every supported stroke so changing thickness never moves the path.
  const inset = 34;
  const map = (point: Point): Point => [
    inset + (point[0] - x) / width * (asset.width - inset * 2),
    inset + (point[1] - y) / height * (asset.height - inset * 2),
  ];
  const sketch: Sketch = {
    start: map(source.start), closed: source.closed,
    segments: source.segments.map(({ from, to, controls }) => ({
      from: map(from), to: map(to), controls: controls && [map(controls[0]), map(controls[1])],
    })),
  };
  let length = 0;
  const measured = sketch.segments.map(segment => {
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
  const fullPath = pathData(sketch);
  function pathAt(frame: number) {
    if (frame <= 0) return "";
    if (frame >= asset.drawFrames) return fullPath;
    const target = length * frame / asset.drawFrames;
    const segments: Segment[] = [];
    for (const { segment, distances, steps } of measured) {
      const next = distances.findIndex(value => value > target);
      if (next < 0) { segments.push(segment); continue; }
      if (next > 0) {
        const fraction = (target - distances[next - 1]) / (distances[next] - distances[next - 1]);
        segments.push(shorten(segment, (next - 1 + fraction) / steps));
      }
      break;
    }
    return pathData({ start: sketch.start, segments, closed: false });
  }
  return { sketch, pathAt, frameCount: asset.drawFrames + asset.holdFrames };
}

export function motionSvg(asset: MotionAsset, path: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.width}" height="${asset.height}" viewBox="0 0 ${asset.width} ${asset.height}">${path ? `<path d="${path}" fill="none" stroke="${asset.colour}" stroke-width="${asset.thickness}" stroke-linecap="round" stroke-linejoin="round"/>` : ""}</svg>\n`;
}

export function motionLottie(asset: MotionAsset) {
  const { sketch, frameCount } = motionGeometry(asset);
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
  const prop = <T,>(k: T) => ({ a: 0, k });
  const colour = [1, 3, 5].map(index => Number.parseInt(asset.colour.slice(index, index + 2), 16) / 255);
  const transform = { p: prop([0, 0]), a: prop([0, 0]), s: prop([100, 100]), r: prop(0), o: prop(100) };
  return {
    v: "5.12.2", nm: asset.name, fr: motionFps, ip: 0, op: frameCount, w: asset.width, h: asset.height, assets: [],
    layers: [{
      ty: 4, ind: 1, nm: asset.name, ks: transform, ip: 0, op: frameCount, st: 0, sr: 1, bm: 0,
      shapes: [{
        ty: "gr", it: [
          { ty: "sh", ks: prop({ v: vertices, i: tangentsIn, o: tangentsOut, c: sketch.closed }) },
          { ty: "st", c: prop(colour), o: prop(100), w: prop(asset.thickness), lc: 2, lj: 2 },
          { ty: "tm", s: prop(0), e: { a: 1, k: [
            { t: 0, s: [0], e: [100], o: { x: [0.33], y: [0.33] }, i: { x: [0.67], y: [0.67] } },
            { t: asset.drawFrames, s: [100] },
          ] }, o: prop(0), m: 1 },
          { ty: "tr", ...transform },
        ],
      }],
    }],
  };
}
