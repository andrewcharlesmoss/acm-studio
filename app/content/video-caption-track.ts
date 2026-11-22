export type VideoCaptionTrack = {
  language: string;
  label: string;
  vtt: string;
};

export const MAX_VIDEO_CAPTION_BYTES = 64 * 1024;
const captionDataPrefix = "data:text/vtt;charset=utf-8,";
const timestamp = "(?:(\\d{2,}):)?([0-5]\\d):([0-5]\\d)\\.(\\d{3})";
const cueTimings = new RegExp(`^${timestamp}[ \\t]+-->[ \\t]+${timestamp}(?:[ \\t]+[^\\r\\n]*)?$`);

function seconds([hours, minutes, seconds, millis]: string[]) {
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(millis) / 1000;
}

export function normaliseVideoCaptionText(value: string): string | null {
  // Bound the work before encoding or splitting text read from an archive.
  if (value.length > MAX_VIDEO_CAPTION_BYTES || value.includes("\0") || /[\uD800-\uDFFF]/u.test(value) || new TextEncoder().encode(value).byteLength > MAX_VIDEO_CAPTION_BYTES) return null;
  const normalised = value.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const [header, ...blocks] = normalised.trimEnd().split(/\n[ \t]*\n+/);
  if (!/^WEBVTT(?:[ \t][^\n]*)?$/.test(header) || header.includes("-->")) return null;
  let previousStart = 0;
  let cues = 0;
  for (const block of blocks) {
    if (/^NOTE(?:[ \t]|\n|$)/.test(block)) continue;
    const lines = block.split("\n");
    const timingIndex = lines[0].includes("-->") ? 0 : 1;
    const timing = lines[timingIndex]?.match(cueTimings);
    const body = lines.slice(timingIndex + 1);
    if (!timing || !body.some(line => line.trim()) || body.some(line => line.includes("-->")) || lines[0] === "STYLE" || lines[0] === "REGION") return null;
    const start = seconds(timing.slice(1, 5));
    const end = seconds(timing.slice(5, 9));
    if (!Number.isFinite(end) || start < previousStart || end <= start) return null;
    previousStart = start;
    cues++;
  }
  return cues ? normalised : null;
}

export function validVideoCaptionLanguage(value: string): boolean {
  if (!value || value.length > 35) return false;
  try { return Intl.getCanonicalLocales(value).length === 1; } catch { return false; }
}

export function validVideoCaptionLabel(value: string): boolean {
  return value.length <= 80 && value.trim().length > 0 && !/[\p{Cc}\uD800-\uDFFF]/u.test(value);
}

export function validVideoCaptionTrack(value: unknown): value is VideoCaptionTrack {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { language, label, vtt } = value as Partial<VideoCaptionTrack>;
  return typeof language === "string" && validVideoCaptionLanguage(language)
    && typeof label === "string" && validVideoCaptionLabel(label)
    && typeof vtt === "string" && normaliseVideoCaptionText(vtt) !== null;
}

export function videoCaptionTrackSource(track: VideoCaptionTrack): string {
  return captionDataPrefix + encodeURIComponent(track.vtt);
}

export function readVideoCaptionTrackSource(source: string, language: string, label: string): VideoCaptionTrack | null {
  if (!source.startsWith(captionDataPrefix) || source.length > captionDataPrefix.length + MAX_VIDEO_CAPTION_BYTES * 3) return null;
  try {
    const candidate = { language, label, vtt: decodeURIComponent(source.slice(captionDataPrefix.length)) };
    return validVideoCaptionTrack(candidate) ? candidate : null;
  } catch { return null; }
}
