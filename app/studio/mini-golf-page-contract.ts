import type { ContentBlock } from "../content/model";
import { isRecord, validContentBlocks } from "./workspace-validation";

/** Portable authored page data, independent of React and guest game sessions. */
export type MiniGolfPageDefinition = {
  format: "mini-golf-page-definition";
  version: 1;
  pageId: string;
  instanceId: string;
  source: { revision: string; fileHashes: Record<string, string> };
  blocks: ContentBlock[];
  defaults: { holes?: string; players?: string; tableSize?: string };
  leaderboardTemplates: { sectionId: string; templateId: string | null }[];
};

type Identity = Pick<MiniGolfPageDefinition, "pageId" | "instanceId" | "source">;

/** Sorted object keys make comparisons independent of property insertion order. */
export function canonicalMiniGolfJson(value: unknown): string {
  const seen = new Set<object>();
  function normalise(item: unknown, path: string): unknown {
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object" || item === undefined) throw new Error(`Unsupported non-JSON value at ${path}.`);
    if (seen.has(item)) throw new Error(`Circular page data at ${path}.`);
    seen.add(item);
    let result: unknown;
    if (Array.isArray(item)) result = Array.from({ length: item.length }, (_, index) => {
      if (!Object.prototype.hasOwnProperty.call(item, index)) throw new Error(`Unsupported sparse array at ${path}[${index}].`);
      return normalise(item[index], `${path}[${index}]`);
    });
    else {
      if (Object.prototype.toString.call(item) !== "[object Object]") throw new Error(`Unsupported object at ${path}.`);
      result = Object.fromEntries(Object.keys(item).sort().flatMap(key => {
        const child = (item as Record<string, unknown>)[key];
        // Optional typed fields are omitted by JSON, but array holes are errors.
        return child === undefined ? [] : [[key, normalise(child, `${path}.${key}`)]];
      }));
    }
    seen.delete(item);
    return result;
  }
  return JSON.stringify(normalise(value, "$"));
}

function descriptors(blocks: ContentBlock[]) {
  const defaults: MiniGolfPageDefinition["defaults"] = {};
  const leaderboardTemplates: MiniGolfPageDefinition["leaderboardTemplates"] = [];
  function visit(items: ContentBlock[]) {
    for (const block of items) {
      if (block.type === "field") {
        if (block.siteRole === "holes" && defaults.holes === undefined) defaults.holes = block.value;
        if (block.siteRole === "players" && defaults.players === undefined) defaults.players = block.value;
        if (block.siteRole === "table-size" && defaults.tableSize === undefined) defaults.tableSize = block.value;
      }
      if (block.type === "section" && block.role === "leaderboard") leaderboardTemplates.push({ sectionId: block.id, templateId: block.children.find(child => child.type === "section" && child.role === "leaderboard-card")?.id ?? null });
      if ("children" in block && block.children) visit(block.children);
    }
  }
  visit(blocks);
  return { defaults, leaderboardTemplates };
}

function validIdentity(value: unknown): value is Identity {
  return isRecord(value) && typeof value.pageId === "string" && value.pageId.length > 0 && typeof value.instanceId === "string" && value.instanceId.length > 0
    && isRecord(value.source) && typeof value.source.revision === "string" && value.source.revision.length > 0 && isRecord(value.source.fileHashes)
    && Object.values(value.source.fileHashes).every(hash => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash));
}

export function blocksToMiniGolfPageDefinition(blocks: ContentBlock[], identity: Identity): MiniGolfPageDefinition {
  // Check serialisability before cloning so unsupported values never disappear.
  const copy: unknown = JSON.parse(canonicalMiniGolfJson(blocks));
  if (!validContentBlocks(copy)) throw new Error("Unsupported Mini Golf block structure, duplicate identity or invalid block data. The page has not been converted.");
  if (!validIdentity(identity)) throw new Error("Invalid Mini Golf page, instance or source identity.");
  return JSON.parse(canonicalMiniGolfJson({ format: "mini-golf-page-definition", version: 1, pageId: identity.pageId, instanceId: identity.instanceId, source: identity.source, blocks: copy, ...descriptors(copy) })) as MiniGolfPageDefinition;
}

export function parseMiniGolfPageDefinition(value: unknown): MiniGolfPageDefinition {
  if (!isRecord(value) || value.format !== "mini-golf-page-definition" || value.version !== 1 || !validIdentity(value)) throw new Error("Unsupported Mini Golf page definition or version.");
  const keys = ["format", "version", "pageId", "instanceId", "source", "blocks", "defaults", "leaderboardTemplates"];
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error("Unsupported page-definition fields. No data has been discarded.");
  const payload = value as Identity & Record<string, unknown>;
  const definition = blocksToMiniGolfPageDefinition(payload.blocks as ContentBlock[], value);
  if (canonicalMiniGolfJson(payload.defaults) !== canonicalMiniGolfJson(definition.defaults) || canonicalMiniGolfJson(payload.leaderboardTemplates) !== canonicalMiniGolfJson(definition.leaderboardTemplates)) throw new Error("Page defaults or leaderboard templates disagree with the authored blocks.");
  return definition;
}

export function miniGolfPageDefinitionToBlocks(value: unknown): ContentBlock[] {
  return parseMiniGolfPageDefinition(value).blocks;
}

export function equalMiniGolfPageDefinitions(first: MiniGolfPageDefinition, second: MiniGolfPageDefinition): boolean {
  return canonicalMiniGolfJson(parseMiniGolfPageDefinition(first)) === canonicalMiniGolfJson(parseMiniGolfPageDefinition(second));
}

export type MiniGolfPageMerge =
  | { status: "unchanged" | "source-only" | "blocks-only" | "converged"; definition: MiniGolfPageDefinition }
  | { status: "conflict"; baseline: MiniGolfPageDefinition; source: MiniGolfPageDefinition; draft: MiniGolfPageDefinition };

/** A conflict is a review result, never permission to write either repository. */
export function compareMiniGolfPageChanges(baselineInput: MiniGolfPageDefinition, sourceInput: MiniGolfPageDefinition, draftInput: MiniGolfPageDefinition): MiniGolfPageMerge {
  const [baseline, source, draft] = [baselineInput, sourceInput, draftInput].map(parseMiniGolfPageDefinition);
  if ([source, draft].some(page => page.pageId !== baseline.pageId || page.instanceId !== baseline.instanceId)) throw new Error("Cannot compare different Mini Golf pages or instances.");
  const content = (page: MiniGolfPageDefinition) => canonicalMiniGolfJson(page.blocks);
  const sourceChanged = !equalMiniGolfPageDefinitions(baseline, source);
  const draftChanged = content(baseline) !== content(draft);
  if (!sourceChanged && !draftChanged) return { status: "unchanged", definition: baseline };
  if (!sourceChanged) return { status: "blocks-only", definition: blocksToMiniGolfPageDefinition(draft.blocks, baseline) };
  if (!draftChanged) return { status: "source-only", definition: source };
  if (content(source) === content(draft)) return { status: "converged", definition: blocksToMiniGolfPageDefinition(draft.blocks, source) };
  return { status: "conflict", baseline, source, draft };
}
