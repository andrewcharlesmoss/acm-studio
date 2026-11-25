"use client";

import { useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SearchInput } from "../controls/native-fields";
import { MediaPreviewActions, useLibraryFilePreview, useLibraryPreviewFiles, type LibraryPreviewFile, type MediaFileActions } from "../media-library-preview";
import { useMotionPreviewWorkspace } from "../motion-assets/motion-preview-workspace";
import { StudioUiActiveSectionContext } from "../ui/studio-ui-library";
import "./sound-effects.css";

const builtInSounds = [
  {
    name: "Explosion and Glass",
    src: "/motion-assets/explosion-and-glass.wav",
    duration: "4.1 s",
    description: "A low explosion with a sharp glass crack, followed by scattered clinks and a fading rumble.",
    keywords: "blast boom shatter smash breaking debris impact audio",
  },
];
const subscribeToHydration = () => () => {};

function SoundEffectRow({ detail, description, ...media }: MediaFileActions & { detail?: string; description?: string }) {
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
    <td><MediaPreviewActions {...media} iconOnly /></td>
  </tr>;
}

function FileSoundEffectRow({ file, active }: { file: LibraryPreviewFile; active: boolean }) {
  const preview = useLibraryFilePreview(file);
  return preview ? <SoundEffectRow key={preview.source} {...preview} active={active} /> : null;
}

export function SoundEffectsLibrary() {
  const active = useContext(StudioUiActiveSectionContext) === "sound-effects";
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const { movExport } = useMotionPreviewWorkspace();
  const [search, setSearch] = useState("");
  const { files, unavailable } = useLibraryPreviewFiles("audio");
  const query = search.trim().toLowerCase();
  const sounds = builtInSounds.filter(sound => [sound.name, sound.keywords].some(value => value.toLowerCase().includes(query)));
  const audioFiles = files.filter(({ asset }) => asset.name.toLowerCase().includes(query));

  return <section className="media-catalogue" aria-labelledby="sound-effects-title" inert={!ready}>
    <div className="media-catalogue-toolbar">
      <div className="media-catalogue-heading"><h1 id="sound-effects-title">Sound Effects</h1></div>
      <label className="media-catalogue-search"><span>Search sound effects</span>
        <SearchInput value={search} onChange={event => setSearch(event.target.value)} />
      </label>
    </div>
    {active && movExport ? <div className="sound-effects-export">
      {"message" in movExport ? <>
        <p role="status">{movExport.message}</p>
        {movExport.cancel ? <button type="button" className="button-secondary" onClick={movExport.cancel}>Cancel Export</button> : null}
      </> : <p role="alert">{movExport.error}</p>}
    </div> : null}
    {sounds.length || audioFiles.length ? <div className="sound-effects-table-frame">
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
          {sounds.map(sound => <SoundEffectRow key={sound.src} name={sound.name} source={sound.src} detail={sound.duration}
            description={sound.description} format="WAV" active={active} />)}
          {audioFiles.map(file => <FileSoundEffectRow key={file.asset.id} file={file} active={active} />)}
        </tbody>
      </table>
    </div> : <p>No matching sound effects.</p>}
    {unavailable ? <p role="status">Your sound files couldn’t be loaded.</p> : null}
  </section>;
}
