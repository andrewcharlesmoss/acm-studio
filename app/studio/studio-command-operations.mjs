function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function updateDocumentBlocks(document, update) {
  return { ...document, blocks: update(document.blocks) };
}

export function insertBlockAt(document, block, afterIndex) {
  const blocks = [...document.blocks];
  const index = afterIndex === null ? blocks.length : afterIndex + 1;
  blocks.splice(index, 0, block);
  return { ...document, blocks };
}

export function moveBlockAt(document, from, to) {
  if (from === to || from < 0 || to < 0 || from >= document.blocks.length || to >= document.blocks.length) return document;
  const blocks = [...document.blocks];
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return { ...document, blocks };
}

export function duplicateBlockAt(document, blockIndex, createBlockId) {
  const source = document.blocks[blockIndex];
  if (!source) return document;
  const copy = { ...clone(source), id: createBlockId(source.type) };
  return insertBlockAt(document, copy, blockIndex);
}

export function removeBlockById(document, blockId) {
  return { ...document, blocks: document.blocks.filter((block) => block.id !== blockId) };
}

export function duplicateDocumentWithIds(document, createDocumentId, createBlockId) {
  return {
    ...clone(document),
    id: createDocumentId(document.kind),
    title: `${document.title} copy`,
    slug: `${document.slug}-copy`,
    status: "draft",
    publishedAt: undefined,
    publishedSlug: undefined,
    updatedAt: new Date().toISOString(),
    blocks: document.blocks.map((block) => ({ ...block, id: createBlockId(block.type) })),
  };
}

export function addDocumentToWorkspace(workspace, document) {
  return { ...workspace, activeDocumentId: document.id, documents: [...workspace.documents, document] };
}

export function deleteDocumentFromWorkspace(workspace, documentId) {
  const documents = workspace.documents.filter((document) => document.id !== documentId);
  return { ...workspace, documents, activeDocumentId: documents[0]?.id ?? workspace.activeDocumentId };
}

export function commitHistory(current, history, maxHistory = 60) {
  return {
    history: [...history.slice(-(maxHistory - 1)), clone(current)],
    future: [],
  };
}

export function undoHistory(current, history, future, maxHistory = 60) {
  const previous = history.at(-1);
  if (!previous) return null;
  return {
    workspace: previous,
    history: history.slice(0, -1),
    future: [clone(current), ...future].slice(0, maxHistory),
  };
}

export function redoHistory(current, history, future, maxHistory = 60) {
  const next = future[0];
  if (!next) return null;
  return {
    workspace: next,
    history: [...history, clone(current)].slice(-maxHistory),
    future: future.slice(1),
  };
}
