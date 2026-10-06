"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type RenderedColours = { text: string; background: string | null; fontSize: string; fontWeight: string; linkBackground: string | null; linkFontSize: string; linkFontWeight: string };

function backgroundBehind(element: HTMLElement): string | null {
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.backgroundImage !== "none" || style.opacity !== "1" || style.mixBlendMode !== "normal") return null;
    const colour = style.backgroundColor;
    if (!colour || colour === "transparent" || /^rgba?\([^)]*,\s*0\s*\)$/.test(colour)) continue;
    // An alpha background needs compositing at the text's actual position.
    if (/^rgba\(/.test(colour) && !/[, ]1\)$/.test(colour)) return null;
    return colour;
  }
  return null;
}

/** Reads the selected editor specimen, never the public preview or inspector. */
export function useRenderedColours(inspectorRef: RefObject<HTMLElement | null>, blockId: string): RenderedColours | null {
  const [colours, setColours] = useState<RenderedColours | null>(null);
  useLayoutEffect(() => {
    const inspector = inspectorRef.current;
    const owner = inspector?.closest<HTMLElement>(".studio-workspace, .ui-block-specimen");
    const canvas = owner?.querySelector<HTMLElement>(".canvas-blocks, .ui-block-canvas");
    if (!canvas) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const editors = canvas.querySelectorAll<HTMLElement>("[data-studio-block-id]");
      const editor = [...editors].find(candidate => candidate.dataset.studioBlockId === blockId && candidate.matches(".rich-text-editor"))
        ?? [...editors].find(candidate => candidate.dataset.studioBlockId === blockId);
      const style = editor ? getComputedStyle(editor) : null;
      const link = editor?.querySelector<HTMLElement>("a");
      const linkStyle = link ? getComputedStyle(link) : style;
      const next = editor && style && linkStyle ? { text: style.color, background: backgroundBehind(editor), fontSize: style.fontSize, fontWeight: style.fontWeight, linkBackground: backgroundBehind(link ?? editor), linkFontSize: linkStyle.fontSize, linkFontWeight: linkStyle.fontWeight } : null;
      setColours(previous => previous?.text === next?.text && previous?.background === next?.background && previous?.fontSize === next?.fontSize && previous?.fontWeight === next?.fontWeight && previous?.linkBackground === next?.linkBackground && previous?.linkFontSize === next?.linkFontSize && previous?.linkFontWeight === next?.linkFontWeight ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const observer = new MutationObserver(schedule);
    observer.observe(canvas, { attributes: true, attributeFilter: ["class", "style"], childList: true, subtree: true });
    for (let ancestor = canvas.parentElement; ancestor; ancestor = ancestor.parentElement) observer.observe(ancestor, { attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", schedule);
    return () => { observer.disconnect(); window.removeEventListener("resize", schedule); if (frame) cancelAnimationFrame(frame); };
  }, [blockId, inspectorRef]);
  return colours;
}
