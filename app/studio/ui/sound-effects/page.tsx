import type { Metadata } from "next";
import { SoundEffectsLibrary } from "../../sound-effects/sound-effects-library";
import { StudioUiSectionHost } from "../studio-ui-section-host";

export const metadata: Metadata = {
  title: "Sound Effects · Studio UI Library",
  description: "Browse, preview, and download sound effects in ACM Studio.",
};

export default function StudioUiSoundEffectsPage() {
  return <StudioUiSectionHost section="sound-effects"><SoundEffectsLibrary /></StudioUiSectionHost>;
}
