import type { ContentBlock, SiteComponentData, SiteComponentName } from "../content/model";
import { completeMiniGolfPage, applyMiniGolfSourceContract, bindMiniGolfRuntime } from "./mini-golf-page-blocks";
import type { StudioWorkspace } from "./editor-model";
import { isRecord, validateStudioWorkspace } from "./workspace-validation";
import type { WorkspaceRepository } from "./workspace-repository";
import { studioWriteOwnership } from "./write-ownership";

export const MINI_GOLF_STAGING_DRAFT_KEY = "acm-studio-site-mini-golf-scorecard-staging-page-v1";
export const MINI_GOLF_DRAFT_KEY = "acm-studio-site-mini-golf-scorecard-page-v1";
export const miniGolfSections = ["account", "setup", "scorecard", "leaderboard", "share"] as const;
export type MiniGolfSection = typeof miniGolfSections[number];
export const sectionLabels: Record<MiniGolfSection, string> = {
  account: "ACM Account", setup: "Game setup", scorecard: "Scorecard", leaderboard: "Leaderboard", share: "Share results",
};
const isMiniGolfSectionRole = (value: unknown): value is MiniGolfSection => typeof value === "string" && (miniGolfSections as readonly string[]).includes(value);
const MINI_GOLF_SOURCE_REVISION = "0d2df8bd31f277df31522aa47ca6bf785888c460";
const source = (module: string, exportName: string) => ({ module, exportName, revision: MINI_GOLF_SOURCE_REVISION });
const componentSource = (section: MiniGolfSection) => source(section === "account" ? "mini-golf-scorecard/app/page" : `mini-golf-scorecard/app/components/${section === "scorecard" ? "score-table" : section === "setup" ? "game-setup" : section === "share" ? "share-actions" : section}`, section === "scorecard" ? "ScoreTable" : section === "setup" ? "GameSetup" : section === "leaderboard" ? "Leaderboard" : section === "share" ? "ShareActions" : "Home");
const sectionBlock = (section: MiniGolfSection, children: ContentBlock[], data: SiteComponentData = {}, id: string = section, sourceRef = componentSource(section)) => ({
  id,
  type: "section" as const,
  role: section,
  layout: "stack" as const,
  data,
  source: sourceRef,
  children,
});
export const initialMiniGolfBlocks: ContentBlock[] = [
  sectionBlock("account", [
    { id: "account-status", type: "paragraph", text: "Playing as a guest" },
    { id: "account-action", type: "button", label: "Sign in with ACM Account", url: "#", style: "primary" },
  ], { ariaLabel: "ACM Account", status: "Playing as a guest", action: "Sign in with ACM Account" }),
  sectionBlock("setup", [
    { id: "setup-holes", type: "field", control: "select", label: "Course holes", value: "9 Holes", options: ["1 Hole", ...Array.from({ length: 17 }, (_, index) => `${index + 2} Holes`)] },
    { id: "setup-players", type: "field", control: "select", label: "Players", value: "2 Players", options: ["1 Player", ...Array.from({ length: 7 }, (_, index) => `${index + 2} Players`)] },
    { id: "setup-reset", type: "button", label: "Reset Scores", url: "#", style: "secondary" },
    { id: "setup-new-game", type: "button", label: "New Game", url: "#", style: "secondary" },
  ], { holes: 9, players: 2 }),
  sectionBlock("scorecard", [
    { id: "scorecard-heading", type: "heading", level: 2, text: "Enter your scores" },
    { id: "scorecard-table", type: "table", hasHeader: true, hasFooter: true, columnWidths: [16, 28, 28, 28], rows: [["Hole", "Player 1", "Player 2", "Total"], ...Array.from({ length: 9 }, (_, index) => [`${index + 1}`, "", "", "—"]), ["Total", "—", "—", "—"]] },
  ], { holes: 9, player1: "Player 1", player2: "Player 2" }),
  sectionBlock("leaderboard", [
    { id: "leaderboard-heading", type: "heading", level: 2, text: "Leaderboard" },
    { id: "leaderboard-player-1", type: "paragraph", text: "Player 1 · — strokes · Average — · Std deviation — · Holes played 0 / 9" },
    { id: "leaderboard-player-2", type: "paragraph", text: "Player 2 · — strokes · Average — · Std deviation — · Holes played 0 / 9" },
  ], { player1: "Player 1", player2: "Player 2" }),
  sectionBlock("share", [
    { id: "share-heading", type: "heading", level: 2, text: "Ready to share?" },
    { id: "share-excel", type: "button", label: "↓ Download For Excel", url: "#", style: "primary" },
    { id: "share-image", type: "button", label: "▣ Copy Screenshot", url: "#", style: "secondary" },
    { id: "share-html", type: "button", label: "▣ Copy As HTML", url: "#", style: "secondary" },
  ], {}),
];

