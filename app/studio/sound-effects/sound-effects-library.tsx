"use client";

import { useContext, useState, useSyncExternalStore } from "react";
import { SearchInput } from "../controls/native-fields";
import { LibraryFilePreview, MediaPreviewCard, useLibraryPreviewFiles } from "../media-library-preview";
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
    {sounds.length || audioFiles.length ? <ul className="media-preview-grid">
      {sounds.map(sound => <MediaPreviewCard key={sound.src} name={sound.name} source={sound.src} detail={sound.duration}
        description={sound.description} kind="audio" format="WAV" active={active} />)}
      {audioFiles.map(file => <LibraryFilePreview key={file.asset.id} file={file} active={active} />)}
    </ul> : <p>No matching sound effects.</p>}
    {unavailable ? <p role="status">Your sound files couldn’t be loaded.</p> : null}
  </section>;
}
