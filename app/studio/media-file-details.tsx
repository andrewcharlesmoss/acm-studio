"use client";

import { useEffect, useRef, useState } from "react";
import { StudioDialog } from "./overlays/dialog";
import { metadataDate, type MediaFileMetadata, type MediaMetadataResult, type MetadataRow } from "./media-file-metadata";
import metadataWorkerUrl from "./media-file-metadata-worker.ts?worker&url";
import "./media-file-details.css";

type MediaFileDetailsProps = { name: string; source: Blob | string; addedAt?: string };
type FileRead = { source: Blob | string; blob?: Blob; metadata: MediaFileMetadata | null };

const metadataReadTimeoutMs = 10_000;

function FileMetadataRows({ rows }: { rows: readonly MetadataRow[] }) {
  return <dl className="media-file-details-rows">{rows.map(({ label, value }, index) =>
    <div key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>
  )}</dl>;
}

function FileMetadataPanel({ name, source, addedAt }: MediaFileDetailsProps) {
  const [readout, setReadout] = useState<FileRead>();
  const result = readout?.source === source ? readout : undefined;
  useEffect(() => {
    const controller = new AbortController();
    let worker: Worker | undefined;
    let blob: Blob | undefined;
    const receive = (metadata: MediaFileMetadata | null) => {
      clearTimeout(timeout);
      worker?.terminate();
      if (!controller.signal.aborted) setReadout({ source, blob, metadata });
    };
    const timeout = setTimeout(() => {
      receive(null);
      controller.abort();
    }, metadataReadTimeoutMs);
    async function read() {
      try {
        if (typeof source === "string") {
          const response = await fetch(source, { signal: controller.signal });
          if (!response.ok) throw new Error("File unavailable");
          blob = await response.blob();
        } else blob = source;
        if (controller.signal.aborted) return;
        worker = new Worker(metadataWorkerUrl, { type: "module" });
        worker.onmessage = ({ data }: MessageEvent<MediaMetadataResult>) => receive(data.metadata);
        worker.onerror = () => receive(null);
        worker.postMessage(blob);
      } catch { receive(null); }
    }
    void read();
    return () => {
      clearTimeout(timeout);
      controller.abort();
      worker?.terminate();
    };
  }, [source]);

  const blob = typeof source === "string" ? result?.blob : source;
  const fileRows = [
    ["File type", blob?.type || undefined],
    ["File size", blob && `${blob.size.toLocaleString("en-GB")} bytes`],
    ["Added to Studio", addedAt && metadataDate(new Date(addedAt))],
    ["File modified", blob instanceof File && blob.lastModified ? metadataDate(new Date(blob.lastModified)) : undefined],
  ].flatMap(([label, value]) => label && value ? [{ label, value }] : []);
  const properties = result?.metadata?.properties ?? [];
  const tags = result?.metadata?.tags ?? [];

  return <div className="media-file-details">
    <p className="media-file-details-name">{name}</p>
    {fileRows.length > 0 || properties.length > 0 ? <FileMetadataRows rows={[...fileRows, ...properties]} /> : null}
    {result === undefined ? <p role="status">Reading media metadata…</p> : result.metadata === null
      ? <p role="status">Media metadata couldn’t be read from this file.</p> : null}
    {result?.metadata ? <section aria-label="Embedded tags">
      <h3>Embedded Tags</h3>
      {tags.length ? <FileMetadataRows rows={tags} /> : <p>This file has no readable descriptive tags.</p>}
    </section> : null}
  </div>;
}

export function MediaFileDetailsButton({ name, source, addedAt }: MediaFileDetailsProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return <>
    <button ref={trigger} type="button" className="button-secondary" aria-haspopup="dialog"
      aria-label={`File Details for ${name}`} onClick={() => setOpen(true)}>File Details</button>
    {open ? <StudioDialog title="File Details" returnFocus={trigger} onClose={() => setOpen(false)}>
      <FileMetadataPanel name={name} source={source} addedAt={addedAt} />
    </StudioDialog> : null}
  </>;
}
