"use client";
import { useEffect, useSyncExternalStore } from "react";
import { studioWriteOwnership } from "./write-ownership";
import { ensureMediaGeneration } from "./media-store";
import { createMediaHost, reportMediaUnavailable, startMediaClient } from "./media-sync";

export function MediaRuntime() {
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting");
  useEffect(startMediaClient, []);
  useEffect(() => {
    if (ownership !== "writable" || typeof BroadcastChannel !== "function") return;
    let cancelled = false;
    let close: (() => void) | undefined;
    let retry: number | undefined;
    const initialise = () => {
      if (cancelled || !studioWriteOwnership.canWrite()) return;
      void ensureMediaGeneration().then(generation => {
        if (!cancelled && studioWriteOwnership.canWrite()) close = createMediaHost(generation);
      }).catch(() => {
        if (cancelled || !studioWriteOwnership.canWrite()) return;
        reportMediaUnavailable();
        retry = window.setTimeout(initialise, 5000);
      });
    };
    initialise();
    return () => { cancelled = true; if (retry !== undefined) window.clearTimeout(retry); close?.(); };
  }, [ownership]);
  return null;
}
