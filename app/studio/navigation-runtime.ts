/** Self-contained so generated local sites reuse the behaviour without hydration. */
export function attachNavigationRuntime(root: HTMLElement | Document) {
  // Desktop and overlay copies share one authored link. Only the active
  // presentation owns its anchor, including custom overlay Navigation children.
  function refreshLinkAnchors() {
    let anchorRoot: HTMLElement | Document = root;
    if (root instanceof HTMLElement) {
      let parent = root.parentElement?.closest<HTMLElement>(".template-navigation");
      while (parent) {
        anchorRoot = parent;
        parent = parent.parentElement?.closest<HTMLElement>(".template-navigation");
      }
    }
    const links = [
      ...(anchorRoot instanceof HTMLElement && anchorRoot.dataset.navigationAnchor ? [anchorRoot] : []),
      ...Array.from(anchorRoot.querySelectorAll<HTMLElement>("[data-navigation-anchor]")),
    ];
    const groups = new Map<string, HTMLElement[]>();
    for (const link of links) {
      const anchor = link.dataset.navigationAnchor;
      if (!anchor) continue;
      if (link.id === anchor) link.removeAttribute("id");
      const copies = groups.get(anchor) ?? [];
      copies.push(link); groups.set(anchor, copies);
    }
    for (const [anchor, copies] of groups) {
      const active = copies.find(link => {
        let ancestor: HTMLElement | null = link.parentElement;
        while (ancestor) {
          if (ancestor.hidden) return false;
          if (ancestor.classList.contains("template-navigation-desktop") && getComputedStyle(ancestor).display === "none") return false;
          if (ancestor.classList.contains("template-navigation-overlay")) {
            const nav = ancestor.closest<HTMLElement>(".template-navigation");
            const desktop = nav?.querySelector<HTMLElement>(":scope > .template-navigation-desktop");
            if (desktop && getComputedStyle(desktop).display !== "none") return false;
          }
          ancestor = ancestor.parentElement;
        }
        return true;
      }) ?? copies[0];
      // Never replace a separately authored ID on an unrelated element.
      if (active && !active.id) active.id = anchor;
    }
  }
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
      const controls = Array.from(overlay.querySelectorAll<HTMLElement>(".template-navigation-overlay-content button, .template-navigation-overlay-content a[href], .template-navigation-overlay-content summary, .template-navigation-overlay-content input, .template-navigation-overlay-content select, .template-navigation-overlay-content textarea, .template-navigation-overlay-content [tabindex], .template-navigation-overlay-content [contenteditable=true]")).filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && target === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && target === last && first) { event.preventDefault(); first.focus(); }
    }
  }
  function onToggle(event: Event) {
    refreshLinkAnchors();
    const menu = event.target;
    if (menu instanceof HTMLDetailsElement && menu.open && menu.classList.contains("template-navigation-overlay")) {
      const closeButton = menu.querySelector<HTMLButtonElement>("[data-navigation-close]");
      const layout = menu.querySelector<HTMLElement>(".navigation-overlay-layout > .template-group");
      // The runtime-owned close control follows the custom frame's text colour.
      if (closeButton) {
        closeButton.style.color = layout ? getComputedStyle(layout).color : "";
        closeButton.focus();
      }
    }
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
  refreshLinkAnchors();
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(refreshLinkAnchors);
  const navigationRoots = root instanceof HTMLElement && root.matches(".template-navigation")
    ? [root] : Array.from(root.querySelectorAll<HTMLElement>(".template-navigation"));
  for (const nav of navigationRoots) observer?.observe(nav);
  // Generated fixture routing switches authored document sections with hidden.
  const visibilityObserver = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(refreshLinkAnchors);
  visibilityObserver?.observe(root, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("resize", refreshLinkAnchors);
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("toggle", onToggle, true);
  root.addEventListener("pointerover", onPointer);
  root.addEventListener("pointerout", onPointer);
  return () => {
    observer?.disconnect();
    visibilityObserver?.disconnect();
    window.removeEventListener("resize", refreshLinkAnchors);
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("toggle", onToggle, true);
    root.removeEventListener("pointerover", onPointer);
    root.removeEventListener("pointerout", onPointer);
  };
}

// This function has no imported values or content interpolation.
export const templateNavigationScript = `(${attachNavigationRuntime.toString()})(document);`;
