"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { controlGroupId, studioControlEntries, studioControlGroups } from "../../controls/library-catalogue";

const orderedControlEntries = studioControlGroups.flatMap(group => studioControlEntries.filter(entry => entry.group === group));

function controlForHash(hash: string) {
  let id: string;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
  return orderedControlEntries.find(entry => entry.id === id || controlGroupId(entry.group) === id)?.id ?? null;
}

export function ControlsNavigation() {
  const [activeId, setActiveId] = useState(orderedControlEntries[0]?.id ?? "");
  const requestedControl = useRef<string | null>(null);

  function selectControl(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    requestedControl.current = id;
    setActiveId(id);
  }

  useEffect(() => {
    let frame = 0;

    function updateActiveControl() {
      // Native anchor scrolling is animated. Retain the requested destination
      // until the user scrolls the page, including anchors near the page end.
      if (requestedControl.current) { setActiveId(requestedControl.current); return; }
      let nextId = orderedControlEntries[0]?.id ?? "";

      for (const entry of orderedControlEntries) {
        const specimen = document.getElementById(entry.id);
        if (!specimen) continue;
        const marker = (parseFloat(window.getComputedStyle(specimen).scrollMarginTop) || 0) + 1;
        if (specimen.getBoundingClientRect().top > marker) break;
        nextId = entry.id;
      }

      setActiveId(current => current === nextId ? current : nextId);
    }

    function scheduleActiveControlUpdate() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveControl();
      });
    }

    function followHash() {
      requestedControl.current = controlForHash(window.location.hash);
      scheduleActiveControlUpdate();
    }

    function scrollsMenu(target: HTMLElement | null) {
      const menu = target?.closest?.(".ui-catalogue-navigation");
      return menu && menu.scrollHeight > menu.clientHeight && ["auto", "scroll"].includes(window.getComputedStyle(menu).overflowY);
    }

    function resumeScrollTracking(event: Event) {
      if (!scrollsMenu(event.target as HTMLElement | null)) requestedControl.current = null;
    }

    function resumeKeyboardTracking(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || scrollsMenu(target) || target?.closest?.("input, select, textarea, [contenteditable='true'], [role='slider']")) return;
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) requestedControl.current = null;
    }

    function resumeScrollbarTracking(event: PointerEvent) {
      if (event.target === document.documentElement) requestedControl.current = null;
    }

    requestedControl.current = controlForHash(window.location.hash);
    updateActiveControl();
    window.addEventListener("scroll", scheduleActiveControlUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveControlUpdate);
    window.addEventListener("hashchange", followHash);
    window.addEventListener("wheel", resumeScrollTracking, { passive: true });
    window.addEventListener("touchmove", resumeScrollTracking, { passive: true });
    window.addEventListener("pointerdown", resumeScrollbarTracking);
    window.addEventListener("keydown", resumeKeyboardTracking);

    return () => {
      window.removeEventListener("scroll", scheduleActiveControlUpdate);
      window.removeEventListener("resize", scheduleActiveControlUpdate);
      window.removeEventListener("hashchange", followHash);
      window.removeEventListener("wheel", resumeScrollTracking);
      window.removeEventListener("touchmove", resumeScrollTracking);
      window.removeEventListener("pointerdown", resumeScrollbarTracking);
      window.removeEventListener("keydown", resumeKeyboardTracking);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <aside className="ui-catalogue-navigation" aria-label="Controls menu">
    <h2>Jump to</h2>
    <nav aria-label="Control specimens"><div className="ui-catalogue-navigation-groups">{studioControlGroups.map(group => {
      const entries = studioControlEntries.filter(entry => entry.group === group);
      if (!entries.length) return null;
      return <section className="ui-catalogue-navigation-group" key={group}>
        <h3><a href={`#${controlGroupId(group)}`} onClick={event => selectControl(event, entries[0].id)}>{group}</a></h3>
        <ul className="ui-catalogue-navigation-list">{entries.map(entry => <li key={entry.id}><a href={`#${entry.id}`} aria-current={activeId === entry.id ? "location" : undefined} onClick={event => selectControl(event, entry.id)}>{entry.title}</a></li>)}</ul>
      </section>;
    })}</div></nav>
  </aside>;
}
