export type PreviewScope = "global" | "test" | "test2";
export type IdentityImage = { id: string; name: string; altText: string; blob: Blob };
export type SiteIdentity = { title: string; tagline: string; logo?: IdentityImage; icon?: IdentityImage };
export type IdentityValues = Record<Exclude<PreviewScope, "global">, SiteIdentity>;
type History = { past: IdentityValues[]; present: IdentityValues; future: IdentityValues[] };
type Action = { type: "change"; site: Exclude<PreviewScope, "global">; patch: Partial<SiteIdentity> } | { type: "undo" | "redo" };
export function createIdentityPreview(): History { return { past: [], present: { test: { title: "Test", tagline: "A place for ideas." }, test2: { title: "Test 2", tagline: "Something new starts here." } }, future: [] }; }
export function identityPreviewReducer(state: History, action: Action): History {
  if (action.type === "undo") { const previous = state.past.at(-1); return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state; }
  if (action.type === "redo") { const next = state.future[0]; return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state; }
  if (action.type !== "change") return state;
  const current = state.present[action.site];
  if (Object.entries(action.patch).every(([key, value]) => current[key as keyof SiteIdentity] === value)) return state;
  return { past: [...state.past, state.present].slice(-60), present: { ...state.present, [action.site]: { ...current, ...action.patch } }, future: [] };
}
