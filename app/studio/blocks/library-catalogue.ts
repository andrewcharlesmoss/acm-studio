import { storedBlockType } from "./group-variations";
import { blockCatalogue, templateContentBlock, templateNavigationBlock, templatePageLinkBlock, templateNavigationPageListBlock, templateSiteTitleBlock } from "../editor-model";
import { blockToolbarDefinitionFor } from "./toolbar-registry";
import { blockCapabilityProfiles, navigationCapabilityProfile } from "./capability-profiles";

const nonInsertableEntries = [
  { type: "column", label: "Column", description: "Edit a nested Column within a Columns block.", group: "Design" },
  { type: "footnotes", label: "Footnotes", description: "Edit the notes and shared presentation for referenced footnotes.", group: "Text" },
  { ...templateContentBlock, description: "Project the current document body into a template." },
  templateNavigationBlock,
  templateNavigationPageListBlock,
  templateSiteTitleBlock,
  templatePageLinkBlock,
] as const;

const baseEntries = blockCatalogue.map(editorEntry => ({
  type: editorEntry.type,
  label: editorEntry.label,
  description: editorEntry.type === "paragraph" ? "Ordinary prose with inline formatting and Gutenberg-focused block settings." : editorEntry.description,
  group: editorEntry.group,
  href: editorEntry.type === "paragraph" ? "/studio/ui/blocks/paragraph" : `/studio/ui/blocks/${editorEntry.type}`,
  profile: blockCapabilityProfiles[storedBlockType(editorEntry.type) as keyof typeof blockCapabilityProfiles],
}));

export const blockLibraryEntries = [
  ...baseEntries,
  ...nonInsertableEntries.map(entry => ({
    ...entry,
    href: `/studio/ui/blocks/${entry.type}`,
    profile: entry.type === "navigation" ? navigationCapabilityProfile : entry.type === "site-title" ? { ...blockCapabilityProfiles.paragraph, label: "Site Title", mapping: "core/site-title (typed template element)", toolbar: blockToolbarDefinitionFor("site-title") } : blockCapabilityProfiles[entry.type],
  })),
];

export type BlockLibraryEntry = (typeof blockLibraryEntries)[number];
export const blockLibraryEntryByType = Object.fromEntries(blockLibraryEntries.map(entry => [entry.type, entry])) as Record<BlockLibraryEntry["type"], BlockLibraryEntry>;
