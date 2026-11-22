"use client";

import { useRef, useState } from "react";
import { MAX_VIDEO_CAPTION_BYTES, normaliseVideoCaptionText, validVideoCaptionLabel, validVideoCaptionLanguage, type VideoCaptionTrack } from "../../../content/video-caption-track";
import { TextInput } from "../../controls/native-fields";
import { InspectorAccordionSection, useInspectorContentDisabled } from "../../inspector-accordion";

type CaptionDraft = { base?: VideoCaptionTrack; value: VideoCaptionTrack; fileName?: string };

export function VideoCaptionInspector({ track, onChange }: { track?: VideoCaptionTrack; onChange: (track: VideoCaptionTrack | undefined) => void }) {
  return <InspectorAccordionSection title="Timed captions"><CaptionTrackControls track={track} onChange={onChange} /></InspectorAccordionSection>;
}

function CaptionTrackControls({ track, onChange }: { track?: VideoCaptionTrack; onChange: (track: VideoCaptionTrack | undefined) => void }) {
  const disabled = useInspectorContentDisabled();
  const input = useRef<HTMLInputElement>(null);
  const chooseFile = useRef<HTMLButtonElement>(null);
  const readSequence = useRef(0);
  const [draft, setDraft] = useState<CaptionDraft | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const edited = draft?.value ?? track;
  const changedElsewhere = Boolean(draft && JSON.stringify(draft.base) !== JSON.stringify(track));
  const validLanguage = !edited || validVideoCaptionLanguage(edited.language);
  const validLabel = !edited || validVideoCaptionLabel(edited.label);

  async function readFile(file: File) {
    const sequence = ++readSequence.current;
    setReading(true);
    setError("");
    try {
      if (!/\.vtt$/i.test(file.name) || file.size > MAX_VIDEO_CAPTION_BYTES) throw new Error("Choose a WebVTT (.vtt) file of 64 KB or less.");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const vtt = normaliseVideoCaptionText(raw);
      if (!vtt) throw new Error("The file needs at least one valid WebVTT cue. Check the cue timings and remove any custom styles or regions.");
      if (sequence !== readSequence.current) return;
      setDraft({ base: draft ? draft.base : track, value: { language: edited?.language ?? "en", label: edited?.label ?? "English", vtt }, fileName: file.name });
    } catch (error) {
      if (sequence === readSequence.current) setError(error instanceof TypeError ? "Choose a WebVTT file encoded as UTF-8." : error instanceof Error ? error.message : "The caption file could not be read.");
    } finally {
      if (sequence === readSequence.current) setReading(false);
    }
  }

  function editField(field: "language" | "label", value: string) {
    if (edited) setDraft({ base: draft ? draft.base : track, value: { ...edited, [field]: value }, fileName: draft?.fileName });
  }

  function clearDraft() {
    readSequence.current++;
    setReading(false);
    setDraft(null);
    setError("");
    chooseFile.current?.focus();
  }

  return <>
    <input ref={input} hidden type="file" accept=".vtt,text/vtt" aria-label="Caption track file" disabled={disabled} onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void readFile(file);
    }} />
    <button ref={chooseFile} type="button" className="paragraph-reset-button" disabled={disabled} onClick={() => input.current?.click()}>{edited ? "Replace WebVTT File" : "Choose WebVTT File"}</button>
    <p className="setting-note video-caption-status" role="status">{reading ? "Reading the caption file…" : draft?.fileName ? draft.fileName : track ? "A caption track is attached." : "Choose a UTF-8 WebVTT file with timed cues."}</p>
    {edited ? <>
      <label><span>Caption track language</span><TextInput value={edited.language} maxLength={35} placeholder="en-GB" aria-invalid={!validLanguage} disabled={disabled || reading} onChange={event => editField("language", event.target.value)} /></label>
      {!validLanguage ? <p className="setting-note">Enter a language tag such as en or en-GB.</p> : null}
      <label><span>Caption track label</span><TextInput value={edited.label} maxLength={80} aria-invalid={!validLabel} disabled={disabled || reading} onChange={event => editField("label", event.target.value)} /></label>
      {!validLabel ? <p className="setting-note">Enter the name shown in the player’s captions menu.</p> : null}
    </> : null}
    {error ? <p className="setting-note" role="alert">{error}</p> : null}
    {changedElsewhere ? <p className="setting-note" role="alert">The saved track changed. Cancel these changes before replacing it.</p> : null}
    {draft ? <>
      <button type="button" className="paragraph-reset-button" disabled={disabled || reading || changedElsewhere || !validLanguage || !validLabel} onClick={() => { onChange(draft.value); clearDraft(); }}>Apply Caption Track</button>
      <button type="button" className="paragraph-reset-button" disabled={disabled} onClick={clearDraft}>Cancel Caption Changes</button>
    </> : null}
    {track && !draft ? <button type="button" className="paragraph-reset-button" disabled={disabled || reading} onClick={() => { onChange(undefined); clearDraft(); }}>Remove Caption Track</button> : null}
  </>;
}
