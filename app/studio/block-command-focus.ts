/** Deferred focus must wait for the owning document's update to be accepted. */
export type BlockCommandFocusTarget = string | { blockId: string; listItemIndex?: number; offset?: number; isAccepted: () => boolean } | null;

export function blockCommandFocusId(target: BlockCommandFocusTarget): string | null {
  return typeof target === "string" ? target : target?.isAccepted() ? target.blockId : null;
}

/** Resolve inside the original owner and yield to any later user input. */
export function scheduleBlockCommandFocus(source: HTMLElement, target: BlockCommandFocusTarget, scope: ParentNode, focus: (editor: HTMLElement) => void): void {
  const document = source.ownerDocument;
  const owner = source.closest<HTMLElement>("[data-studio-document-id]");
  const ownerId = owner?.getAttribute("data-studio-document-id");
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  const focusChanged = (event: FocusEvent) => { if (event.target !== source) interrupted = true; };
  document.addEventListener("pointerdown", interrupt, true);
  document.addEventListener("keydown", interrupt, true);
  document.addEventListener("focusin", focusChanged, true);
  requestAnimationFrame(() => {
    document.removeEventListener("pointerdown", interrupt, true);
    document.removeEventListener("keydown", interrupt, true);
    document.removeEventListener("focusin", focusChanged, true);
    if (interrupted || (owner && (!owner.isConnected || owner.getAttribute("data-studio-document-id") !== ownerId))) return;
    const id = blockCommandFocusId(target);
    if (!id) return;
    const itemIndex = typeof target === "string" ? undefined : target?.listItemIndex;
    const candidates = (owner ?? scope).querySelectorAll<HTMLElement>(".rich-text-editor");
    const editor = [...candidates].find(candidate => candidate.isConnected
      && (typeof target === "string" || (candidate.classList.contains("list-item-editor")
        ? itemIndex !== undefined && candidate.dataset.listItemIndex === String(itemIndex)
        : itemIndex === undefined))
      && (candidate.dataset.studioBlockId === id || candidate.dataset.blockId === id));
    if (editor) focus(editor);
  });
}
