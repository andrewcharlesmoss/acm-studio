type PaneWidth = { width: number; collapsed: boolean };
/** Fit the configured open panes and a usable preview before moving any region below. */
export function twoLeftPaneArrangement(availableWidth: number, primary: PaneWidth, secondary: PaneWidth) {
  const paneWidth = (primary.collapsed ? 0 : primary.width) + (secondary.collapsed ? 0 : secondary.width);
  if (availableWidth >= paneWidth + 240) return "beside";
  // Below/stacked layouts retain 14px for the pane-edge controls.
  return availableWidth >= paneWidth + 14 ? "below" : "stacked";
}

/** Widths for the shared two-left-pane composition; feature owners retain state. */
export function twoLeftPaneWidths(primary: { width: number; collapsed: boolean }, secondary: { width: number; collapsed: boolean }) {
  return {
    "--two-left-primary-width": `${primary.collapsed ? 0 : primary.width}px`,
    "--two-left-secondary-width": `${secondary.collapsed ? 0 : secondary.width}px`,
    "--two-left-secondary-fluid-width": secondary.collapsed ? "0px" : "1fr",
    "--two-left-free-width": secondary.collapsed ? "1fr" : "0px",
  };
}

type PaneBox = { left: number; top: number; width: number; height: number; collapsed: boolean };
export type PaneCollapseControlOptions = { edge?: "left" | "right"; coarsePointer?: boolean; precedingPaneCount?: number };
/** Coordinates are relative to the workspace. Centre controls on the requested pane edge and stack them in stable pane order. */
export function twoPaneCollapseControls(primary: PaneBox, secondary: PaneBox, workspaceHeight: number, { edge: controlEdge = "right", coarsePointer = false, precedingPaneCount = 0 }: PaneCollapseControlOptions = {}) {
  const grouped = primary.collapsed || secondary.collapsed;
  const edge = (pane: PaneBox) => controlEdge === "left" ? pane.left : pane.left + pane.width;
  if (!grouped) return {
    primary: { left: edge(primary), top: primary.top + primary.height / 2 },
    secondary: { left: edge(secondary), top: secondary.top + secondary.height / 2 },
  };
  const left = !secondary.collapsed ? edge(secondary) : !primary.collapsed ? edge(primary) : 0;
  // A 10px visible gap for a mouse; keep the existing 44px touch targets separate.
  // Preceding panes join the same stack, in left-to-right pane order.
  const step = coarsePointer ? 44 : 36;
  const preceding = primary.collapsed && secondary.collapsed ? Math.max(0, Math.trunc(precedingPaneCount)) : 0;
  const firstOffset = -((preceding + 1) * step) / 2 + preceding * step;
  return {
    primary: { left, top: workspaceHeight / 2 + firstOffset },
    secondary: { left, top: workspaceHeight / 2 + firstOffset + step },
  };
}

/** Backwards-compatible right-edge placement used by TwoLeftPaneWorkspace. */
export function twoLeftPaneControls(primary: PaneBox, secondary: PaneBox, workspaceHeight: number, coarsePointer = false, precedingPaneCount = 0) {
  if (primary.collapsed && !secondary.collapsed) {
    // The closed first pane reopens at its own start boundary, before settings.
    // When Studio Navigation shares that boundary, leave a separate target for it.
    const step = coarsePointer ? 44 : 36;
    return {
      primary: { left: secondary.left, top: precedingPaneCount > 0 ? workspaceHeight / 2 + step / 2 : secondary.top + secondary.height / 2 },
      secondary: { left: secondary.left + secondary.width, top: secondary.top + secondary.height / 2 },
    };
  }
  return twoPaneCollapseControls(primary, secondary, workspaceHeight, { coarsePointer, precedingPaneCount });
}
