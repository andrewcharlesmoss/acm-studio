import type { ContentBlock } from "../content/model";
import { childContentBlocks } from "../content/block-tree";
import { golf, type MiniGolfRuntime } from "./mini-golf-runtime";

type Player = MiniGolfRuntime["model"]["stats"][number];

function mapChildren(block: ContentBlock, update: (child: ContentBlock) => ContentBlock): ContentBlock {
  if (block.type === "list") return { ...block, items: block.items.map(item => typeof item === "string" ? item : { ...item, children: item.children?.map(child => update(child) as Extract<ContentBlock, { type: "list" }>) }) };
  if ("children" in block && block.children) return { ...block, children: block.children.map(update) } as ContentBlock;
  return block;
}

/** Edit and Preview derive player text through the same presentation binding. */
export function bindMiniGolfPlayer(block: ContentBlock, player: Player, holes: number): ContentBlock {
  const nested = mapChildren(block, child => bindMiniGolfPlayer(child, player, holes));
  if (nested.type !== "paragraph" && nested.type !== "heading") return nested;
  let text = nested.text;
  if (nested.siteRole === "player-name") text = player.name || "Unnamed player";
  if (nested.siteRole === "score-value") text = player.total ? String(player.total) : "—";
  if (["metric-value", "metric-average", "metric-deviation", "metric-holes"].includes(nested.siteRole ?? "")) {
    if (nested.siteRole === "metric-average" || nested.id.includes("-metric-1-")) text = golf.formatStat(player.average);
    if (nested.siteRole === "metric-deviation" || nested.id.includes("-metric-2-")) text = golf.formatStat(player.deviation);
    if (nested.siteRole === "metric-holes" || nested.id.includes("-metric-3-")) text = `${player.values.length} / ${holes}`;
  }
  return { ...nested, text, runs: text === nested.text ? nested.runs : undefined };
}

/** Ephemeral Preview identities and fields follow the actual runtime composition. */
export function miniGolfPreviewProjection(blocks: ContentBlock[], runtime: MiniGolfRuntime) {
  const reservedIds = new Set<string>();
  const reserve = (items: ContentBlock[]) => items.forEach(block => { reservedIds.add(block.id); reserve(childContentBlocks(block)); });
  reserve(blocks);
  const leaderCardIds = new Set<string>();
  const sourceBlockIds = new Map<string, string>();
  const ownedNotes = new Set<string>();
  const leaderId = runtime.model.stats.find(player => player.values.length)?.id;
  function cloneInstance(block: ContentBlock, playerId: string): ContentBlock {
    const stem = `mini-golf-preview-${encodeURIComponent(JSON.stringify([block.id, playerId]))}`;
    let id = stem;
    for (let suffix = 1; reservedIds.has(id); suffix++) id = `${stem}-${suffix}`;
    reservedIds.add(id);
    sourceBlockIds.set(id, sourceBlockIds.get(block.id) ?? block.id);
    return { ...mapChildren(block, child => cloneInstance(child, playerId)), id } as ContentBlock;
  }
  function project(block: ContentBlock): ContentBlock {
    if (block.editorial?.hidden || block.type === "component") return block;
    if (block.type === "section" && block.role === "leaderboard") {
      const cards = block.children.filter(child => child.type === "section" && child.role === "leaderboard-card");
      const template = cards[0];
      const children = block.children.flatMap(child => {
        if (child !== template) return cards.includes(child) ? [] : [project(child)];
        return runtime.model.stats.map((player, index) => {
          const bound = bindMiniGolfPlayer(child, player, runtime.game.holes);
          const instance = index ? cloneInstance(bound, player.id) : bound;
          if (player.id === leaderId) leaderCardIds.add(instance.id);
          return project(instance);
        });
      });
      return { ...block, children };
    }
    if ((block.type === "paragraph" || block.type === "heading") && block.siteRole === "progress") {
      const complete = Array.from({ length: runtime.game.holes }, (_, hole) => golf.isHoleComplete(runtime.game, hole)).filter(Boolean).length;
      return { ...block, text: `${complete} / ${runtime.game.holes} holes complete`, runs: undefined };
    }
    if (block.type === "footnotes") {
      // Repeated cards share document notes; each note retains one visible owner.
      return { ...block, notes: block.notes.filter(note => { if (ownedNotes.has(note.id)) return false; ownedNotes.add(note.id); return true; }) };
    }
    return mapChildren(block, project);
  }
  return { blocks: blocks.map(project), leaderCardIds, sourceBlockIds };
}
