import { blockLibraryEntries, type BlockLibraryEntry } from "../../blocks/library-catalogue";
import { previewBlockTargets, type PreviewBlockId } from "../../site-editor/blocks-preview-model";
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
