/** Self-contained so generated local sites reuse the behaviour without hydration. */
export const navigationUsesMobileOverlay = (width: number) => width <= 600;

export function attachNavigationRuntime(root: HTMLElement | Document, getSearchEntries?: () => Array<{ title: string; href: string; text: string }>) {
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
      if (!desktop) continue;
      const row = compactHeaderRow(nav);
      const width = row?.clientWidth || nav.clientWidth;
      if (!width) continue; // Hidden local-publication sections are measured on reveal.
      // Gutenberg's Mobile overlay uses its small-screen breakpoint. Keep the
      // same rule in the resizable Studio canvas by measuring the containing
      // Header row, rather than the browser window or the menu text itself.
      const overlay = nav.querySelector<HTMLDetailsElement>(":scope > .template-navigation-overlay");
      // Once opened as a mobile menu, keep that presentation active while the
      // canvas is resized. Gutenberg leaves the open overlay in place until
      // the user closes it, even if the preview crosses the desktop breakpoint.
      const collapsed = navigationUsesMobileOverlay(width) || overlay?.open === true;
      nav.dataset.navigationCollapsed = String(collapsed);
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
    const searchButton = target?.closest<HTMLButtonElement>('[data-navigation-search-reveal="true"]');
    if (searchButton) {
      const form = searchButton.closest<HTMLFormElement>("form[data-navigation-search]");
      const input = form?.querySelector<HTMLInputElement>('input[type="search"]');
      if (form && input?.hidden) {
        event.preventDefault();
        input.hidden = false;
        searchButton.type = "submit";
        searchButton.setAttribute("aria-expanded", "true");
        searchButton.setAttribute("aria-label", "Search");
        searchButton.title = "Search";
        input.focus();
        return;
      }
    }
    const menu = target?.closest<HTMLDetailsElement>("details");
    if (menu && target?.closest("[data-navigation-close]")) close(menu, true);
    if (target?.closest("a") && !target.closest("a[data-navigation-link-id]")) {
      const overlay = target.closest<HTMLDetailsElement>(".template-navigation-overlay");
      if (overlay) close(overlay, false);
    }
  }
  function onSearch(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || !target.matches("form[data-navigation-search]")) return;
    event.preventDefault();
    const input = target.querySelector<HTMLInputElement>('input[type="search"]');
    const output = target.querySelector<HTMLElement>("[data-navigation-search-results]");
    if (!input || !output) return;
    const terms = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    output.replaceChildren();
    output.hidden = false;
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    if (!terms.length) {
      status.textContent = "Enter a search term.";
      output.append(status);
      input.focus();
      return;
    }
    const entries = getSearchEntries
      ? getSearchEntries()
      : Array.from(document.querySelectorAll<HTMLElement>('[data-test-document][data-test-searchable="true"]')).map(page => {
        const body = page.querySelector<HTMLElement>(".template-content-layout, .test-site-page");
        return { title: page.dataset.testTitle || "Untitled", href: `#document=${encodeURIComponent(page.dataset.testDocument ?? "")}`, text: body?.textContent ?? "" };
      });
    const matches = entries.filter(entry => {
      const text = `${entry.title} ${entry.text}`.toLocaleLowerCase();
      return terms.every(term => text.includes(term));
    }).slice(0, 10);
    status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? "result" : "results"} found.` : "No results found.";
    output.append(status);
    if (matches.length) {
      const list = document.createElement("ul");
      for (const match of matches) {
        if (!match.href) continue;
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = match.href;
        link.textContent = match.title;
        item.append(link);
        list.append(item);
      }
      output.append(list);
    }
  }
  function onKeyDown(event: Event) {
    if (!(event instanceof KeyboardEvent)) return;
    const target = event.target instanceof Element ? event.target : null;
    const partHandle = target?.closest<HTMLElement>(".template-editing .studio-part-resize-handle");
    const partOverlay = partHandle?.closest(".studio-part-resize-frame")?.querySelector<HTMLDetailsElement>(".template-navigation-overlay[open]");
    const menu = target?.closest<HTMLDetailsElement>("details[open]") ?? partOverlay;
    if (event.key === "Escape" && menu?.closest(".template-navigation")) {
      event.preventDefault(); event.stopPropagation(); close(menu, true);
    }
    const overlay = target?.closest<HTMLDetailsElement>(".template-navigation-overlay[open]") ?? partOverlay;
    if (event.key === "Tab" && overlay) {
      const controls = Array.from(overlay.querySelectorAll<HTMLElement>(".template-navigation-overlay-content button, .template-navigation-overlay-content a[href], .template-navigation-overlay-content summary, .template-navigation-overlay-content input, .template-navigation-overlay-content select, .template-navigation-overlay-content textarea, .template-navigation-overlay-content [tabindex], .template-navigation-overlay-content [contenteditable=true]")).filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
      const authoringPart = overlay.closest<HTMLElement>(".template-editing .studio-part-resize-frame");
      if (authoringPart) controls.push(...Array.from(authoringPart.querySelectorAll<HTMLElement>(":scope > .studio-part-resize-handle")));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && target === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && target === last && first) { event.preventDefault(); first.focus(); }
    }
  }
  function onToggle(event: Event) {
    const menu = event.target;
    const overlay = menu instanceof HTMLDetailsElement && menu.classList.contains("template-navigation-overlay") ? menu : null;
    const hadFocus = !!overlay?.contains(document.activeElement);
    if (overlay?.open) {
      const closeButton = overlay.querySelector<HTMLButtonElement>("[data-navigation-close]");
      const layout = overlay.querySelector<HTMLElement>(".navigation-overlay-layout > .template-group");
      // The runtime-owned close control follows the custom frame's text colour.
      if (closeButton) {
        closeButton.style.color = layout ? getComputedStyle(layout).color : "";
        closeButton.focus();
      }
    }
    refresh();
    if (overlay && !overlay.open && hadFocus) {
      const nav = overlay.closest<HTMLElement>(".template-navigation");
      if (nav?.dataset.navigationCollapsed === "false") {
        nav.querySelector<HTMLElement>(":scope > .template-navigation-desktop a[href], :scope > .template-navigation-desktop summary, :scope > .template-navigation-desktop button")?.focus();
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
  root.addEventListener("submit", onSearch);
  root.addEventListener("keydown", onKeyDown);
  // Standalone editor resize controls remain in their original DOM while the
  // navigation's focus cycle includes them. Public output has no such boundary.
  const editorPart = root instanceof HTMLElement ? root.closest<HTMLElement>(".template-editing .studio-part-resize-frame") : null;
  const onPartHandleKeyDown = (event: Event) => {
    const target = event.target instanceof Element ? event.target : null;
    const overlay = root instanceof HTMLElement ? root.querySelector(".template-navigation-overlay[open]") : null;
    if (!overlay || !target?.closest(".studio-part-resize-handle")) return;
    // React owns the drag cancellation at the button; let it consume Escape
    // before the navigation handles an otherwise unclaimed Escape.
    if (event instanceof KeyboardEvent && event.key === "Escape") {
      setTimeout(() => { if (!event.defaultPrevented) onKeyDown(event); }, 0);
    } else onKeyDown(event);
  };
  editorPart?.addEventListener("keydown", onPartHandleKeyDown);
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
    root.removeEventListener("submit", onSearch);
    root.removeEventListener("keydown", onKeyDown);
    editorPart?.removeEventListener("keydown", onPartHandleKeyDown);
    root.removeEventListener("toggle", onToggle, true);
    root.removeEventListener("pointerover", onPointer);
    root.removeEventListener("pointerout", onPointer);
  };
}

// This function has no imported values or content interpolation.
export const templateNavigationScript = `const navigationUsesMobileOverlay = ${navigationUsesMobileOverlay.toString()};\n(${attachNavigationRuntime.toString()})(document);`;