function migrateLegacyBlocks(blocks: ContentBlock[]) {
  if (!blocks.some((block) => block.type !== "component" && (["account", "setup", "scorecard", "leaderboard", "share"].includes(block.id) || /^(setup|scorecard|leaderboard|share)-/.test(block.id)))) return blocks;
  const known = new Map<string, ContentBlock>();
  for (const block of blocks) if (["account", ...miniGolfSections].includes(block.id)) known.set(block.id, block);
  if (!known.size) return blocks;
  const result: ContentBlock[] = [];
  const emitted = new Set<string>();
  const consumed = new Set<string>();
  for (const block of blocks) {
    const section = block.id as MiniGolfSection;
    if (consumed.has(block.id)) continue;
    const sectionFromPrefix = miniGolfSections.find((candidate) => block.id.startsWith(`${candidate}-`));
    const resolvedSection = miniGolfSections.includes(section) ? section : sectionFromPrefix;
    if (!resolvedSection || emitted.has(resolvedSection)) { result.push(block); continue; }
    const sectionName = resolvedSection;
    emitted.add(sectionName);
    const companionIds: Record<string, string[]> = { setup: ["setup-details"], scorecard: ["scorecard-table"], leaderboard: ["leaderboard-summary"], share: ["share-actions"], account: [] };
    const related = blocks.filter((candidate) => candidate.id === sectionName || companionIds[sectionName]?.includes(candidate.id));
    if (block.type === "component") { result.push(block); related.forEach((candidate) => consumed.add(candidate.id)); continue; }
    const heading = related.find((candidate) => candidate.type === "heading");
    const paragraph = related.find((candidate) => candidate.type === "paragraph");
    const table = related.find((candidate) => candidate.type === "table");
    const list = related.find((candidate) => candidate.type === "list");
    related.forEach((candidate) => consumed.add(candidate.id));
    const data: Record<string, string | number | boolean | string[]> = {};
    data.legacy = JSON.stringify(related);
    if (heading && (heading.type === "heading" || heading.type === "paragraph")) data.heading = heading.text;
    if (paragraph?.type === "paragraph") data.details = paragraph.text;
    if (table?.type === "table") data.rows = table.rows.flat();
    if (list?.type === "list") data.items = list.items;
    const children = sectionName === "scorecard"
      ? [
          heading ? { ...heading, id: `${sectionName}-heading` } : undefined,
          table ? { ...table, id: `${sectionName}-table` } : undefined,
        ].filter((child): child is NonNullable<typeof child> => Boolean(child))
      : table ? [{ ...table, id: `${sectionName}-table` }] : undefined;
    result.push({ id: sectionName, type: "component", component: `mini-golf-${sectionName}` as SiteComponentName, data, source: componentSource(sectionName), children });
  }
  return result;
}

function legacyTableChild(block: Extract<ContentBlock, { type: "component" }>): Extract<ContentBlock, { type: "table" }> | undefined {
  const legacy = block.data?.legacy;
  if (typeof legacy !== "string") return undefined;
  try {
    const records: unknown = JSON.parse(legacy);
    if (!Array.isArray(records)) return undefined;
    const table = records.find((item): item is Extract<ContentBlock, { type: "table" }> => {
      if (!item || typeof item !== "object" || (item as { type?: unknown }).type !== "table") return false;
      const rows = (item as { rows?: unknown }).rows;
      return Array.isArray(rows) && rows.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"));
    });
    return table ? { ...table, id: `${block.id}-table` } : undefined;
  } catch { return undefined; }
}

function defaultScorecardTable(block: Extract<ContentBlock, { type: "component" }>): Extract<ContentBlock, { type: "table" }> {
  const holes = typeof block.data?.holes === "number" && Number.isInteger(block.data.holes) && block.data.holes >= 1 && block.data.holes <= 18 ? block.data.holes : 9;
  const player1 = typeof block.data?.player1 === "string" ? block.data.player1 : "Player 1";
  const player2 = typeof block.data?.player2 === "string" ? block.data.player2 : "Player 2";
  return { id: `${block.id}-table`, type: "table", hasHeader: true, hasFooter: true, columnWidths: [16, 28, 28, 28], rows: [["Hole", player1, player2, "Total"], ...Array.from({ length: holes }, (_, index) => [`${index + 1}`, "", "", "—"]), ["Total", "—", "—", "—"]] };
}

