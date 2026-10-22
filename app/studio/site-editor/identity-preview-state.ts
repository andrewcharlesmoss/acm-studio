export type PreviewScope = "global" | "test" | "test2";
export type IdentityImage = { id: string; name: string; altText: string; blob: Blob };
export type IdentityField = "title" | "tagline" | "logo" | "icon";
export const originalIdentityText = Object.freeze({ title: "Site Title", tagline: "A short description of your site." });
export type SiteIdentity = { title?: string | null; tagline?: string | null; logo?: IdentityImage | null; icon?: IdentityImage | null; hidden?: Partial<Record<IdentityField, true>> };
export type ResolvedSiteIdentity = { title: string; tagline: string; logo?: IdentityImage; icon?: IdentityImage };
/** Visibility is independent of values; null remains readable from earlier temporary drafts. */
export function identityFieldHidden(identity: SiteIdentity, field: IdentityField) { return identity.hidden?.[field] === true || identity[field] === null; }
export function resolveIdentityPreview(values: IdentityValues, scope: PreviewScope): ResolvedSiteIdentity {
  const own = values[scope];
  const text = (field: "title" | "tagline") => {
    const value = own[field];
    if (identityFieldHidden(own, field)) return "";
    if (value?.trim()) return value;
    return scope === "global" || identityFieldHidden(values.global, field) ? "" : values.global[field]?.trim() ? values.global[field]! : "";
  };
  const image = (field: "logo" | "icon") => identityFieldHidden(own, field) ? undefined : own[field] ?? (scope === "global" || identityFieldHidden(values.global, field) ? undefined : values.global[field] ?? undefined);
  return { title: text("title"), tagline: text("tagline"), logo: image("logo"), icon: image("icon") };
}
export type IdentityValues = Record<PreviewScope, SiteIdentity>;
type History = { past: IdentityValues[]; present: IdentityValues; future: IdentityValues[] };
export type IdentityAction = { type: "reset-all"; site: PreviewScope } | { type: "reset-field"; site: PreviewScope; field: IdentityField } | { type: "remove-image"; site: PreviewScope; field: "logo" | "icon" } | { type: "set-hidden"; site: PreviewScope; field: IdentityField; hidden: boolean } | { type: "change"; site: PreviewScope; patch: Partial<SiteIdentity> } | { type: "undo" | "redo" };
export function canResetIdentityField(values: IdentityValues, scope: PreviewScope, field: IdentityField): boolean {
  const target = scope === "global" && (field === "title" || field === "tagline") ? originalIdentityText[field] : undefined;
  return values[scope][field] !== target || identityFieldHidden(values[scope], field);
}
export function canResetIdentity(values: IdentityValues, scope: PreviewScope): boolean {
  return (["title", "tagline", "logo", "icon"] as const).some(field => canResetIdentityField(values, scope, field));
}
export function createIdentityPreview(): History { return { past: [], present: { global: { ...originalIdentityText }, test: { title: "Test", tagline: "A place for ideas." }, test2: { title: "Test 2", tagline: "Something new starts here." } }, future: [] }; }
export function identityPreviewReducer(state: History, action: IdentityAction): History {
  if (action.type === "undo") { const previous = state.past.at(-1); return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state; }
  if (action.type === "redo") { const next = state.future[0]; return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state; }
  if (action.type === "reset-all") {
    if (!canResetIdentity(state.present, action.site)) return state;
    const identity: SiteIdentity = action.site === "global" ? { ...originalIdentityText } : {};
    return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.site]: identity }, future: [] };
  }
  if (action.type === "reset-field") {
    if (!canResetIdentityField(state.present, action.site, action.field)) return state;
    const current = state.present[action.site];
    const hidden = { ...current.hidden };
    delete hidden[action.field];
    const value = action.site === "global" && (action.field === "title" || action.field === "tagline") ? originalIdentityText[action.field] : undefined;
    return identityPreviewReducer(state, { type: "change", site: action.site, patch: { [action.field]: value, hidden: Object.keys(hidden).length ? hidden : undefined } });
  }
  if (action.type === "remove-image") {
    const current = state.present[action.site];
    if (!current[action.field]) return state;
    // Removing an override leaves its independent visibility choice unchanged.
    return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.site]: { ...current, [action.field]: undefined } }, future: [] };
  }
  if (action.type !== "change" && action.type !== "set-hidden") return state;
  const current = state.present[action.site];
  if (action.type === "set-hidden") {
    if (identityFieldHidden(current, action.field) === action.hidden) return state;
    const hidden = { ...current.hidden };
    if (action.hidden) hidden[action.field] = true; else delete hidden[action.field];
    const next = { ...current, hidden: Object.keys(hidden).length ? hidden : undefined };
    if (!action.hidden && next[action.field] === null) delete next[action.field];
    return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.site]: next }, future: [] };
  }
  const patch = { ...action.patch };
  // An explicit reset also clears visibility, so it always restores inheritance.
  const hidden = { ...current.hidden };
  for (const field of ["title", "tagline", "logo", "icon"] as const) if (Object.hasOwn(patch, field) && patch[field] === undefined) delete hidden[field];
  if (Object.keys(hidden).length !== Object.keys(current.hidden ?? {}).length) patch.hidden = Object.keys(hidden).length ? hidden : undefined;
  for (const field of ["title", "tagline"] as const) {
    if (typeof patch[field] === "string" && !patch[field]!.trim()) patch[field] = undefined;
  }
  if (Object.entries(patch).every(([key, value]) => current[key as keyof SiteIdentity] === value)) return state;
  return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.site]: { ...current, ...patch } }, future: [] };
}
