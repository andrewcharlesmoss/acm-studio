import type { IAudioMetadata } from "music-metadata";

export type MetadataRow = { label: string; value: string };
export type MediaFileMetadata = { properties: MetadataRow[]; tags: MetadataRow[] };
export type MediaMetadataResult = { metadata: MediaFileMetadata | null };

const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function metadataDate(value: Date) {
  return Number.isFinite(value.getTime()) ? `${date.format(value)} UTC` : undefined;
}

function mediaDate(value: Date | undefined) {
  // MOV and MP4 use a zero movie-header timestamp when the date is unknown.
  if (!value || value.getTime() === Date.UTC(1904, 0, 1)) return undefined;
  return metadataDate(value);
}

function quantity(value: number | undefined, unit: string) {
  return value !== undefined && Number.isFinite(value) && value > 0 ? `${number.format(value)} ${unit}` : undefined;
}

function scaled(value: number | undefined, factor: number, unit: string) {
  return value === undefined ? undefined : quantity(value / factor, unit);
}

function rows(values: Array<[string, string | undefined]>): MetadataRow[] {
  return values.flatMap(([label, value]) => {
    const text = value?.trim();
    if (!text) return [];
    return [{ label, value: text.length > 8000 ? `${text.slice(0, 8000)}…` : text }];
  });
}

export function summariseMediaFile({ common, format }: IAudioMetadata): MediaFileMetadata {
  const video = format.trackInfo.find(track => track.video);
  const dimensions = video?.video;
  const channels = format.numberOfChannels;
  const properties = rows([
    ["Duration", quantity(format.containerDuration ?? format.duration, "s")],
    ["Container", format.container === "qt" ? "QuickTime" : format.container],
    ["Video codec", video?.codecName ?? video?.codecId],
    ["Dimensions", dimensions?.pixelWidth && dimensions.pixelHeight ? `${dimensions.pixelWidth} × ${dimensions.pixelHeight} px` : undefined],
    ["Frame rate", quantity(dimensions?.frameRate, "fps")],
    ["Audio codec", format.codec],
    ["Sample rate", scaled(format.sampleRate, 1000, "kHz")],
    ["Audio channels", channels === 1 ? "Mono (1)" : channels === 2 ? "Stereo (2)" : quantity(channels, "channels")],
    ["Bit depth", format.lossless === false ? undefined : quantity(format.bitsPerSample, "bit")],
    ["Audio bitrate", scaled(format.bitrate, 1000, "kbps")],
    ["Media created", mediaDate(format.creationTime)],
    ["Media modified", mediaDate(format.modificationTime)],
  ]);
  const tags = rows([
    ["Title", common.title],
    ["Artist", common.artist ?? common.artists?.join(", ")],
    ["Album", common.album],
    ["Genre", common.genres?.join(", ")],
    ["Description", common.description?.join("\n")],
    ["Copyright", common.copyright],
    ["Licence", common.license],
    ["Website", common.website],
    ...(common.comments ?? []).slice(0, 20).map(({ descriptor, text }): [string, string | undefined] =>
      [descriptor ? `Comment (${descriptor.slice(0, 100)})` : "Comment", text]),
  ]);
  return { properties, tags };
}