function attachSourceMetadata(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type === "group") return { ...block, children: attachSourceMetadata(block.children) };
    if (block.type !== "component") return block;
    const existingChildren = block.children ? attachSourceMetadata(block.children) : undefined;
    const migratedTable = block.component === "mini-golf-scorecard" ? legacyTableChild(block) ?? defaultScorecardTable(block) : undefined;
    const children: ContentBlock[] | undefined = block.children ? existingChildren : migratedTable ? [migratedTable] : undefined;
    if (block.component === "mini-golf-scorecard") {
      const headingText = typeof block.data?.heading === "string" ? block.data.heading : "Enter your scores";
      const heading = existingChildren?.find((child) => child.type === "heading") ?? { id: `${block.id}-heading`, type: "heading" as const, level: 2 as const, text: headingText };
      const nestedChildren = block.children === undefined
        ? [heading, ...(children ?? []).filter((child) => child.type === "table")]
        : (existingChildren ?? []);
      return { id: block.id, type: "group" as const, layout: "stack" as const, data: block.data, source: block.source ?? componentSource("scorecard"), children: nestedChildren };
    }
    return { ...block, source: block.source ?? componentSource(block.component.replace("mini-golf-", "") as MiniGolfSection), children };
  });
}

/** Convert the interim opaque component draft to the public section/block tree. */
function convertComponentSections(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type === "section") return { ...block, children: convertComponentSections(block.children) };
    if (block.type === "group") {
      const children = convertComponentSections(block.children);
      return block.id === "scorecard"
        ? sectionBlock("scorecard", children, block.data, block.id, block.source ?? componentSource("scorecard"))
        : { ...block, children };
    }
    if (block.type !== "component" || !block.component.startsWith("mini-golf-")) return block;
    const role = block.component.replace("mini-golf-", "") as MiniGolfSection;
    const data = block.data ?? {};
    const hasAuthoredChildren = block.children !== undefined;
    const children = hasAuthoredChildren ? convertComponentSections(block.children ?? []) : [];
    if (role === "scorecard") {
      if (hasAuthoredChildren) return sectionBlock("scorecard", children, data, block.id, block.source ?? componentSource("scorecard"));
      const heading = children.find((child) => child.type === "heading") ?? { id: `${block.id}-heading`, type: "heading" as const, level: 2 as const, text: typeof data.heading === "string" ? data.heading : "Enter your scores" };
      const table = children.find((child) => child.type === "table") ?? defaultScorecardTable(block);
      const preservedChildren = children.filter((child) => child.id !== heading.id && child.id !== table.id);
      return sectionBlock("scorecard", [heading, table, ...preservedChildren], data, block.id, block.source ?? componentSource("scorecard"));
    }
    if (role === "account") return sectionBlock("account", hasAuthoredChildren ? children : [
      { id: `${block.id}-status`, type: "paragraph", text: typeof data.status === "string" ? data.status : "Playing as a guest" },
      { id: `${block.id}-action`, type: "button", label: typeof data.action === "string" ? data.action : "Sign in with ACM Account", url: "#", style: "primary" },
    ], data, block.id, block.source ?? componentSource("account"));
    if (role === "setup") return sectionBlock("setup", hasAuthoredChildren ? children : [
      { id: `${block.id}-holes`, type: "field", control: "select", label: "Course holes", value: `${typeof data.holes === "number" ? data.holes : 9} Holes`, options: ["1 Hole", ...Array.from({ length: 17 }, (_, index) => `${index + 2} Holes`)] },
      { id: `${block.id}-players`, type: "field", control: "select", label: "Players", value: `${typeof data.players === "number" ? data.players : 2} Players`, options: ["1 Player", ...Array.from({ length: 7 }, (_, index) => `${index + 2} Players`)] },
      { id: `${block.id}-reset`, type: "button", label: "Reset Scores", url: "#", style: "secondary" },
      { id: `${block.id}-new-game`, type: "button", label: "New Game", url: "#", style: "secondary" },
    ], data, block.id, block.source ?? componentSource("setup"));
    if (role === "leaderboard") return sectionBlock("leaderboard", hasAuthoredChildren ? children : [
      { id: `${block.id}-heading`, type: "heading", level: 2, text: "Leaderboard" },
      { id: `${block.id}-player-1`, type: "paragraph", text: `${typeof data.player1 === "string" ? data.player1 : "Player 1"} · — strokes · Average — · Std deviation — · Holes played 0 / 9` },
      { id: `${block.id}-player-2`, type: "paragraph", text: `${typeof data.player2 === "string" ? data.player2 : "Player 2"} · — strokes · Average — · Std deviation — · Holes played 0 / 9` },
    ], data, block.id, block.source ?? componentSource("leaderboard"));
    return sectionBlock("share", hasAuthoredChildren ? children : [
      { id: `${block.id}-heading`, type: "heading", level: 2, text: typeof data.heading === "string" ? data.heading : "Ready to share?" },
      { id: `${block.id}-excel`, type: "button", label: "↓ Download For Excel", url: "#", style: "primary" },
      { id: `${block.id}-image`, type: "button", label: "▣ Copy Screenshot", url: "#", style: "secondary" },
      { id: `${block.id}-html`, type: "button", label: "▣ Copy As HTML", url: "#", style: "secondary" },
    ], data, block.id, block.source ?? componentSource("share"));
  });
}

