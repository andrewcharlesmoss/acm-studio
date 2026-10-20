export type PreviewScope = "global" | "test" | "test2";
export type IdentityImage = { id: string; name: string; altText: string; blob: Blob };
export type SiteIdentity = { title?: string | null; tagline?: string | null; logo?: IdentityImage; icon?: IdentityImage };
export type ResolvedSiteIdentity = Omit<SiteIdentity, "title" | "tagline"> & { title: string; tagline: string };
/** Unset text inherits; null explicitly hides. Images always belong to the scope. */
export function resolveIdentityPreview(values: IdentityValues, scope: PreviewScope): ResolvedSiteIdentity {
  const own = values[scope];
  const text = (field: "title" | "tagline") => {
    const value = own[field];
    if (value === null) return "";
    if (value?.trim()) return value;
    return scope === "global" ? "" : values.global[field]?.trim() ? values.global[field]! : "";
  };
  return { ...own, title: text("title"), tagline: text("tagline") };
}
export type IdentityValues = Record<PreviewScope, SiteIdentity>;
type History = { past: IdentityValues[]; present: IdentityValues; future: IdentityValues[] };
type Action = { type: "change"; site: PreviewScope; patch: Partial<SiteIdentity> } | { type: "undo" | "redo" };
export function createIdentityPreview(): History { return { past: [], present: { global: { title: "Site Title", tagline: "A short description of your site." }, test: { title: "Test", tagline: "A place for ideas." }, test2: { title: "Test 2", tagline: "Something new starts here." } }, future: [] }; }
export function identityPreviewReducer(state: History, action: Action): History {
  if (action.type === "undo") { const previous = state.past.at(-1); return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state; }
  if (action.type === "redo") { const next = state.future[0]; return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state; }
  if (action.type !== "change") return state;
  const patch = { ...action.patch };
  for (const field of ["title", "tagline"] as const) {
    if (typeof patch[field] === "string" && !patch[field]!.trim()) patch[field] = undefined;
  }
  const current = state.present[action.site];
  if (Object.entries(patch).every(([key, value]) => current[key as keyof SiteIdentity] === value)) return state;
  return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.site]: { ...current, ...patch } }, future: [] };
}
