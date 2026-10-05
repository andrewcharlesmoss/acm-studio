/** Keep inspector overlays on the workspace-facing left, without flipping. */
export function inspectorPopoverGeometry({ ownerLeft, anchorTop, popupHeight, preferredWidth, viewportWidth, viewportHeight, boundaryLeft = ownerLeft }) {
  const margin = Math.min(16, Math.max(0, viewportWidth / 4));
  const viewportWidthLimit = Math.max(1, Math.min(preferredWidth, viewportWidth - margin * 2));
  const workspaceWidth = ownerLeft - 12 - margin;
  // Shrink into usable workspace before clamping. Very narrow space must not
  // compress palette forms into unusable columns or flip them across the pane.
  const width = workspaceWidth >= Math.min(viewportWidthLimit, 200)
    ? Math.min(viewportWidthLimit, workspaceWidth)
    : viewportWidthLimit;
  const maxHeight = Math.max(1, viewportHeight - 32);
  return {
    width,
    left: Math.max(margin, Math.min(Math.min(ownerLeft, boundaryLeft) - width - 12, viewportWidth - width - margin)),
    top: Math.max(16, Math.min(anchorTop, viewportHeight - Math.min(popupHeight, maxHeight) - 16)),
    maxHeight,
  };
}