/**
 * Complete the transitional component payloads written by the first Sites
 * pilot. Those payloads sometimes contained only an action or a legacy
 * summary, so they could never reproduce the source page on reload. This is
 * intentionally limited to component drafts; a typed section tree is left
 * untouched so deliberate deletions remain deletions.
 */
function hydrateTransitionalSections(blocks: ContentBlock[], transitionalIds: Set<string>): ContentBlock[] {
  const hydrated = blocks.map((block) => {
    if (block.type !== "section" || !transitionalIds.has(block.id) || !isMiniGolfSectionRole(block.role)) return block;
    const children = [...block.children];
    if (block.role === "account") {
      if (!children.some((child) => child.type === "paragraph")) children.unshift({ id: `${block.id}-status`, type: "paragraph", text: typeof block.data?.status === "string" ? block.data.status : "Playing as a guest" });
      if (!children.some((child) => child.type === "button")) children.push({ id: `${block.id}-action`, type: "button", label: typeof block.data?.action === "string" ? block.data.action : "Sign in with ACM Account", url: "#", style: "primary" });
    }
    if (block.role === "setup") {
      if (!children.some((child) => child.type === "field" && child.id.endsWith("-holes"))) children.unshift({ id: `${block.id}-holes`, type: "field", control: "select", label: "Course holes", value: `${typeof block.data?.holes === "number" ? block.data.holes : 9} Holes`, options: ["1 Hole", ...Array.from({ length: 17 }, (_, index) => `${index + 2} Holes`)] });
      if (!children.some((child) => child.type === "field" && child.id.endsWith("-players"))) children.splice(1, 0, { id: `${block.id}-players`, type: "field", control: "select", label: "Players", value: `${typeof block.data?.players === "number" ? block.data.players : 2} Players`, options: ["1 Player", ...Array.from({ length: 7 }, (_, index) => `${index + 2} Players`)] });
      if (!children.some((child) => child.type === "button" && /reset/i.test(child.label))) children.push({ id: `${block.id}-reset`, type: "button", label: "Reset Scores", url: "#", style: "secondary" });
      if (!children.some((child) => child.type === "button" && /new game/i.test(child.label))) children.push({ id: `${block.id}-new-game`, type: "button", label: "New Game", url: "#", style: "secondary" });
    }
    if (block.role === "scorecard") {
      if (!children.some((child) => child.type === "heading")) children.unshift({ id: `${block.id}-heading`, type: "heading", level: 2, text: typeof block.data?.heading === "string" ? block.data.heading : "Enter your scores" });
      if (!children.some((child) => child.type === "table")) children.push(defaultScorecardTable({ ...block, type: "component", component: "mini-golf-scorecard" }));
    }
    if (block.role === "leaderboard") {
      if (!children.some((child) => child.type === "heading")) children.unshift({ id: `${block.id}-heading`, type: "heading", level: 2, text: "Leaderboard" });
      const players = children.filter((child) => child.type === "paragraph");
      for (let index = players.length; index < 2; index += 1) children.push({ id: `${block.id}-player-${index + 1}`, type: "paragraph", text: `Player ${index + 1} · — strokes · Average — · Std deviation — · Holes played 0 / 9` });
    }
    if (block.role === "share") {
      if (!children.some((child) => child.type === "heading")) children.unshift({ id: `${block.id}-heading`, type: "heading", level: 2, text: typeof block.data?.heading === "string" ? block.data.heading : "Ready to share?" });
      if (!children.some((child) => child.type === "button" && /excel/i.test(child.label))) children.push({ id: `${block.id}-excel`, type: "button", label: "↓ Download For Excel", url: "#", style: "primary" });
      if (!children.some((child) => child.type === "button" && /screenshot/i.test(child.label))) children.push({ id: `${block.id}-image`, type: "button", label: "▣ Copy Screenshot", url: "#", style: "secondary" });
      if (!children.some((child) => child.type === "button" && /html/i.test(child.label))) children.push({ id: `${block.id}-html`, type: "button", label: "▣ Copy As HTML", url: "#", style: "secondary" });
    }
    return { ...block, children };
  });
  return hydrated;
}

