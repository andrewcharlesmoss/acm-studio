"use client";

import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import { useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { StudioButton } from "../controls/button";
import { SearchInput } from "../controls/native-fields";
import { assetBefore, type MediaCommand } from "../media-command";
import { MediaPreviewActions, useLibraryFilePreview, useLibraryPreviewFiles, type LibraryPreviewFile, type MediaFileActions } from "../media-library-preview";
import { deleteLibraryFile } from "../media-sync";
import { useMotionPreviewWorkspace } from "../motion-assets/motion-preview-workspace";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { saveStudioPreferenceThroughOwner } from "../studio-preference-broker.mjs";
import { createStudioPreferenceRepository } from "../studio-preference-repository.mjs";
import { StudioUiActiveSectionContext } from "../ui/studio-ui-library";
import { builtInSoundPreferenceChanged, builtInSoundPreferenceKey, readBuiltInSoundPreference, validBuiltInSoundPreference } from "./built-in-sound-preference.mjs";
import "./sound-effects.css";

const builtInSound = {
  name: "Explosion and Glass",
  src: "/motion-assets/explosion-and-glass.wav",
  duration: "4.1 s",
  description: "A low explosion with a sharp glass crack, followed by scattered clinks and a fading rumble.",
  keywords: "blast boom shatter smash breaking debris impact audio",
};
const subscribeToHydration = () => () => {};

function subscribeToBuiltInSound(refresh: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === builtInSoundPreferenceKey || event.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(builtInSoundPreferenceChanged, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(builtInSoundPreferenceChanged, refresh);
  };
}

function builtInSoundSnapshot() {
  try { return readBuiltInSoundPreference(window.localStorage); }
  catch { return "shown"; }
}

async function saveBuiltInSound(mode: "shown" | "hidden") {
  const repository = createStudioPreferenceRepository({
    storage: window.localStorage, key: builtInSoundPreferenceKey,
    read: readBuiltInSoundPreference, validate: validBuiltInSoundPreference,
  });
  let result = await repository.save(mode);
  if (!result.saved && result.reason === "blocked") result = await saveStudioPreferenceThroughOwner("builtInSound", mode);
  if (!result.saved) throw new Error("Studio couldn’t save the built-in sound setting. Try again when local saving reconnects.");
  window.dispatchEvent(new Event(builtInSoundPreferenceChanged));
}

type SoundRemoval = { name: string; opener: HTMLButtonElement } & (
  { kind: "built-in" } | { kind: "file"; generation: string | null; command: Extract<MediaCommand, { kind: "delete-asset" }> }
);
type DeleteSoundAction = { onDelete: (opener: HTMLButtonElement) => void; deleteDisabled: boolean };

function SoundEffectRow({ detail, description, onDelete, deleteDisabled, ...media }: MediaFileActions & DeleteSoundAction & {
  detail?: string; description?: string;
}) {
  const player = useRef<HTMLAudioElement>(null);
  const descriptionId = useId();
  const [unavailable, setUnavailable] = useState(false);
  const { active, name, source } = media;

  useEffect(() => {
    const audio = player.current;
    if (!active) audio?.pause();
    return () => audio?.pause();
  }, [active]);

  return <tr>
    <td>
      <div className="sound-effect-preview">
        <div className="sound-effect-name">
          <strong>{name}</strong>
          {detail ? <span>{detail}</span> : null}
        </div>
        {description ? <span className="sr-only" id={descriptionId}>{description}</span> : null}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- This player previews local audio with its supplied description. */}
        <audio ref={player} src={source} aria-label={`${name} preview`} aria-describedby={description ? descriptionId : undefined}
          controls controlsList="nodownload" preload="none" onError={() => setUnavailable(true)} onCanPlay={() => setUnavailable(false)} />
      </div>
      {unavailable ? <p className="sound-effect-error" role="alert">This preview couldn’t play. Download the file to open it in another app.</p> : null}
    </td>
    <td><MediaPreviewActions {...media} iconOnly>
      {active ? <button type="button" className="button-secondary" aria-label={`Delete ${name}`} title="Delete sound" aria-haspopup="dialog"
        disabled={deleteDisabled} onClick={event => onDelete(event.currentTarget)}>
        <AcmIcon name="action.delete" scale="Regular-S" size={20} />
      </button> : null}
    </MediaPreviewActions></td>
  </tr>;
}

function FileSoundEffectRow({ file, active, ...actions }: { file: LibraryPreviewFile; active: boolean } & DeleteSoundAction) {
  const preview = useLibraryFilePreview(file);
  return preview ? <SoundEffectRow key={preview.source} {...preview} active={active} {...actions} /> : null;
}

