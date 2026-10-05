"use client";
import { useEffect, useEffectEvent, useRef } from "react";

export type StudioSection = "content" | "templates" | "files" | "backup" | "bin";
export type StudioTemplateTarget = { setId: string | null; targetId: string | null };

function navigationIndex(state: unknown): number | null {
  const index = state && typeof state === "object" && "studioNavigationIndex" in state ? state.studioNavigationIndex : null;
  return typeof index === "number" && Number.isSafeInteger(index) && index >= 0 ? index : null;
}

function ensureNavigationIndex() {
  const index = navigationIndex(window.history.state);
  if (index !== null) return index;
  window.history.replaceState({ ...window.history.state, studioNavigationIndex: 0 }, "");
  return 0;
}

export function readStudioNavigation(search: string) {
  const query = new URLSearchParams(search);
  const mode = query.get("mode");
  const section = mode === "templates" ? "templates" : mode === "bin" ? "bin" : "content";
  return { section, target: { setId: query.get("set"), targetId: query.get("target") } } as const;
}

/** Navigation history contains screen selection only, never document history. */
export function writeStudioNavigation(mode: "content" | "templates" | "bin", target?: StudioTemplateTarget) {
  const query = new URLSearchParams();
  if (mode !== "content") query.set("mode", mode);
  if (mode === "templates" && target?.setId) {
    query.set("set", target.setId);
    if (target.targetId) query.set("target", target.targetId);
  }
  const nextPath = `/studio${query.size ? `?${query.toString()}` : ""}`;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const index = ensureNavigationIndex();
  if (currentPath !== nextPath) {
    window.history.pushState({ studioNavigationIndex: index + 1 }, "", nextPath);
  }
  window.dispatchEvent(new Event("studio-navigation"));
}
/** URL navigation and screen shortcuts stay independent of storage sessions. */
export function useStudioScreenNavigation({ setStudioSection, setLibraryKind, setPreviewing, setTemplateTarget,
  setShowInserter, setDocumentFieldSelection, setSelectedBlockId, previewWindow, studioSection, activeDocument, publishing, confirmCodeEditorDiscard,
}: {
  setStudioSection: (section: StudioSection) => void;
  setLibraryKind: (kind: "page" | "post" | "templates") => void; setPreviewing: (preview: boolean) => void;
  setTemplateTarget: (target: StudioTemplateTarget) => void;
  setShowInserter: (show: boolean) => void; setDocumentFieldSelection: (field: null) => void;
  setSelectedBlockId: (id: null) => void; previewWindow: boolean; studioSection: StudioSection;
  activeDocument: { kind: "page" | "post" }; publishing: { publish: () => void };
  confirmCodeEditorDiscard: () => boolean;
}) {
  const acceptedLocation = useRef<{ path: string; index: number } | null>(null);
  const canNavigate = useEffectEvent(() => confirmCodeEditorDiscard());
  useEffect(() => {
    if (!previewWindow && !acceptedLocation.current) {
      acceptedLocation.current = { path: `${window.location.pathname}${window.location.search}`, index: ensureNavigationIndex() };
    }
    let restoringPath: string | null = null;
    const rememberLocation = () => {
      if (!previewWindow) acceptedLocation.current = { path: `${window.location.pathname}${window.location.search}`, index: ensureNavigationIndex() };
    };
    const syncModeFromLocation = (event: PopStateEvent) => {
      if (previewWindow) return;
      const path = `${window.location.pathname}${window.location.search}`;
      if (restoringPath === path) {
        restoringPath = null;
        event.stopImmediatePropagation();
        return;
      }
      if (!canNavigate()) {
        // Capture runs before child listeners so refusal cannot unmount or change
        // the draft. Traverse back to the accepted entry without rewriting it.
        event.stopImmediatePropagation();
        const previous = acceptedLocation.current;
        if (!previous) return;
        const destinationIndex = navigationIndex(event.state);
        if (destinationIndex !== null && destinationIndex !== previous.index) {
          restoringPath = previous.path;
          window.history.go(previous.index - destinationIndex);
        } else {
          // Old, unindexed entries have no reliable traversal direction.
          window.history.pushState({ studioNavigationIndex: previous.index }, "", previous.path);
        }
        return;
      }
      acceptedLocation.current = { path, index: ensureNavigationIndex() };
      const navigation = readStudioNavigation(window.location.search);
      setStudioSection(navigation.section);
      setTemplateTarget(navigation.target);
      if (navigation.section === "templates") setLibraryKind("templates");
      else if (navigation.section === "content") setLibraryKind(activeDocument.kind);
      setPreviewing(false);
    };
    const navigation = readStudioNavigation(window.location.search);
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted || previewWindow) return;
      setTemplateTarget(navigation.target);
      if (navigation.section === "templates") { setStudioSection("templates"); setLibraryKind("templates"); }
      else if (navigation.section === "bin") setStudioSection("bin");
      else setLibraryKind(activeDocument.kind);
    });
    window.addEventListener("popstate", syncModeFromLocation, true);
    window.addEventListener("studio-navigation", rememberLocation);
    return () => {
      mounted = false;
      window.removeEventListener("popstate", syncModeFromLocation, true);
      window.removeEventListener("studio-navigation", rememberLocation);
    };
  }, [activeDocument.kind, previewWindow, setLibraryKind, setPreviewing, setStudioSection, setTemplateTarget]);
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      // Menus claim their own Escape; native dialogs dismiss on the later cancel
      // event. Preserve the underlying selection and leave dialog shortcuts alone.
      if (event.defaultPrevented || event.isComposing || document.querySelector("dialog[open]")) return;
      if (!(event.metaKey || event.ctrlKey)) {
        if (event.key === "Escape") {
          setShowInserter(false);
          setDocumentFieldSelection(null);
          setSelectedBlockId(null);
        }
        return;
      }
      if (!previewWindow && event.key.toLowerCase() === "s" && studioSection === "content" && activeDocument.kind === "post") {
        event.preventDefault();
        publishing.publish();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [activeDocument.kind, previewWindow, publishing, studioSection, setDocumentFieldSelection, setSelectedBlockId, setShowInserter]);

}
