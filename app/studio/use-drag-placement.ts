"use client";
import { useId, useRef, useState, useEffect, useLayoutEffect, useCallback, type DragEvent, type PointerEvent, type MouseEvent } from "react";
import { startDragAutoScroll } from "./drag-auto-scroll";
import { maintainPlacementSpace, type PlacementSpace } from "./drag-placement-space";
import type { DropAxis, DropLine } from "./drop-gap-geometry";
const MIME = "application/x-acm-studio-placement";
export type DragPlacement<T> = { target: T; line: DropLine };
export type DragPlacementPolicy<S, T> = {
  version: string; writable: boolean;
  axis?: DropAxis;
  reserveSpace?: boolean;
  rows?: (root: HTMLElement) => HTMLElement[];
  boundary?: (root: HTMLElement) => HTMLElement | undefined;
  spaces?: (root: HTMLElement) => PlacementSpace[];
  canStart: (source: S) => boolean;
  effect?: (source: S) => "copy" | "move";
  resolve: (source: S, container: HTMLElement, x: number, y: number) => DragPlacement<T> | null;
  commit: (source: S, target: T) => boolean;
  onActivate?: (source: S) => void;
  onCancel?: () => void;
  onPreview?: (target: T | null) => void;
};
/** One input, freshness, cancellation, and feedback lifecycle for Studio placement. */
export function useDragPlacement<S, T>(policy: DragPlacementPolicy<S, T>) {
  const owner = useId();
  const root = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!root.current || policy.reserveSpace === false) return;
    return maintainPlacementSpace([{ element: root.current, axis: policy.axis ?? "y", rows: policy.rows?.(root.current), boundary: policy.boundary?.(root.current) }, ...(policy.spaces?.(root.current) ?? [])]);
  });
  const latest = useRef(policy);
  useLayoutEffect(() => { latest.current = policy; });
  const session = useRef<{ source: S; version: string } | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number; active: boolean } | null>(null);
  const scroll = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const [active, setActive] = useState(false);
  const [indicator, setIndicator] = useState<(DragPlacement<T> & { version: string }) | null>(null);
  const cancel = useCallback(() => {
    scroll.current?.(); scroll.current = null;
    if (pointer.current?.active) suppressClick.current = true;
    pointer.current = null; session.current = null; setIndicator(null); setActive(false);
    latest.current.onCancel?.();
  }, []);
  useLayoutEffect(() => { if (session.current && (!policy.writable || session.current.version !== policy.version)) cancel(); }, [policy.version, policy.writable, cancel]);
  useEffect(() => () => { scroll.current?.(); session.current = null; }, []);
  useEffect(() => {
    if (!active) return;
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    const outsideDrop = (event: globalThis.DragEvent) => {
      const containers = Array.from(document.querySelectorAll<HTMLElement>("[data-drag-placement-owner]")).filter(element => element.dataset.dragPlacementOwner === owner);
      if (!containers.some(element => element.contains(event.target as Node | null))) cancel();
    };
    document.addEventListener("keydown", escape, true); document.addEventListener("drop", outsideDrop, true); window.addEventListener("blur", cancel);
    return () => { document.removeEventListener("keydown", escape, true); document.removeEventListener("drop", outsideDrop, true); window.removeEventListener("blur", cancel); };
  }, [active, owner, cancel]);
  function position(container: HTMLElement, x: number, y: number) {
    const source = session.current; const current = latest.current;
    if (!current.writable || !source || source.version !== current.version || !current.canStart(source.source)) return null;
    if (pointer.current?.active && container.ownerDocument?.elementFromPoint && !container.contains(container.ownerDocument.elementFromPoint(x, y))) return null;
    return current.resolve(source.source, container, x, y);
  }
  function preview(container: HTMLElement, x: number, y: number) {
    const next = position(container, x, y);
    setIndicator(next ? { ...next, version: latest.current.version } : null);
    latest.current.onPreview?.(next?.target ?? null);
    return next;
  }
  function begin(source: S) {
    const current = latest.current;
    if (!current.writable || !current.canStart(source)) return false;
    session.current = { source, version: current.version }; setIndicator(null); return true;
  }
  function activate() { if (session.current) { setActive(true); latest.current.onActivate?.(session.current.source); } }
  function container(handle: HTMLElement) {
    const element = handle.closest<HTMLElement>("[data-drag-placement-owner]");
    return element?.dataset.dragPlacementOwner === owner ? element : null;
  }
  function commit(element: HTMLElement, x: number, y: number) {
    const source = session.current;
    const next = position(element, x, y);
    if (source && next) latest.current.commit(source.source, next.target);
  }
  const visible = policy.writable && indicator?.version === policy.version ? indicator : null;
  return {
    owner, active: policy.writable && active, placement: visible?.target ?? null, line: visible?.line ?? null, cancel,
    clearPreview() { setIndicator(null); latest.current.onPreview?.(null); },
    start(event: DragEvent<HTMLElement>, source: S) {
      event.stopPropagation();
      if (pointer.current || !begin(source)) { event.preventDefault(); return; }
      event.dataTransfer.setData(MIME, owner); event.dataTransfer.effectAllowed = latest.current.effect?.(source) ?? "move";
      const token = session.current; const view = event.currentTarget.ownerDocument?.defaultView;
      if (view?.requestAnimationFrame) view.requestAnimationFrame(() => { if (session.current === token) activate(); }); else activate();
    },
    handleProps: (source: S) => ({
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.pointerType !== "mouse" || event.button !== 0 || !begin(source)) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.focus(); suppressClick.current = false;
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const gesture = pointer.current;
        if (!gesture || gesture.id !== event.pointerId) return;
        if (!gesture.active && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6) return;
        if (!gesture.active) { gesture.active = true; activate(); }
        gesture.x = event.clientX; gesture.y = event.clientY;
        const handle = event.currentTarget;
        if (!scroll.current) scroll.current = startDragAutoScroll(handle, () => pointer.current?.active ? { x: pointer.current.x, y: pointer.current.y } : null, () => {
          const element = container(handle); if (element) preview(element, gesture.x, gesture.y);
        });
        const element = container(handle); if (element) preview(element, gesture.x, gesture.y); else setIndicator(null);
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        const gesture = pointer.current;
        if (!gesture || gesture.id !== event.pointerId) return;
        const element = container(event.currentTarget);
        if (gesture.active && element) commit(element, event.clientX, event.clientY);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        cancel();
      },
      onPointerCancel: cancel, onLostPointerCapture: cancel,
      onClickCapture(event: MouseEvent<HTMLElement>) { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } },
    }),
    listProps: {
      ref: (element: HTMLElement | null) => { root.current = element; },
      "data-drag-placement-owner": owner,
      onDragOver(event: DragEvent<HTMLElement>) { if (!event.dataTransfer.types.includes(MIME)) { setIndicator(null); return; } const next = preview(event.currentTarget, event.clientX, event.clientY); if (next) { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = session.current ? latest.current.effect?.(session.current.source) ?? "move" : "none"; } },
      onDrop(event: DragEvent<HTMLElement>) { if (!session.current) return; if (event.dataTransfer.getData(MIME) !== owner) { cancel(); return; } event.preventDefault(); event.stopPropagation(); commit(event.currentTarget, event.clientX, event.clientY); cancel(); },
      onDragLeave(event: DragEvent<HTMLElement>) { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setIndicator(null); latest.current.onPreview?.(null); } },
      onKeyDown(event: { key: string }) { if (event.key === "Escape") cancel(); },
    },
  };
}
