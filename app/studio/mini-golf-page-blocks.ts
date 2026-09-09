import type { ContentBlock, SiteContentRole, SiteSectionRole } from "../content/model";

const assetRoot = "https://mini-golf-scorecard.andrewcharlesmoss.chatgpt.site";
const source = { module: "mini-golf-scorecard/app/page", exportName: "Home", revision: "0d2df8bd31f277df31522aa47ca6bf785888c460" };

/** Expand only pre-v7 page drafts: subsequent deletions are authored state. */
export function completeMiniGolfPage(blocks: ContentBlock[], title: string, subtitle: string): ContentBlock[] {
  const ids = new Set<string>();
  const collect = (items: ContentBlock[]) => items.forEach((item) => { ids.add(item.id); if (item.type === "section" || item.type === "group" || item.type === "component") collect(item.children ?? []); });
  collect(blocks);
  const id = (preferred: string) => { let value = preferred; let suffix = 2; while (ids.has(value)) value = `${preferred}-${suffix++}`; ids.add(value); return value; };
  const paragraph = (key: string, text: string, siteRole?: SiteContentRole): ContentBlock => ({ id: id(key), type: "paragraph", text, siteRole });
  const image = (key: string, src: string, alt: string, siteRole: SiteContentRole): ContentBlock => ({ id: id(key), type: "image", src: `${assetRoot}${src}`, alt, siteRole });
  const section = (key: string, role: SiteSectionRole, children: ContentBlock[]): ContentBlock => ({ id: id(key), type: "section", role, layout: "stack", children, data: role === "footer-links" ? { ariaLabel: "Mini Golf Scorecard links" } : undefined, source: role.startsWith("footer") || role === "social-link" ? { ...source, module: "mini-golf-scorecard/app/layout", exportName: "RootLayout" } : source });
  const socialLink = (key: string, label: string, url: string, src: string) => section(key, "social-link", [image(`${key}-icon`, src, "", "social-icon"), { id: id(`${key}-action`), type: "button", label, url, style: "secondary", siteRole: "social-action" }]);
  const converted = blocks.map((block): ContentBlock => {
    if (block.type !== "section") return block;
    if (block.role === "account") {
      if (block.children.some((item) => item.type === "section" && item.role === "account-copy")) return block;
      const status = block.children.find((item) => item.type === "paragraph");
      const children = block.children.map((item) => item === status ? section(`${block.id}-copy`, "account-copy", [paragraph(`${block.id}-eyebrow`, "ACM Account", "eyebrow"), { ...item, siteRole: "status" }]) : item.type === "button" && item.url === "#" ? { ...item, url: "/api/auth/start?return_to=/" } : item);
      if (!status) children.unshift(section(`${block.id}-copy`, "account-copy", [paragraph(`${block.id}-eyebrow`, "ACM Account", "eyebrow")]));
      return { ...block, children };
    }
    if (block.role === "scorecard") {
      if (block.children.some((item) => item.type === "section" && item.role === "scorecard-heading")) return block;
      const heading = block.children.find((item) => item.type === "heading");
      const table = block.children.find((item) => item.type === "table");
      const holes = table?.type === "table" ? Math.max(0, table.rows.length - Number(Boolean(table.hasHeader)) - Number(Boolean(table.hasFooter))) : 0;
      const actions = section(`${block.id}-actions`, "scorecard-actions", [paragraph(`${block.id}-progress`, `0 / ${holes} Holes Complete`, "progress"), { id: id(`${block.id}-text-size`), type: "field", control: "select", label: "Table text", value: "Standard", options: ["Small", "Standard", "Large"], siteRole: "table-size" }, { id: id(`${block.id}-auto-resize`), type: "button", label: "↔ Auto-Resize Columns", url: "#", style: "secondary", siteRole: "auto-resize" }]);
      const headingRow = section(`${block.id}-heading-row`, "scorecard-heading", [...(heading ? [heading] : []), ...(table ? [actions] : [])]);
      const children = block.children.flatMap((item) => item === heading ? [headingRow] : [item]);
      if (!heading && table) children.unshift(headingRow);
      return { ...block, children };
    }
    if (block.role === "leaderboard") return { ...block, children: block.children.map((item): ContentBlock => {
      if (item.type !== "paragraph" || (!/^leaderboard-player-/.test(item.id) && !/·.*strokes.*·.*Average/i.test(item.text))) return item;
      const [name, scoreText = "— strokes", ...metricText] = item.text.split("·").map((value) => value.trim());
      const score = /^(.*?)\s+(strokes)$/.exec(scoreText);
      const defaults = ["Average —", "Std deviation —", "Holes played 0 / 9"];
      const metrics = defaults.map((fallback, index) => {
        const value = metricText[index] ?? fallback;
        const match = /^(Average|Std deviation|Holes played)\s+(.*)$/i.exec(value);
        return section(`${item.id}-metric-${index + 1}`, "metric", [paragraph(`${item.id}-metric-${index + 1}-label`, match?.[1] ?? value, "metric-label"), paragraph(`${item.id}-metric-${index + 1}-value`, match?.[2] ?? "", "metric-value")]);
      });
      return { id: item.id, type: "section", role: "leaderboard-card", layout: "stack", data: { legacy: JSON.stringify(item) }, source: block.source, children: [{ ...item, id: id(`${item.id}-name`), text: name, runs: item.runs ? (() => { let offset = 0; return item.runs.flatMap((run) => { const start = offset; offset += run.text.length; return start < name.length ? [{ ...run, text: run.text.slice(0, name.length - start) }] : []; }); })() : undefined, siteRole: "player-name" }, section(`${item.id}-score`, "leaderboard-score", [paragraph(`${item.id}-score-value`, score?.[1] ?? scoreText, "score-value"), paragraph(`${item.id}-score-label`, score?.[2] ?? "", "score-label")]), section(`${item.id}-metrics`, "leaderboard-metrics", metrics), ...metricText.slice(3).map((text, index) => paragraph(`${item.id}-extra-${index}`, text))] };
    }) };
    return block;
  });
  if (!converted.some((block) => block.type === "section" && block.role === "hero")) converted.unshift(section("hero", "hero", [image("hero-logo", "/app-icon.svg", "", "logo"), section("hero-copy", "hero-copy", [paragraph("hero-eyebrow", subtitle, "eyebrow"), { id: id("hero-title"), type: "heading", level: 1, text: title, runs: title.toLowerCase() === "mini golf scorecard" ? [{ text: title.slice(0, 10) }, { text: title.slice(10), marks: ["italic"] }] : undefined, siteRole: "title" }])]));
  if (!converted.some((block) => block.type === "section" && block.role === "footer")) converted.push(section("footer", "footer", [section("footer-brand", "footer-brand", [image("footer-logo", "/app-icon.svg", "", "logo"), paragraph("footer-name", "Mini Golf Scorecard", "footer-name")]), paragraph("footer-copyright", "© 2026 Mini Golf Scorecard. All Rights Reserved.", "copyright"), section("footer-links", "footer-links", [socialLink("footer-linkedin", "Andrew Moss on LinkedIn", "https://uk.linkedin.com/in/andrewcharlesmoss", "/social/linkedin.png"), socialLink("footer-coffee", "Buy me a coffee", "https://buymeacoffee.com/andrewcharlesmoss", "/social/buy-me-a-coffee.png")])]));
  return converted;
}


