"use client";

import { useSyncExternalStore } from "react";
import { safeVideoSource } from "../../content/video-block";
import { safeImageSource } from "../../content/rich-text";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Decorative native media layer. A Cover's validated image remains the still fallback. */
export function NativeCoverVideoBackground({ source, poster }: { source: string; poster?: string }) {
  const reducedMotion = useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
  const safeSource = safeVideoSource(source);
  const safePoster = poster ? safeImageSource(poster) : null;
  if (!safeSource || reducedMotion) return null;
  return <div className="content-cover-native-video" aria-hidden="true"><video src={safeSource} poster={safePoster ?? undefined} autoPlay muted loop playsInline preload="none" tabIndex={-1} /></div>;
}
