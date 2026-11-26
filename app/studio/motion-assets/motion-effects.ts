import { createElement } from "react";
import { FireBurstArtwork, fireBurstPoster } from "./fire-burst.ts";
import { FireShockwaveArtwork } from "./fire-shockwave.ts";
import { motionFps, type MotionEffect } from "./motion-asset.ts";

export { fireBurstPreview as motionEffectPreview } from "./fire-burst.ts";

export const volumetricFireball: MotionEffect = {
  effect: "volumetric-fireball", name: "Volumetric Fireball", width: 1920, height: 1080, durationFrames: motionFps,
};

export const softFadeFireball: MotionEffect = {
  ...volumetricFireball, effect: "volumetric-fireball-soft-fade", name: "Volumetric Fireball (Soft Fade)",
};

export const rollingFireball: MotionEffect = {
  ...volumetricFireball, effect: "rolling-fireball", name: "Rolling Fireball",
};

const volumetricPosterFrame = (asset: MotionEffect) => Math.round(asset.durationFrames * 0.14);

const effects = {
  "volumetric-fireball-soft-fade": {
    Artwork: null, poster: volumetricPosterFrame,
    keywords: "fireball flame explosion volumetric soft fade dissolve",
  },
  "fire-burst": {
    Artwork: FireBurstArtwork, poster: fireBurstPoster,
    keywords: "fire explosion embers smoke",
  },
  "fire-shockwave": {
    Artwork: FireShockwaveArtwork, poster: (asset: MotionEffect) => Math.round(asset.durationFrames * 0.18),
    keywords: "fire explosion shockwave flame ring full frame embers",
  },
  "rolling-fireball": {
    Artwork: null, poster: (asset: MotionEffect) => Math.round((asset.durationFrames - 1) * 0.28),
    keywords: "volumetric fireball explosion rolling flame billows smoke",
  },
  "volumetric-fireball": {
    Artwork: null, poster: volumetricPosterFrame,
    keywords: "fireball flame explosion volumetric original acm",
  },
};

export const motionEffectCatalogue = [volumetricFireball, softFadeFireball, rollingFireball];
export const motionEffectPoster = (asset: MotionEffect) => effects[asset.effect].poster(asset);
export const motionEffectKeywords = (asset: MotionEffect) => effects[asset.effect].keywords;

export function MotionEffectArtwork({ asset, frame }: { asset: MotionEffect; frame: number }) {
  const Artwork = effects[asset.effect].Artwork;
  return Artwork ? createElement(Artwork, { asset, frame }) : null;
}
