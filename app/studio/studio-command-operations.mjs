/** @typedef {import("../content/model").ContentBlock} ContentBlock */
/** @typedef {import("./editor-model").StudioDocument} StudioDocument */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {StudioDocument} document
 * @param {(blocks: ContentBlock[]) => ContentBlock[]} update
 * @returns {StudioDocument}
 */
export function updateDocumentBlocks(document, update) {
  return { ...document, blocks: update(document.blocks) };
}

function mapNestedBlocks(blocks, blockId, update, mode = "update") {
  return blocks.map((block) => {
    if (block.id === blockId) return mode === "remove" ? null : update(block);
    if (Array.isArray(block.children)) {
      const children = mapNestedBlocks(block.children, blockId, update, mode);
      if (children !== block.children) return { ...block, children: children.filter(Boolean) };
    }
    return block;
  }).filter(Boolean);
}

export function updateBlockById(document, blockId, update) {
  return { ...document, blocks: mapNestedBlocks(document.blocks, blockId, update) };
}

export function removeNestedBlockById(document, blockId) {
  return { ...document, blocks: mapNestedBlocks(document.blocks, blockId, (block) => block, "remove") };
}

export function findBlockById(blocks, blockId) {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    if (Array.isArray(block.children)) {
      const child = findBlockById(block.children, blockId);
      if (child) return child;
    }
  }
  return null;
}

export function duplicateNestedBlockById(document, blockId, createBlockId) {
  function duplicate(block) {
    const copy = { ...clone(block), id: createBlockId(block.type) };
    if (Array.isArray(copy.children)) copy.children = copy.children.map(duplicate);
    return copy;
  }
  function insert(blocks) {
    const next = [];
    for (const block of blocks) {
      next.push(block);
      if (block.id === blockId) next.push(duplicate(block));
      else if (Array.isArray(block.children)) next[next.length - 1] = { ...block, children: insert(block.children) };
    }
    return next;
  }
  return { ...document, blocks: insert(document.blocks) };
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
  function duplicate(block) {
    const copy = { ...clone(block), id: createBlockId(block.type) };
    if (Array.isArray(copy.children)) copy.children = copy.children.map(duplicate);
    return copy;
  }
  const copy = duplicate(source);
  return insertBlockAt(document, copy, blockIndex);
}

export function removeBlockById(document, blockId) {
  return { ...document, blocks: document.blocks.filter((block) => block.id !== blockId) };
}

export function duplicateDocumentWithIds(document, createDocumentId, createBlockId) {
  function duplicate(block) {
    const copy = { ...clone(block), id: createBlockId(block.type) };
    if (Array.isArray(copy.children)) copy.children = copy.children.map(duplicate);
    return copy;
  }
  return {
    ...clone(document),
    id: createDocumentId(document.kind),
    title: `${document.title} copy`,
    slug: `${document.slug}-copy`,
    status: "draft",
    publishAt: undefined,
    publishedAt: undefined,
    publishedSlug: undefined,
    updatedAt: new Date().toISOString(),
    blocks: document.blocks.map(duplicate),
  };
}

export function addDocumentToWorkspace(workspace, document) {
  return { ...workspace, activeDocumentId: document.id, documents: [...workspace.documents, document] };
}

export function deleteDocumentFromWorkspace(workspace, documentId) {
  const documents = workspace.documents.filter((document) => document.id !== documentId);
  if (!documents.length) return { ...workspace, documents, activeDocumentId: "" };
  if (workspace.activeDocumentId !== documentId) return { ...workspace, documents };
  const deletedIndex = workspace.documents.findIndex((document) => document.id === documentId);
  const fallback = documents[Math.min(deletedIndex, documents.length - 1)];
  return { ...workspace, documents, activeDocumentId: fallback?.id ?? workspace.activeDocumentId };
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