export function SoundEffectsLibrary() {
  const active = useContext(StudioUiActiveSectionContext) === "sound-effects";
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { movExport } = useMotionPreviewWorkspace();
  const searchField = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [removal, setRemoval] = useState<SoundRemoval>();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error?: true }>();
  const builtInHidden = useSyncExternalStore(subscribeToBuiltInSound, builtInSoundSnapshot, () => "shown") === "hidden";
  const { files, unavailable, generation } = useLibraryPreviewFiles("audio");
  const query = search.trim().toLowerCase();
  const showBuiltIn = !builtInHidden && [builtInSound.name, builtInSound.keywords].some(value => value.toLowerCase().includes(query));
  const audioFiles = files.filter(({ asset }) => asset.name.toLowerCase().includes(query));

  function requestRemoval(target: SoundRemoval) {
    setFeedback(undefined);
    setRemoval(target);
  }

  function closeRemoval() {
    setFeedback(undefined);
    setRemoval(undefined);
  }

  async function commitSoundChange(target: SoundRemoval | "restore") {
    if (busy) return;
    setBusy(true);
    setFeedback(undefined);
    try {
      if (target === "restore") await saveBuiltInSound("shown");
      else if (target.kind === "file") await deleteLibraryFile(target.command, target.generation);
      else await saveBuiltInSound("hidden");
      setRemoval(undefined);
      const name = target === "restore" ? builtInSound.name : target.name;
      const action = target === "restore" ? "restored" : target.kind === "file" ? "deleted" : "removed";
      setFeedback({ message: `“${name}” ${action}.` });
      requestAnimationFrame(() => searchField.current?.focus());
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "The sound change couldn’t be saved.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return <section className="media-catalogue" aria-labelledby="sound-effects-title" inert={!ready}>
    <div className="media-catalogue-toolbar">
      <div className="media-catalogue-heading"><h1 id="sound-effects-title">Sound Effects</h1></div>
      <label className="media-catalogue-search"><span>Search sound effects</span>
        <SearchInput ref={searchField} value={search} onChange={event => setSearch(event.target.value)} />
      </label>
    </div>
    {active && movExport ? <div className="sound-effects-export">
      {"message" in movExport ? <>
        <p role="status">{movExport.message}</p>
        {movExport.cancel ? <button type="button" className="button-secondary" onClick={movExport.cancel}>Cancel Export</button> : null}
      </> : <p role="alert">{movExport.error}</p>}
    </div> : null}
    {builtInHidden || (!removal && feedback) ? <div className="sound-effects-feedback">
      {builtInHidden ? <StudioButton type="button" variant="secondary" disabled={busy}
        onClick={() => void commitSoundChange("restore")}>Restore {builtInSound.name}</StudioButton> : null}
      {!removal && feedback ? <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
    </div> : null}
    {showBuiltIn || audioFiles.length ? <div className="sound-effects-table-frame">
      <table className="sound-effects-table" aria-labelledby="sound-effects-title" onPlayCapture={event => {
        const playing = event.target;
        if (!(playing instanceof HTMLAudioElement) || playing.paused) return;
        for (const other of event.currentTarget.querySelectorAll("audio")) {
          if (other === playing || other.paused) continue;
          other.pause();
          other.currentTime = 0;
        }
      }}>
        <colgroup><col /><col className="sound-effects-action-column" /></colgroup>
        <thead><tr><th scope="col">Sound Effect</th><th scope="col">Actions</th></tr></thead>
        <tbody>
          {showBuiltIn ? <SoundEffectRow name={builtInSound.name} source={builtInSound.src} detail={builtInSound.duration}
            description={builtInSound.description} format="WAV" active={active} deleteDisabled={busy}
            onDelete={opener => requestRemoval({ kind: "built-in", name: builtInSound.name, opener })} /> : null}
          {audioFiles.map(file => <FileSoundEffectRow key={file.asset.id} file={file} active={active}
            deleteDisabled={busy} onDelete={opener => requestRemoval({
              kind: "file", name: file.asset.name, opener, generation, command: { kind: "delete-asset", id: file.asset.id, before: assetBefore(file.asset) },
            })} />)}
        </tbody>
      </table>
    </div> : <p>{query ? "No matching sound effects." : "No sound effects."}</p>}
    {unavailable ? <p role="status">Your sound files couldn’t be loaded.</p> : null}
    {active && removal ? <StudioDialog title={removal.kind === "file" ? "Delete sound?" : "Remove built-in sound?"} returnFocus={removal.opener}
      closeDisabled={busy} onClose={closeRemoval}>
      {removal.kind === "file"
        ? <p>Permanently delete “{removal.name}” from Studio’s Files library in this browser?</p>
        : <p>Remove “{removal.name}” from this browser’s Sound Effects table? You can restore it from the table.</p>}
      {feedback?.error ? <p role="alert">{feedback.message}</p> : null}
      <StudioDialogActions>
        <StudioButton type="button" variant="secondary" disabled={busy} onClick={closeRemoval}>Cancel</StudioButton>
        <StudioButton type="button" disabled={busy} onClick={() => void commitSoundChange(removal)}>
          {busy ? "Saving…" : removal.kind === "file" ? "Delete sound" : "Remove sound"}
        </StudioButton>
      </StudioDialogActions>
    </StudioDialog> : null}
  </section>;
}
