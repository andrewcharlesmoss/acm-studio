import type { ContentBlock } from "../../../content/model";
import { availableBlockTransforms } from "../../block-transforms";
import { paragraphInspectorProfile } from "../capability-profiles";

export { paragraphInspectorProfile };

export const paragraphBlockDefinition = {
  type: "paragraph" as const,
  label: "Paragraph",
  description: paragraphInspectorProfile.description ?? "Start with the basic building block of all narrative.",
  libraryHref: "/studio/ui/blocks/paragraph",
  librarySummary: "Ordinary prose with inline formatting, Gutenberg-aligned settings and separate Studio additions.",
  create: (id: string): Extract<ContentBlock, { type: "paragraph" }> => ({ id, type: "paragraph", text: "Start writing here." }),
  inspector: {
    ...paragraphInspectorProfile,
    transforms: availableBlockTransforms({ id: "paragraph-library", type: "paragraph", text: "" } as ContentBlock).map(transform => ({ type: transform.target, label: transform.label })),
  },
} as const;
