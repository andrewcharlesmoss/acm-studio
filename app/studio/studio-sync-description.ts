import type { StudioSyncConflict } from "./studio-sync";

export function studioConflictDetails(conflict: StudioSyncConflict) {
  const paths = conflict.conflicts.map(item => item.change.path.filter(token => !token.startsWith("@")).join(" › ") || "structure");
  const uniquePaths = [...new Set(paths)];
  if (!uniquePaths.length) return "The saved version changed while this tab still had unsaved changes.";
  const visiblePaths = uniquePaths.slice(0, 3).join(", ");
  const remainder = uniquePaths.length > 3 ? `, and ${uniquePaths.length - 3} more` : "";
  return `Overlapping changes: ${visiblePaths}${remainder}.`;
}
