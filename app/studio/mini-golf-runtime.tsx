"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useSyncExternalStore, useRef, useId, type Dispatch, type SetStateAction, type ReactNode } from "react";
import {
  golf, DEFAULT_COLUMN_WIDTH, parseStoredGame, ScoreTable, useColumnSizing,
  usePlayerReordering, copyScorecardHtml, copyScorecardImage, downloadScorecardCsv,
  type Game, type TextSize,
} from "../../../mini-golf-scorecard/app/studio-integration";
import type { ContentBlock } from "../content/model";
import { installMiniGolfTableAuthoring, miniGolfTableAuthoringCells } from "./mini-golf-table-authoring";
import { studioWriteOwnership } from "./write-ownership";

export { golf };
export function initialRuntimeGame(blocks: ContentBlock[]): Game {
  const all: ContentBlock[] = [];
  const visit = (items: ContentBlock[]) => items.forEach(item => { all.push(item); if ("children" in item && item.children) visit(item.children); });
  visit(blocks);
  const table = all.find(item => item.type === "table");
  const setting = (suffix: string, fallback: number) => { const block = all.find(item => item.type === "field" && (item.siteRole === suffix.slice(1) || item.id.endsWith(suffix))); return block?.type === "field" ? Number.parseInt(block.value) || fallback : fallback; };
  let index = 0;
  const game = golf.createGame(setting("-holes", 9), setting("-players", table?.type === "table" ? table.rows[0].length - 2 : 2), () => `studio-player-${++index}`);
  if (table?.type === "table" && table.hasHeader) game.players = game.players.map((player, column) => ({ ...player, name: table.rows[0][column + 1] ?? player.name }));
  return game;
}

export function authoredTableSize(blocks: ContentBlock[]): TextSize {
  for (const block of blocks) {
    if (block.type === "field" && block.siteRole === "table-size") return block.value === "Large" ? "large" : block.value === "Small" ? "small" : "medium";
    if ("children" in block && block.children) { const found = authoredTableSize(block.children); if (found !== "medium") return found; }
  }
  return "medium";
}
export function syncRuntimeDefaults(game: Game, dirty: boolean, blocks: ContentBlock[]) {
  return dirty ? game : initialRuntimeGame(blocks);
}