// A local page document for the source-aligned Mini Golf presentation adapter.
// It deliberately contains no game state, account connection or publication.
export const initialMiniGolfDraft: StudioWorkspace = {
  version: 2,
  activeDocumentId: "mini-golf-home",
  bin: [],
  documents: [{
    id: "mini-golf-home", kind: "page", title: "Mini Golf Scorecard",
    subtitle: "", slug: "home", excerpt: "",
    status: "draft", updatedAt: "2026-09-08T00:00:00.000Z", tags: [],
    template: "default", seoTitle: "Mini Golf Scorecard", seoDescription: "A simple, friendly scorecard for your next round of mini golf.",
    blocks: bindMiniGolfRuntime(applyMiniGolfSourceContract(completeMiniGolfPage(initialMiniGolfBlocks, "Mini Golf Scorecard", "A little friendly competition"), false)),
  }],
};

export const initialMiniGolfStagingDraft: StudioWorkspace = {
  ...initialMiniGolfDraft,
  documents: initialMiniGolfDraft.documents.map((document) => ({ ...document, blocks: applyMiniGolfSourceContract(document.blocks, true) })),
};

export function validateMiniGolfDraft(value: unknown): StudioWorkspace {
  const workspace = validateStudioWorkspace(value);
  const page = workspace.documents[0];
  if (workspace.documents.length !== 1 || page.id !== "mini-golf-home" || page.kind !== "page"
    || page.status !== "draft" || !["default", "wide"].includes(page.template ?? "")) {
    throw new Error("This is not a Mini Golf Scorecard page draft.");
  }
  return workspace;
}

export function createMiniGolfDraftRepository(storageKey: string): WorkspaceRepository { return {
  load() {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    const envelopeVersion = isRecord(parsed) && parsed.format === "mini-golf-page-draft" && typeof parsed.version === "number" ? parsed.version : undefined;
    const source = envelopeVersion && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(envelopeVersion) ? (parsed as Record<string, unknown>).workspace : parsed;
    const parsedWorkspace = validateStudioWorkspace(source);
    const page = parsedWorkspace.documents[0];
    const shouldMigrate = envelopeVersion === 1 || envelopeVersion === 2 || (envelopeVersion === undefined && page.blocks.some((block) => block.type !== "component" && (["setup", "scorecard", "leaderboard", "share"].includes(block.id) || /^(setup|scorecard|leaderboard|share)-/.test(block.id))));
    // Older releases wrote component blocks inside a v5 envelope. Inspect the
    // payload, not only its envelope version, so those drafts are converted to
    // the source-shaped section tree without discarding authored children.
    const transitionalIds = new Set(page.blocks.filter((block) => block.type === "component" || (block.id === "scorecard" && block.type === "group")).map((block) => block.id));
    const compatibilityBlocks = attachSourceMetadata(shouldMigrate ? migrateLegacyBlocks(page.blocks) : page.blocks);
    const converted = convertComponentSections(compatibilityBlocks);
    const migrated = transitionalIds.size > 0 && envelopeVersion === 5 ? hydrateTransitionalSections(converted, transitionalIds) : converted;
    const wasLegacy = migrated !== page.blocks;
    if (wasLegacy) page.blocks = migrated;
    if (envelopeVersion !== 7 && envelopeVersion !== 8 && envelopeVersion !== 9 && envelopeVersion !== 10) page.blocks = completeMiniGolfPage(page.blocks, page.title, page.subtitle ?? "");
    if (envelopeVersion !== 9 && envelopeVersion !== 10) page.blocks = applyMiniGolfSourceContract(page.blocks, storageKey === MINI_GOLF_STAGING_DRAFT_KEY, envelopeVersion !== 8);
    if (envelopeVersion !== 10) page.blocks = bindMiniGolfRuntime(page.blocks);
    const legacy = validateMiniGolfDraft(parsedWorkspace);
    return legacy;
  },
  save(workspace) {
    studioWriteOwnership.assertWritable();
    window.localStorage.setItem(storageKey, JSON.stringify({ format: "mini-golf-page-draft", version: 10, workspace: validateMiniGolfDraft(workspace) }));
  },
}; }

export const miniGolfDraftRepository = createMiniGolfDraftRepository(MINI_GOLF_DRAFT_KEY);
export const miniGolfStagingDraftRepository = createMiniGolfDraftRepository(MINI_GOLF_STAGING_DRAFT_KEY);
