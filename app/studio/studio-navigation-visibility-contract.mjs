export const studioNavigationVisibilityItems = [
  { id: "files", label: "Files" },
  { id: "templates", label: "Templates" },
  { id: "designs", label: "Design Canvas" },
  { id: "ui-library", label: "Studio UI Library" },
  { id: "content", label: "Content Editor" },
  { id: "site-editor", label: "Site Editor" },
  { id: "backup", label: "Backup" },
  { id: "bin", label: "Bin" },
];

export const studioNavigationVisibilityKey = "acm-studio-navigation-visibility-v1";
export const studioNavigationVisibilityChangedEvent = "acm-studio-navigation-visibility-saved";

const ids = new Set(studioNavigationVisibilityItems.map(item => item.id));

export function validStudioNavigationHiddenTools(value) {
  try {
    if (typeof value !== "string" || value.length > 512) return false;
    const hidden = JSON.parse(value);
    return Array.isArray(hidden)
      && hidden.length <= ids.size
      && new Set(hidden).size === hidden.length
      && hidden.every(id => typeof id === "string" && ids.has(id));
  } catch {
    return false;
  }
}

export function readStudioNavigationHiddenTools(storage) {
  const value = storage.getItem(studioNavigationVisibilityKey);
  return validStudioNavigationHiddenTools(value) ? JSON.parse(value) : [];
}
