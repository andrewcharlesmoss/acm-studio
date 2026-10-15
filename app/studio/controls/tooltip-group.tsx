"use client";

import { controlLibraryAttributes } from "./control-library-links";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";

const INITIAL_DELAY_MS = 200;
const GROUP_GRACE_MS = 700;

/** Short first-hover delay, with immediate labels while moving within a group. */
export function StudioTooltipGroup(props: HTMLAttributes<HTMLDivElement>) {
  const id = useId();
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const tooltip = useRef<HTMLDivElement>(null);
  const pending = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmUntil = useRef(0);
  const shown = useRef(false);

  const clearTimer = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const hide = useCallback(() => {
    clearTimer(); pending.current = null;
    if (shown.current) warmUntil.current = Date.now() + GROUP_GRACE_MS;
    shown.current = false; setTarget(null);
  }, [clearTimer]);
  function scheduleHide() {
    clearTimer();
    if (!shown.current) { pending.current = null; return; }
    timer.current = setTimeout(hide, 100);
  }
  function show(button: HTMLButtonElement, immediate: boolean) {
    if (pending.current === button && shown.current) { clearTimer(); return; }
    if (pending.current === button && !immediate) return;
    clearTimer(); pending.current = button;
    const reveal = () => {
      timer.current = null;
      if (!button.isConnected || pending.current !== button) return;
      shown.current = true; warmUntil.current = Date.now() + GROUP_GRACE_MS;
      setTarget(button);
    };
    if (immediate || shown.current || Date.now() < warmUntil.current) reveal();
    else timer.current = setTimeout(reveal, INITIAL_DELAY_MS);
  }
  function buttonFrom(node: EventTarget | null) {
    return node instanceof Element ? node.closest<HTMLButtonElement>("button[data-studio-tooltip]") : null;
  }

  useEffect(() => () => clearTimer(), [clearTimer]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [hide]);
  useLayoutEffect(() => {
    if (!target || !tooltip.current) return;
    const previousDescription = target.getAttribute("aria-describedby");
    const description = [previousDescription, id].filter(Boolean).join(" ");
    target.setAttribute("aria-describedby", description);
    const reposition = () => {
      if (!target.isConnected) { setTarget(null); return; }
      const button = target.getBoundingClientRect();
      const box = tooltip.current?.getBoundingClientRect();
      if (!box) return;
      const left = Math.max(8, Math.min(button.left + (button.width - box.width) / 2, window.innerWidth - box.width - 8));
      const below = button.bottom + 6;
      setPosition({ left, top: below + box.height <= window.innerHeight - 8 ? below : Math.max(8, button.top - box.height - 6) });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      if (target.getAttribute("aria-describedby") === description) {
        if (previousDescription) target.setAttribute("aria-describedby", previousDescription);
        else target.removeAttribute("aria-describedby");
      }
    };
  }, [target, id]);

  return <div {...props} {...controlLibraryAttributes("tooltip")}
    onPointerOver={event => { props.onPointerOver?.(event); if (event.pointerType === "touch") return; const button = buttonFrom(event.target); if (button) show(button, false); }}
    onPointerOut={event => { props.onPointerOut?.(event); if (event.relatedTarget instanceof Node && tooltip.current?.contains(event.relatedTarget)) { clearTimer(); return; } const next = buttonFrom(event.relatedTarget); if (next && event.currentTarget.contains(next)) show(next, false); else if (!pending.current?.matches(":focus-visible")) scheduleHide(); }}
    onFocusCapture={event => { props.onFocusCapture?.(event); const button = buttonFrom(event.target); if (button?.matches(":focus-visible")) show(button, true); }}
    onBlurCapture={event => { props.onBlurCapture?.(event); hide(); }}
    onPointerDown={event => { props.onPointerDown?.(event); hide(); }}>
    {props.children}
    {target ? createPortal(<div id={id} ref={tooltip} role="tooltip" className="studio-control-tooltip" style={position} onPointerEnter={clearTimer} onPointerLeave={() => { if (!pending.current?.matches(":focus-visible")) scheduleHide(); }}>{target.dataset.studioTooltip}</div>, document.body) : null}
  </div>;
}
