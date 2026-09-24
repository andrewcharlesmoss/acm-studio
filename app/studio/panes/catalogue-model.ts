export const paneContractVersion = "0.2.0";
export type PaneExampleId = "skeleton" | "navigation" | "blocks" | "inspector" | "design-navigation" | "design-properties";
export type PaneDefinition = {
  id: PaneExampleId; label: string; side: "left" | "right"; width: number;
  description: string; tabs: readonly string[]; toolbar: boolean; footer: boolean;
  source: string; sourceComponent: string;
};
export const paneExamples: readonly PaneDefinition[] = [
  { id: "navigation", label: "Studio Navigation", side: "left", width: 290, description: "Tools and tabbed document navigation, with persistent bottom actions.", tabs: ["Pages", "Posts", "Templates"], toolbar: true, footer: true, source: "app/studio/studio-prototype.tsx", sourceComponent: "StudioPrototype · studio-library" },
  { id: "blocks", label: "Block Library", side: "left", width: 320, description: "A searchable, grouped collection of blocks.", tabs: [], toolbar: true, footer: false, source: "app/studio/studio-canvas.tsx", sourceComponent: "StudioCanvas · block-inserter" },
  { id: "inspector", label: "Editor Inspector", side: "right", width: 300, description: "WordPress-familiar page and post settings, with Studio-specific controls on their own tab.", tabs: ["Page/Post", "Studio", "Block", "Styles"], toolbar: false, footer: false, source: "app/studio/studio-inspectors.tsx", sourceComponent: "StudioInspector" },
  { id: "design-navigation", label: "Design Pages/Layers", side: "left", width: 224, description: "Page thumbnails and layer rows share one navigation pane.", tabs: ["Pages", "Layers"], toolbar: false, footer: true, source: "app/studio/design-editor.tsx", sourceComponent: "DesignEditor · design-pages" },
  { id: "design-properties", label: "Design Properties", side: "right", width: 260, description: "Grouped page and object settings in a scrolling inspector.", tabs: [], toolbar: false, footer: false, source: "app/studio/design-editor.tsx", sourceComponent: "DesignEditor · design-inspector" },
];
export const skeletonDefinition: PaneDefinition = { id: "skeleton", label: "Pane Skeleton", side: "left", width: 290, description: "Labelled regions with small, working controls.", tabs: ["First", "Second"], toolbar: true, footer: true, source: "", sourceComponent: "Pane" };
export const paneTokens = ["--pane-surface", "--pane-body-surface", "--pane-border", "--pane-text", "--pane-muted", "--pane-hover", "--pane-space", "--pane-control-width", "--pane-control-height", "--pane-font", "--pane-font-size"];
export type RegionOptions = { header: boolean; tabs: boolean; toolbar: boolean; footer: boolean };
export const defaultRegions: RegionOptions = { header: true, tabs: true, toolbar: true, footer: true };
export type StructureRegion = { id: string; label: string; description: string };
export function paneStructure(sides: readonly ("left" | "right")[], options: RegionOptions): StructureRegion[] {
  return [{ id: "workspace", label: "Workspace", description: "Fixed pane tracks surround a flexible centre." },
    ...sides.flatMap((side) => [
      { id: side, label: `${side === "left" ? "Left" : "Right"} Pane`, description: "The stable, labelled pane container; hidden when collapsed." },
      ...(options.header ? [{ id: `${side}.header`, label: "Header", description: "A fixed title and optional local actions." }] : []),
      ...(options.tabs ? [{ id: `${side}.tabs`, label: "Tabs", description: "Keyboard-operable tabs select a body panel." }] : []),
      ...(options.toolbar ? [{ id: `${side}.toolbar`, label: "Toolbar / Search", description: "Controls remain above the scrolling content." }] : []),
      { id: `${side}.body`, label: "Scrolling Body", description: "Independent scrolling preserves the surrounding structure." },
      ...(options.footer ? [{ id: `${side}.footer`, label: "Footer Actions", description: "Optional actions remain below the scrolling body." }] : []),
      { id: `${side}.collapse`, label: "Collapse / Reopen", description: "The edge control remains reachable when the pane is closed." },
    ]), { id: "centre", label: "Centre Workspace", description: "Uses the remaining width; overflows within the specimen when necessary." }];
}
export type PaneDemo = { leftCollapsed: boolean; rightCollapsed: boolean; query: string; selected: string; value: string; tab: string };
export function initialPaneDemo(tab = "First"): PaneDemo {
  return { leftCollapsed: false, rightCollapsed: false, query: "", selected: "", value: "Example", tab };
}
export function updatePaneDemo(state: PaneDemo, patch: Partial<PaneDemo>): PaneDemo { return { ...state, ...patch }; }
export function demoRows(mode: "normal" | "empty" | "long", names: readonly string[], query: string): string[] {
  const rows = mode === "empty" ? [] : mode === "long" ? Array.from({ length: 40 }, (_, i) => `${names[i % names.length]} ${i + 1}`) : [...names];
  return rows.filter((name) => name.toLowerCase().includes(query.toLowerCase()));
}
