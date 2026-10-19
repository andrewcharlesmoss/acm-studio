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
/** Coordinates are relative to the workspace. Centre the stack in stable pane order. */
export function twoLeftPaneControls(primary: PaneBox, secondary: PaneBox, workspaceHeight: number, coarsePointer = false) {
  const grouped = primary.collapsed || secondary.collapsed;
  if (!grouped) return {
    primary: { left: primary.left + primary.width, top: primary.top + primary.height / 2 },
    secondary: { left: secondary.left + secondary.width, top: secondary.top + secondary.height / 2 },
  };
  const left = !secondary.collapsed ? secondary.left + secondary.width : !primary.collapsed ? primary.left + primary.width : 0;
  // A 10px visible gap for a mouse; keep the existing 44px touch targets separate.
  const offset = (coarsePointer ? 44 : 36) / 2;
  return {
    primary: { left, top: workspaceHeight / 2 - offset },
    secondary: { left, top: workspaceHeight / 2 + offset },
  };
}
