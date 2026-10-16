/** Self-contained so generated local sites reuse the behaviour without hydration. */
export function attachNavigationRuntime(root: HTMLElement | Document) {
  const navigationRoots = () => root instanceof HTMLElement && root.matches(".template-navigation")
    ? [root] : Array.from(root.querySelectorAll<HTMLElement>(".template-navigation"));
  function compactHeaderRow(nav: HTMLElement) {
    const row = nav.closest<HTMLElement>(".template-header [data-compact-navigation-row]");
    const parentNavigation = nav.parentElement?.closest<HTMLElement>(".template-navigation");
    return parentNavigation && row?.contains(parentNavigation) ? null : row;
  }
  const observationRoot = root instanceof HTMLElement ? compactHeaderRow(root) ?? root : root;
  const visibilityOptions = { subtree: true, attributes: true, attributeFilter: ["hidden", "style", "class"], childList: true, characterData: true };
  function refreshCollapse() {
    for (const nav of navigationRoots()) {
      if (nav.dataset.navigationOverlay !== "mobile") continue;
      const desktop = nav.querySelector<HTMLElement>(":scope > .template-navigation-desktop");
      const list = desktop?.querySelector<HTMLElement>(":scope > .template-navigation-items");
      if (!desktop || !list) continue;
      const row = compactHeaderRow(nav);
      const identity = row?.querySelector<HTMLElement>(".template-brand");
      const rowStyle = row ? getComputedStyle(row) : undefined;
      const width = row ? row.clientWidth - (parseFloat(rowStyle!.paddingLeft) || 0) - (parseFloat(rowStyle!.paddingRight) || 0) : nav.clientWidth;
      if (!width) continue; // Hidden local-publication sections are measured on reveal.
      const previousDesktop = desktop.getAttribute("style");
      const previousList = list.getAttribute("style");
      // Measure the real styled links in their unwrapped state, even when the
      // overlay is showing. A max-content measurement avoids collapse feedback.
      desktop.style.cssText += ";display:block;position:absolute;visibility:hidden;width:max-content;max-width:none;";
      list.style.cssText += ";flex-wrap:nowrap;width:max-content;max-width:none;";
      const needed = list.offsetWidth;
      if (previousDesktop === null) desktop.removeAttribute("style"); else desktop.setAttribute("style", previousDesktop);
      if (previousList === null) list.removeAttribute("style"); else list.setAttribute("style", previousList);
      function horizontalExtras(element: HTMLElement | null) {
        if (!element) return 0;
        const style = getComputedStyle(element);
        return [style.paddingLeft, style.paddingRight, style.borderLeftWidth, style.borderRightWidth, style.marginLeft, style.marginRight].reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
      }
      let identityWidth = 0;
      if (identity && row) {
        const previousIdentity = identity.getAttribute("style");
        identity.style.cssText += ";position:absolute;visibility:hidden;width:max-content;max-width:none;";
        identityWidth = identity.offsetWidth;
        if (previousIdentity === null) identity.removeAttribute("style"); else identity.setAttribute("style", previousIdentity);
        const identityChild = Array.from(row.children).find(child => child.contains(identity));
        const navigationChild = Array.from(row.children).find(child => child.contains(nav));
        identityWidth += horizontalExtras(identityChild instanceof HTMLElement ? identityChild : null);
        identityWidth += horizontalExtras(navigationChild instanceof HTMLElement ? navigationChild : null);
      }
      const gap = rowStyle ? parseFloat(rowStyle.columnGap) || 0 : 0;
      const available = width - identityWidth - (identity ? gap : 0) - horizontalExtras(nav);
      const collapsed = needed > available;
      nav.dataset.navigationCollapsed = String(collapsed);
      if (!collapsed) {
        const overlay = nav.querySelector<HTMLDetailsElement>(":scope > .template-navigation-overlay");
        if (overlay?.open) {
          const hadFocus = overlay.contains(document.activeElement);
          close(overlay, false);
          if (hadFocus) desktop.querySelector<HTMLElement>("a[href], summary, button")?.focus();
        }
      }
    }
  }
  function refresh() {
    // Own temporary measurement styles must not schedule another measurement.
    visibilityObserver?.disconnect();
    try { refreshCollapse(); refreshLinkAnchors(); }
    finally { visibilityObserver?.observe(observationRoot, visibilityOptions); }
  }
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
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(refresh);
  for (const nav of navigationRoots()) { observer?.observe(nav); const row = compactHeaderRow(nav); if (row) observer?.observe(row); }
  // Generated fixture routing switches authored document sections with hidden.
  const visibilityObserver = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(refresh);
  visibilityObserver?.observe(observationRoot, visibilityOptions);
  refresh();
  function onPublicationReveal() {
    for (const navigation of navigationRoots()) { observer?.observe(navigation); const row = compactHeaderRow(navigation); if (row) observer?.observe(row); }
    refresh();
  }
  root.addEventListener("acm-local-publication-revealed", onPublicationReveal);
  window.addEventListener("resize", refresh);
  document.fonts?.addEventListener("loadingdone", refresh);
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("toggle", onToggle, true);
  root.addEventListener("pointerover", onPointer);
  root.addEventListener("pointerout", onPointer);
  return () => {
    observer?.disconnect();
    visibilityObserver?.disconnect();
    root.removeEventListener("acm-local-publication-revealed", onPublicationReveal);
    window.removeEventListener("resize", refresh);
    document.fonts?.removeEventListener("loadingdone", refresh);
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("toggle", onToggle, true);
    root.removeEventListener("pointerover", onPointer);
    root.removeEventListener("pointerout", onPointer);
  };
}

// This function has no imported values or content interpolation.
export const templateNavigationScript = `(${attachNavigationRuntime.toString()})(document);`;
