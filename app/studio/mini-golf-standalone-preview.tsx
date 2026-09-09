"use client";

import { Fragment, useMemo, useSyncExternalStore } from "react";
import { BlockRenderer } from "../components/content";
import { initialMiniGolfDraft, initialMiniGolfStagingDraft, createMiniGolfDraftRepository, MINI_GOLF_DRAFT_KEY } from "./mini-golf-draft";
import { MiniGolfRuntimeProvider } from "./mini-golf-runtime";
import { miniGolfPresentation } from "./mini-golf-presentation";
import type { MiniGolfSite } from "./site-registry";

function readPreviewDraft(repository: ReturnType<typeof createMiniGolfDraftRepository>, initialDraft: typeof initialMiniGolfDraft) {
  if (typeof window === "undefined") return { workspace: initialDraft, error: false };
  try {
    return { workspace: repository.load() ?? initialDraft, error: false };
  } catch {
    return { workspace: initialDraft, error: true };
  }
}

const initialPreviewState = { workspace: initialMiniGolfDraft, error: false };
const initialStagingPreviewState = { workspace: initialMiniGolfStagingDraft, error: false };
const subscribeToPreview = () => () => undefined;

export function MiniGolfStandalonePreview({ site }: { site: MiniGolfSite }) {
  const storageKey = site.environment === "staging" ? "acm-studio-site-mini-golf-scorecard-staging-page-v1" : MINI_GOLF_DRAFT_KEY;
  const repository = useMemo(() => createMiniGolfDraftRepository(storageKey), [storageKey]);
  const initialState = site.environment === "staging" ? initialStagingPreviewState : initialPreviewState;
  const clientState = useMemo(() => readPreviewDraft(repository, initialState.workspace), [repository, initialState]);
  const { workspace, error } = useSyncExternalStore(subscribeToPreview, () => clientState, () => initialState);

  const document = workspace.documents[0];
  const context = {
    document,
    mode: "preview" as const,
    selectedBlockId: null,
    onSelectBlock: undefined,
    onUpdateBlock: undefined,
    onDocumentFieldChange: () => undefined,
    onFocusDocumentField: () => undefined,
  };

  const lastBlock = document.blocks.at(-1);
  const trailingFooter = lastBlock?.type === "section" && lastBlock.role === "footer" ? lastBlock : undefined;
  const mainBlocks = trailingFooter ? document.blocks.slice(0, -1) : document.blocks;
  return <MiniGolfRuntimeProvider blocks={document.blocks} identity={`${site.id}:${document.id}`}><div className="mini-golf-standalone-page">
    <main className="shell mini-golf-standalone">
      {error ? <p className="mini-golf-preview-warning" role="alert">The saved draft could not be read. Showing the source reference.</p> : null}
      {miniGolfPresentation.renderHeader?.(context)}
      {mainBlocks.map((block) => <Fragment key={block.id}>{miniGolfPresentation.renderBlock?.({ ...context, block }) ?? <BlockRenderer blocks={[block]} variant="studio" hideDividers />}</Fragment>)}
    </main>
    {trailingFooter ? miniGolfPresentation.renderBlock?.({ ...context, block: trailingFooter }) : null}
  </div></MiniGolfRuntimeProvider>;
}
