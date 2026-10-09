/** Self-contained so generated local sites reuse the behaviour without hydration. */
export function attachNavigationRuntime(root: HTMLElement | Document) {
  function close(menu: HTMLDetailsElement, returnFocus: boolean) {
    menu.open = false;
    if (returnFocus) menu.querySelector<HTMLElement>(":scope > summary")?.focus();
  }
  function onClick(event: Event) {
    const target = event.target instanceof Element ? event.target : null;
    const menu = target?.closest<HTMLDetailsElement>("details");
    if (menu && target?.closest("[data-navigation-close]")) close(menu, true);
    if (target?.closest("a")) {
      const overlay = target.closest<HTMLDetailsElement>(".template-navigation-overlay");
      if (overlay) close(overlay, false);
    }
  }
  function onKeyDown(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    const target = event.target instanceof Element ? event.target : null;
    const menu = target?.closest<HTMLDetailsElement>("details[open]");
    if (event.key === "Escape" && menu?.closest(".template-navigation")) {
      event.preventDefault(); event.stopPropagation(); close(menu, true);
    }
    const overlay = target?.closest<HTMLDetailsElement>(".template-navigation-overlay[open]");
    if (event.key === "Tab" && overlay) {
      const controls = Array.from(overlay.querySelectorAll<HTMLElement>(".template-navigation-overlay-content button, .template-navigation-overlay-content a[href], .template-navigation-overlay-content summary")).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && target === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && target === last && first) { event.preventDefault(); first.focus(); }
    }
  }
  function onToggle(event: Event) {
    const menu = event.target;
    if (menu instanceof HTMLDetailsElement && menu.open && menu.classList.contains("template-navigation-overlay")) menu.querySelector<HTMLButtonElement>("[data-navigation-close]")?.focus();
  }
  function onPointer(event: Event) {
    if (!(event instanceof PointerEvent) || event.pointerType !== "mouse") return;
    const target = event.target instanceof Element ? event.target : null;
    let item = target?.closest<HTMLElement>(".has-submenu") ?? null;
    const nav = item?.closest<HTMLElement>(".template-navigation");
    if (!item || !nav || nav.dataset.submenuClick === "true") return;
    while (item && item.closest(".template-navigation") === nav) {
      if (!(event.relatedTarget instanceof Node && item.contains(event.relatedTarget))) {
        const menu = item.querySelector<HTMLDetailsElement>(":scope > .template-navigation-link-row > details");
        if (menu && (event.type === "pointerover" || !menu.contains(document.activeElement))) menu.open = event.type === "pointerover";
      }
      item = item.parentElement?.closest<HTMLElement>(".has-submenu") ?? null;
    }
  }
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("toggle", onToggle, true);
  root.addEventListener("pointerover", onPointer);
  root.addEventListener("pointerout", onPointer);
  return () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("toggle", onToggle, true);
    root.removeEventListener("pointerover", onPointer);
    root.removeEventListener("pointerout", onPointer);
  };
}

// This function has no imported values or content interpolation.
export const templateNavigationScript = `(${attachNavigationRuntime.toString()})(document);`;
