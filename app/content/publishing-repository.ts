import { publishDocumentLocally, unpublishDocumentLocally } from "./local-publishing";
import type { StudioDocument } from "../studio/editor-model";

export interface PublishingRepository {
  publish(document: StudioDocument): void;
  unpublish(documentId: string): void;
}

export const browserPublishingRepository: PublishingRepository = {
  publish: publishDocumentLocally,
  unpublish: unpublishDocumentLocally,
};
