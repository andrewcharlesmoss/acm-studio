export type StyleGuideSelection = {
  hoveredSourcePath: string | null;
  hoveredGuidePath: string | null;
  focusedSourcePath: string | null;
  pinnedSourcePath: string | null;
};

export type StyleGuideSelectionAction =
  | { type: "hover-source"; path: string | null }
  | { type: "hover-guide"; path: string | null }
  | { type: "focus-source"; path: string | null }
  | { type: "pin-source"; path: string }
  | { type: "clear-source-hover" }
  | { type: "clear-guide-hover" }
  | { type: "clear-focus" }
  | { type: "clear-pin" }
  | { type: "clear-hover" }
  | { type: "clear-all" };

export const initialStyleGuideSelection: StyleGuideSelection = {
  hoveredSourcePath: null,
  hoveredGuidePath: null,
  focusedSourcePath: null,
  pinnedSourcePath: null,
};

export function styleGuideSelectionReducer(
  state: StyleGuideSelection,
  action: StyleGuideSelectionAction,
): StyleGuideSelection {
  switch (action.type) {
    case "hover-source": return { ...state, hoveredSourcePath: action.path };
    case "hover-guide": return { ...state, hoveredGuidePath: action.path };
    case "focus-source": return { ...state, focusedSourcePath: action.path };
    case "pin-source": return {
      ...state,
      hoveredSourcePath: null,
      hoveredGuidePath: null,
      focusedSourcePath: null,
      pinnedSourcePath: action.path,
    };
    case "clear-source-hover": return { ...state, hoveredSourcePath: null };
    case "clear-guide-hover": return { ...state, hoveredGuidePath: null };
    case "clear-focus": return { ...state, focusedSourcePath: null };
    case "clear-pin": return { ...state, pinnedSourcePath: null };
    case "clear-hover": return { ...state, hoveredSourcePath: null, hoveredGuidePath: null };
    case "clear-all": return initialStyleGuideSelection;
  }
}

function previewPathForStylePath(path: string | null): string | null {
  if (!path) return null;
  const segments = path.split(".");
  if (segments[0] === "typography" && segments.length >= 2) {
    return segments[1] === "button" ? "buttons.base.background" : `typography.${segments[1]}.size`;
  }
  if (segments[0] === "buttons" && segments.length >= 2) return `buttons.${segments[1]}.background`;
  if (segments[0] === "layout") return null;
  return path;
}

export function selectedStyleGuidePreviewPath(selection: StyleGuideSelection): string | null {
  return previewPathForStylePath(selection.hoveredGuidePath ?? selection.focusedSourcePath ?? selection.pinnedSourcePath);
}
