"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type Highlight = { kind: "padding" | "margin"; sides: number[] };
const DimensionHighlightContext = createContext<(value: Highlight | null) => void>(() => {});
export function useDimensionHighlight() { return useContext(DimensionHighlightContext); }

/** Editor-local, ephemeral box-model feedback; never enters saved content. */
export function DimensionHighlightProvider({ canvas, selectedId, children }: { canvas: RefObject<HTMLElement | null>; selectedId: string | null; children: ReactNode }) {
  const [highlight, setHighlight] = useState<(Highlight & { selectedId: string | null }) | null>(null);
  const [bands, setBands] = useState<{ left: number; top: number; width: number; height: number }[]>([]);
  const updateHighlight = useCallback((next: Highlight | null) => setHighlight(next ? { ...next, selectedId } : null), [selectedId]);
  const activeHighlight = highlight?.selectedId === selectedId ? highlight : null;
  useEffect(() => { const clear = () => setHighlight(null); const release = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest("[data-dimension-control]")) clear(); }; window.addEventListener("pointerup", release); window.addEventListener("pointercancel", clear); window.addEventListener("blur", clear); return () => { window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", clear); window.removeEventListener("blur", clear); }; }, []);
  useEffect(() => {
    if (!activeHighlight || !selectedId) return;
    let frame = 0;
    const measure = () => {
      const root = canvas.current;
      const element = root?.querySelector<HTMLElement>(`[data-studio-nested-block-id="${CSS.escape(selectedId)}"]`) ?? root?.querySelector<HTMLElement>(`[data-studio-block-anchor-id="${CSS.escape(selectedId)}"]`);
      const target = element?.querySelector<HTMLElement>(":scope > .template-node > .template-group, :scope > .template-group, :scope > .studio-nested-group, :scope > .block-field > .studio-nested-group") ?? element;
      if (target?.isConnected && target.offsetWidth) {
        const rect = target.getBoundingClientRect();
        const style = getComputedStyle(target);
        const scale = rect.width / target.offsetWidth;
        const values = [style[`${activeHighlight.kind}Top`], style[`${activeHighlight.kind}Right`], style[`${activeHighlight.kind}Bottom`], style[`${activeHighlight.kind}Left`]].map(value => Math.max(0, parseFloat(value) || 0) * scale);
        const [top, right, bottom, left] = values;
        const margin = activeHighlight.kind === "margin";
        const next = [
          { left: rect.left, top: margin ? rect.top - top : rect.top, width: rect.width, height: top },
          { left: margin ? rect.right : rect.right - right, top: rect.top, width: right, height: rect.height },
          { left: rect.left, top: margin ? rect.bottom : rect.bottom - bottom, width: rect.width, height: bottom },
          { left: margin ? rect.left - left : rect.left, top: rect.top, width: left, height: rect.height },
        ].filter((_, index) => activeHighlight.sides.includes(index));
        setBands(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      } else setBands([]);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const root = canvas.current;
    const resize = new ResizeObserver(schedule);
    if (root) resize.observe(root);
    const mutations = new MutationObserver(schedule);
    if (root) mutations.observe(root, { subtree: true, attributes: true, childList: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    schedule();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect(); window.removeEventListener("resize", schedule); document.removeEventListener("scroll", schedule, true); };
  }, [canvas, activeHighlight, selectedId]);
  return <DimensionHighlightContext.Provider value={updateHighlight}>{children}{activeHighlight && typeof document !== "undefined" ? createPortal(<div aria-hidden="true" data-dimension-highlight={activeHighlight.kind} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 }}>{bands.map((band, index) => <div key={index} style={{ position: "fixed", background: "rgba(56, 88, 233, .25)", ...band }} />)}</div>, document.body) : null}</DimensionHighlightContext.Provider>;
}
