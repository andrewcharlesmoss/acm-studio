import { blockCatalogue, templateContentBlock } from "../editor-model";
import { blockCapabilityProfiles } from "./capability-profiles";

const nonInsertableEntries = [
  { type: "column", label: "Column", description: "Edit a nested Column within a Columns block.", group: "Design" },
  { type: "footnotes", label: "Footnotes", description: "Edit the notes and shared presentation for referenced footnotes.", group: "Text" },
  { type: "component", label: "Component", description: "Inspect an ACM component integration in its inactive library state.", group: "Other" },
  { ...templateContentBlock, description: "Project the current document body into a template." },
] as const;

const baseEntries = blockCatalogue.map(editorEntry => ({
  type: editorEntry.type,
  label: editorEntry.label,
  description: editorEntry.type === "paragraph" ? "Ordinary prose with inline formatting, Gutenberg-aligned settings and separate Studio additions." : editorEntry.description,
  group: editorEntry.group,
  href: editorEntry.type === "paragraph" ? "/studio/ui/blocks/paragraph" : `/studio/ui/blocks/${editorEntry.type}`,
  profile: blockCapabilityProfiles[editorEntry.type],
}));

export const blockLibraryEntries = [
  ...baseEntries,
  ...nonInsertableEntries.map(entry => ({
    ...entry,
    href: `/studio/ui/blocks/${entry.type}`,
    profile: blockCapabilityProfiles[entry.type],
  })),
];

export type BlockLibraryEntry = (typeof blockLibraryEntries)[number];
export const blockLibraryEntryByType = Object.fromEntries(blockLibraryEntries.map(entry => [entry.type, entry])) as Record<BlockLibraryEntry["type"], BlockLibraryEntry>;
