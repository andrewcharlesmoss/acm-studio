import type { StudioDocument } from "../../editor-model";
import { templateEditorBlocks, type NavigationItem, type NavigationTemplateNode } from "../../template-model";
import { rebaseWebsiteDesignEdit } from "../../site-editor/website-design-edit";
import type { ContentBlock } from "../../../content/model";
import { projectWebsiteDesignBlocks } from "../../site-editor/website-design-surface";
import { blockLibraryEntries, type BlockLibraryEntry } from "../../blocks/library-catalogue";
import { previewBlockTargets, previewBlockInspectorStyle, resolvePreviewBlockVariant, referencePreviewBlockStyles, type PreviewBlockId } from "../../site-editor/blocks-preview-model";
import type { StyleSelection } from "../../site-editor/styles-preview-state";
import type { StyleViewport } from "../../../content/responsive-styles";
import { blockStyleProfiles } from "../../site-editor/block-style-profiles";

export type EditorBlockType = BlockLibraryEntry["type"];
export type BlockContext = "block-editor" | "site-editor-styles";
const styleAliases: Partial<Record<EditorBlockType, PreviewBlockId>> = {
  title: "document-title", subtitle: "document-subtitle", "author-name": "post-author",
  "time-to-read": "reading-time", separator: "divider", "template-content": "content",
};
export function siteStyleTarget(type: string): PreviewBlockId | undefined {
  const target = styleAliases[type as EditorBlockType] ?? type;
  return previewBlockTargets.some(item => item.id === target) && Object.hasOwn(blockStyleProfiles, target) ? target as PreviewBlockId : undefined;
}
export type BlockContextEntry = { type: string; label: string; description: string; group: string; href: string; editorType?: EditorBlockType; styleTarget?: PreviewBlockId; profile?: BlockLibraryEntry["profile"] };
const editorEntries: BlockContextEntry[] = blockLibraryEntries.map(entry => ({ ...entry, editorType: entry.type, styleTarget: siteStyleTarget(entry.type) }));
const mappedTargets = new Set(editorEntries.map(entry => entry.styleTarget));
export const blockContextEntries: BlockContextEntry[] = [...editorEntries, ...previewBlockTargets.filter(target => !("hiddenFromStyles" in target && target.hiddenFromStyles) && !mappedTargets.has(target.id) && Object.hasOwn(blockStyleProfiles, target.id)).map(target => ({
  type: target.id, label: target.label, description: `Explore ${target.label} website block styles.`, group: "Site editor styles", href: `/studio/ui/blocks/${target.id}`, styleTarget: target.id,
}))];
export const blockContextEntryByType: Record<string, BlockContextEntry> = Object.fromEntries(blockContextEntries.map(entry => [entry.type, entry]));
export function blockContexts(entry: BlockContextEntry): BlockContext[] {
  return [...(entry.editorType ? ["block-editor" as const] : []), ...(entry.styleTarget ? ["site-editor-styles" as const] : [])];
}
export type BlockContextState = { active: BlockContext; visited: BlockContext[] };
export function initialBlockContext(contexts: BlockContext[]): BlockContextState {
  return { active: contexts[0], visited: [contexts[0]] };
}
export function activateBlockContext(state: BlockContextState, context: BlockContext, supported: BlockContext[]): BlockContextState {
  if (!supported.includes(context)) return state;
  return { active: context, visited: state.visited.includes(context) ? state.visited : [...state.visited, context] };
}

/** Temporary canvas projection; stored website styles and authored blocks stay independent. */
export function blockContextCanvasStyles(selection: StyleSelection, target: PreviewBlockId | undefined, variation: string | undefined, viewport: StyleViewport, state: "default" | "hover" | "focus" | "focus-visible" | "active" = "default"): StyleSelection {
  const defaults = referencePreviewBlockStyles(selection.blockStyles);
  const targets = target ? { ...defaults, [target]: defaults[target] ?? {} } : defaults;
  return { ...selection, blockStyles: Object.fromEntries(Object.entries(targets).map(([id, style]) => [id, previewBlockInspectorStyle(resolvePreviewBlockVariant(style, id === target ? variation : undefined), viewport, id === target ? state : "default")])) };
}

/** Navigation's template editor needs the same render projection as ordinary BlockField. */
export function projectLibraryNavigationBlock(block: ContentBlock, selection: StyleSelection): ContentBlock {
  const projected = projectWebsiteDesignBlocks([block], selection)[0];
  const classes = new Set((projected.visualStyle?.className ?? "").split(/\s+/).filter(Boolean));
  classes.add("site-block-style-navigation");
  return { ...projected, visualStyle: { ...projected.visualStyle, className: [...classes].join(" ") } };
}

export type LibraryNavigationSnapshot = { blocks: ContentBlock[]; document: StudioDocument; navigation?: NavigationItem[] };
export type LibraryNavigationProjection = { canonical: ContentBlock; projected: ContentBlock };
/** Commit generated links and the source node together, excluding inherited presentation. */
export function convertLibraryNavigationPageList(source: LibraryNavigationSnapshot, navigation: NavigationItem[], node: NavigationTemplateNode, projection?: LibraryNavigationProjection): LibraryNavigationSnapshot | null {
  const edited = templateEditorBlocks([node])[0];
  const canonical = source.blocks.find(block => block.id === edited.id);
  if (edited.type !== "group" || !canonical) return null;
  if (projection && (projection.canonical.id !== canonical.id || JSON.stringify(projection.canonical) !== JSON.stringify(canonical))) return null;
  const next = projection ? rebaseWebsiteDesignEdit(canonical, projection.projected, edited) : edited;
  const blocks = source.blocks.map(block => block.id === next.id ? next : block);
  return { ...source, navigation, blocks, document: { ...source.document, blocks } };
}
