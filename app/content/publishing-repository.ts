import { publishDocumentLocally, unpublishDocumentLocally } from "./local-publishing";
import type { StudioDocument } from "../studio/editor-model";
import { loadTemplates } from "../studio/template-store";
import { resolveTemplate } from "../studio/template-model";

export interface PublishingRepository {
  publish(document: StudioDocument): void;
  unpublish(documentId: string): void;
}

export const browserPublishingRepository: PublishingRepository = {
  publish: document => publishDocumentLocally(document, () => resolveTemplate(loadTemplates(), document)),
  unpublish: unpublishDocumentLocally,
};
