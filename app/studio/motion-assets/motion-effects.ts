import { createElement } from "react";
import { fireBurst, FireBurstArtwork, fireBurstPoster } from "./fire-burst.ts";
import { fireShockwave, FireShockwaveArtwork } from "./fire-shockwave.ts";
import type { MotionEffect } from "./motion-asset.ts";

export { fireBurstPreview as motionEffectPreview } from "./fire-burst.ts";

export const volumetricFireball: MotionEffect = {
  effect: "volumetric-fireball", name: "Volumetric Fireball", width: 1920, height: 1080, durationFrames: 348,
};

const effects = {
  "fire-burst": {
    preset: fireBurst, Artwork: FireBurstArtwork, poster: fireBurstPoster,
    keywords: "fire explosion embers smoke",
  },
  "fire-shockwave": {
    preset: fireShockwave, Artwork: FireShockwaveArtwork, poster: (asset: MotionEffect) => Math.round(asset.durationFrames * 0.18),
    keywords: "fire explosion shockwave flame ring full frame embers",
  },
  "volumetric-fireball": {
    preset: volumetricFireball, Artwork: null, poster: (asset: MotionEffect) => Math.round(asset.durationFrames * 0.14),
    keywords: "fireball flame explosion volumetric original acm",
  },
};

export const motionEffectCatalogue = Object.values(effects).map(({ preset }) => preset);
export const motionEffectPoster = (asset: MotionEffect) => effects[asset.effect].poster(asset);
export const motionEffectKeywords = (asset: MotionEffect) => effects[asset.effect].keywords;

export function MotionEffectArtwork({ asset, frame }: { asset: MotionEffect; frame: number }) {
  const Artwork = effects[asset.effect].Artwork;
  return Artwork ? createElement(Artwork, { asset, frame }) : null;
}
