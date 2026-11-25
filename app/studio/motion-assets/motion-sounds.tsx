"use client";

import { useEffect, useId, useRef, useState } from "react";

type MotionSound = {
  name: string;
  src: string;
  duration: string;
  description: string;
  keywords: string;
};

export const motionSoundCatalogue: readonly MotionSound[] = [
  {
    name: "Explosion and Glass",
    src: "/motion-assets/explosion-and-glass.wav",
    duration: "4.1 s",
    description: "A low explosion with a sharp glass crack, followed by scattered clinks and a fading rumble.",
    keywords: "blast boom shatter smash breaking debris impact audio",
  },
];

function MotionSoundPreview({ sound, active }: { sound: MotionSound; active: boolean }) {
  const player = useRef<HTMLAudioElement>(null);
  const descriptionId = useId();
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const audio = player.current;
    if (!active) audio?.pause();
    return () => audio?.pause();
  }, [active]);

  return <li className="motion-sound-card">
    <div className="motion-sound-name"><strong>{sound.name}</strong><span>{sound.duration}</span></div>
    <span className="sr-only" id={descriptionId}>{sound.description}</span>
    {/* eslint-disable-next-line jsx-a11y/media-has-caption -- The linked text describes the complete speech-free clip. */}
    <audio
      aria-label={`${sound.name} preview`}
      aria-describedby={descriptionId}
      ref={player}
      src={sound.src}
      controls
      controlsList="nodownload"
      preload="none"
      onError={() => setUnavailable(true)}
    />
    <a className="button-secondary" href={sound.src} download aria-label={`Download WAV for ${sound.name}`}>Download WAV</a>
    {unavailable ? <p role="alert">The sound preview couldn’t load.</p> : null}
  </li>;
}

export function MotionSounds({ sounds, active }: { sounds: readonly MotionSound[]; active: boolean }) {
  return <section className="motion-catalogue-group" aria-label="Sound Effects">
    <h2>Sound Effects</h2>
    <ul className="motion-sound-list">
      {sounds.map(sound => <MotionSoundPreview key={sound.src} sound={sound} active={active} />)}
    </ul>
  </section>;
}