/** Upgrade former renderer conventions without overwriting authored changes. */
export function applyMiniGolfSourceContract(blocks: ContentBlock[], staging: boolean, updateLegacyDefaults = true): ContentBlock[] {
  return blocks.map((block) => {
    if (block.type !== "section" && block.type !== "group" && block.type !== "component") return block;
    const children = applyMiniGolfSourceContract(block.children ?? [], staging, updateLegacyDefaults).map((child): ContentBlock => {
      if (updateLegacyDefaults && block.type === "section" && block.role === "setup" && child.type === "button" && !child.siteRole && /(?:^|-)new-game$/.test(child.id)) return { ...child, siteRole: "new-game" };
      if (updateLegacyDefaults && staging && block.type === "section" && block.role === "account" && child.type === "button" && child.label === "Sign in with ACM Account" && ["#", "/api/auth/start?return_to=/"].includes(child.url)) return { ...child, label: "Continue with ACM Account", url: "/api/auth/choose" };
      return child;
    });
    const data = block.type === "section" && block.role === "footer-links" && block.data?.ariaLabel === undefined
      ? { ...block.data, ariaLabel: "Mini Golf Scorecard links" }
      : block.data;
    return { ...block, children, data };
  });
}


/** Add stable runtime bindings without changing authored values or structure. */
export function bindMiniGolfRuntime(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map(block => {
    const next = "children" in block && block.children ? { ...block, children: bindMiniGolfRuntime(block.children) } : block;
    if (next.siteRole === "metric-value") {
      const role = next.id.includes("-metric-1-") ? "metric-average" : next.id.includes("-metric-2-") ? "metric-deviation" : next.id.includes("-metric-3-") ? "metric-holes" : null;
      return role ? { ...next, siteRole: role } : next;
    }
    if (next.siteRole) return next;
    if (next.type === "field") {
      if (next.id.endsWith("-holes")) return { ...next, siteRole: "holes" };
      if (next.id.endsWith("-players")) return { ...next, siteRole: "players" };
    }
    if (next.type === "button") {
      const roles = { reset: "reset-scores", excel: "export-excel", image: "export-image", html: "export-html" } as const;
      for (const [suffix, role] of Object.entries(roles)) if (next.id.endsWith(`-${suffix}`)) return { ...next, siteRole: role };
    }
    return next;
  });
}
