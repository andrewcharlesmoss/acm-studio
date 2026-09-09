"use client";

import { useEffect } from "react";
import { handleStudioHistoryShortcut } from "./studio-history-shortcuts.mjs";

/** One history listener per mounted editor; keep current history callbacks. */
export function useStudioHistoryShortcuts(undo: () => void, redo: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      handleStudioHistoryShortcut(event, navigator.platform, undo, redo);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, enabled]);
}
