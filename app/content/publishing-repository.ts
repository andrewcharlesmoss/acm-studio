import { publishDocumentLocally, unpublishDocumentLocally } from "./local-publishing";
import type { StudioDocument } from "../studio/editor-model";
import { loadTemplates } from "../studio/template-store";
import { resolveTemplate, type PublicationPresentation } from "../studio/template-model";

export interface PublishingRepository {
  publish(document: StudioDocument, presentation?: PublicationPresentation): void;
  unpublish(documentId: string): void;
}

export const browserPublishingRepository: PublishingRepository = {
  publish: (document, presentation) => publishDocumentLocally(document,
    presentation ? presentation.templateSnapshot : () => resolveTemplate(loadTemplates(), document),
    presentation?.fallbackHeader),
  unpublish: unpublishDocumentLocally,
};