function useRuntime(blocks: ContentBlock[], storageKey: string) {
  const blocksRef = useRef(blocks);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  const dirty = useRef(false);
  const [game, setStoredGame] = useState(() => initialRuntimeGame(blocks));
  const [tableSize, setStoredTableSize] = useState<TextSize>(() => authoredTableSize(blocks));
  const setGame: Dispatch<SetStateAction<Game>> = useCallback(value => { dirty.current = true; setStoredGame(value); }, []);
  const setTableSize = useCallback((value: TextSize) => { dirty.current = true; setStoredTableSize(value); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (dirty.current) return;
      setStoredGame(game => syncRuntimeDefaults(game, false, blocks));
      setStoredTableSize(authoredTableSize(blocks));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [blocks]);
  const [warning, setWarning] = useState("");
  const ownership = useSyncExternalStore(studioWriteOwnership.subscribe, studioWriteOwnership.getState, () => "waiting" as const);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [readable, setReadable] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = parseStoredGame(raw);
        if (raw !== null && !saved) { setReadable(false); setWarning("Saved scores could not be loaded. This round is not being saved. Download your scores before closing this page."); }
        else { dirty.current = saved !== null; setStoredGame(saved ?? initialRuntimeGame(blocksRef.current)); setReadable(true); }
      } catch { setReadable(false); setWarning("Scores cannot be saved on this device. Download your scores before closing this page."); }
      setLoadedFor(`${storageKey}:${ownership}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey, ownership]);
  useEffect(() => {
    if (!dirty.current || loadedFor !== `${storageKey}:${ownership}` || !readable || !studioWriteOwnership.canWrite()) return;
    void studioWriteOwnership.write(async () => { studioWriteOwnership.assertWritable(); localStorage.setItem(storageKey, JSON.stringify(game)); }).catch(() => setWarning("Scores could not be saved on this device. Download your scores before closing this page."));
  }, [game, loadedFor, ownership, readable, storageKey]);
  const reorder = useCallback((from: string, to: string, after?: boolean) => setGame(game => golf.reorderPlayers(game, from, to, after)), [setGame]);
  const columns = useColumnSizing(game.players);
  const layout = { ...columns, ...usePlayerReordering(game.players, reorder),
    autoColumns: () => { dirty.current = true; columns.autoColumns(); },
    resizeColumn: (...args: Parameters<typeof columns.resizeColumn>) => { dirty.current = true; columns.resizeColumn(...args); },
    resizeColumnBy: (...args: Parameters<typeof columns.resizeColumnBy>) => { dirty.current = true; columns.resizeColumnBy(...args); },
  };
  const model = golf.buildExportModel(game);
  const run = async (binding: string) => {
    if (binding === "reset") setGame(game => golf.resetScores(game));
    if (binding === "new-game" && window.confirm("Start a new game? Your current scorecard will be cleared.")) setGame(golf.createGame());
    if (binding === "auto-resize") layout.autoColumns();
    if (binding === "excel") downloadScorecardCsv(model);
    if (binding === "image" || binding === "html") {
      try { await (binding === "image" ? copyScorecardImage(model) : copyScorecardHtml(model)); setFeedback(current => ({ ...current, [binding]: binding === "image" ? "Copied Screenshot" : "Copied HTML" })); }
      catch { setFeedback(current => ({ ...current, [binding]: binding === "image" ? "Copy Screenshot Failed" : "Copy HTML Failed" })); }
      window.setTimeout(() => setFeedback(current => ({ ...current, [binding]: "" })), 2600);
    }
  };
  return { game, setGame, tableSize, setTableSize, layout, model, run, warning, feedback };
}
export type MiniGolfRuntime = ReturnType<typeof useRuntime>;
const Runtime = createContext<MiniGolfRuntime | null>(null);
export const useMiniGolfRuntime = () => useContext(Runtime);
export function MiniGolfRuntimeProvider({ blocks, identity, children }: { blocks: ContentBlock[]; identity: string; children: ReactNode }) {
  const runtime = useRuntime(blocks, `acm-studio-mini-golf-session-v1:${identity}:scorecard`);
  return <Runtime.Provider value={runtime}>{runtime.warning ? <p role="status" className="storage-warning">{runtime.warning}</p> : null}{children}</Runtime.Provider>;
}
type AuthoredTable = Extract<ContentBlock, { type: "table" }>;
export function runtimeTableDimensions(table: AuthoredTable, playerIds: string[]) {
  const columns = table.rows[0]?.length ?? 0;
  const custom = table.columnWidths?.length === columns && table.columnWidths.join(",") !== "16,28,28,28" ? table.columnWidths : undefined;
  const sum = custom?.reduce((total, width) => total + width, 0) ?? 0;
  const naturalWidth = 140 + Math.max(0, columns - 2) * 120;
  const pixels = custom && sum > 0 ? custom.map(width => width / sum * naturalWidth) : undefined;
  return { pixels, widths: Object.fromEntries(playerIds.flatMap((id, index) => pixels?.[index + 1] && index + 1 < pixels.length - 1 ? [[id, pixels[index + 1]]] : [])) };
}
export function RuntimeScoreTable({ runtime, table, mode = "preview", onCellSelect = () => undefined, onCellChange = () => undefined }: { runtime: MiniGolfRuntime; table: AuthoredTable; mode?: "edit" | "preview"; onCellSelect?: (row: number, column: number) => void; onCellChange?: (row: number, column: number, value: string) => void }) {
  const { game, model, tableSize, setTableSize, layout, setGame } = runtime;
  const rootRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!rootRef.current) return;
    return installMiniGolfTableAuthoring(rootRef.current, miniGolfTableAuthoringCells(table, model), mode, onCellSelect, onCellChange);
  }, [table, model, mode, onCellSelect, onCellChange]);
  const scope = `golf-table-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const dimensions = runtimeTableDimensions(table, game.players.map(player => player.id));
  const effectiveLayout = { ...layout, widths: { ...dimensions.widths, ...layout.widths },
    resizeColumn: ((event, id) => {
      const offset = layout.widths[id] === undefined && dimensions.widths[id] ? DEFAULT_COLUMN_WIDTH - dimensions.widths[id] : 0;
      layout.resizeColumn(offset ? { ...event, clientX: event.clientX + offset, preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() } : event, id);
    }) as typeof layout.resizeColumn,
    resizeColumnBy: ((id, delta) => {
      const offset = layout.widths[id] === undefined && dimensions.widths[id] ? dimensions.widths[id] - DEFAULT_COLUMN_WIDTH : 0;
      layout.resizeColumnBy(id, delta === "minimum" ? delta : delta + offset);
    }) as typeof layout.resizeColumnBy,
  };
  const heightRules = (table.rowHeights ?? []).map((height, index) => {
    const selector = table.hasHeader && index === 0 ? "thead tr" : table.hasFooter && index === table.rows.length - 1 ? "tfoot tr" : `tbody tr:nth-child(${index + (table.hasHeader ? 0 : 1)})`;
    return Number.isFinite(height) && height > 0 ? `.${scope} ${selector}{height:${height}px}` : "";
  }).join("");
  const columnRules = dimensions.pixels ? `.${scope} col:first-child{width:${dimensions.pixels[0]}px}.${scope} col:last-child{width:${dimensions.pixels.at(-1)}px}` : "";
  return <div ref={rootRef} className={`mini-golf-runtime-table ${scope}`}><style>{heightRules + columnRules}</style><ScoreTable game={game} exportModel={model} tableSize={tableSize} onTableSizeChange={setTableSize} layout={effectiveLayout} onAutoResize={layout.autoColumns} onScore={(id, hole, value) => setGame(game => golf.setScore(game, id, hole, value))} onAdjustScore={(id, hole, delta) => setGame(game => golf.adjustScore(game, id, hole, delta))} onPlayerNameChange={(id, name) => setGame(game => golf.renamePlayer(game, id, name))} onMovePlayer={(id, direction) => setGame(game => golf.movePlayer(game, id, direction))} /></div>;
}
