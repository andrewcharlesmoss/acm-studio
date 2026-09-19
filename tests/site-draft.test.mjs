import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import test from "node:test";

function draftModules(writable = true) {
  const records = new Map([["acm-studio-workspace-v2", "existing draft"], ["acm-studio-publications-v1", "existing publication"]]);
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const exports = {};
    cache.set(name, exports);
    const source = ts.transpileModule(readFileSync(new URL(`../app/studio/${name}.ts`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(source, { exports, require: (id) => id === "./write-ownership" ? { studioWriteOwnership: { assertWritable() { if (!writable) throw new Error("read-only"); } } } : load(id.slice(2)), window: { localStorage: { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) } } });
    return exports;
  }
  return { ...load("mini-golf-draft"), records };
}

test("Mini Golf content and section order round-trip without touching the existing Studio", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, records } = draftModules();
  assert.equal(miniGolfDraftRepository.load(), null);
  const draft = structuredClone(initialMiniGolfDraft);
  draft.documents[0].title = "Our mini golf round";
  draft.documents[0].template = "wide";
  draft.documents[0].blocks.push({ id: "custom-note", type: "paragraph", text: "A note added in the shared editor." });
  draft.documents[0].blocks.reverse();
  miniGolfDraftRepository.save(draft);
  assert.equal(JSON.stringify(miniGolfDraftRepository.load()), JSON.stringify(draft));
  assert.equal(records.get("acm-studio-workspace-v2"), "existing draft");
  assert.equal(records.get("acm-studio-publications-v1"), "existing publication");
});

test("Mini Golf rejects foreign or damaged layout data and preserves unreadable saved bytes", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, validateMiniGolfDraft, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const wrong = structuredClone(initialMiniGolfDraft);
  wrong.documents[0].id = wrong.activeDocumentId = "other-site-home";
  assert.throws(() => validateMiniGolfDraft(wrong));
  const edited = structuredClone(initialMiniGolfDraft);
  edited.documents[0].blocks.pop();
  assert.doesNotThrow(() => validateMiniGolfDraft(edited));
  const damagedBlock = structuredClone(initialMiniGolfDraft);
  damagedBlock.documents[0].blocks[0].type = "unsupported";
  assert.throws(() => validateMiniGolfDraft(damagedBlock));
  const duplicated = structuredClone(initialMiniGolfDraft);
  duplicated.documents[0].blocks[0] = duplicated.documents[0].blocks[1];
  assert.throws(() => validateMiniGolfDraft(duplicated));
  records.set(MINI_GOLF_DRAFT_KEY, "{damaged");
  assert.throws(() => miniGolfDraftRepository.load());
  assert.equal(records.get(MINI_GOLF_DRAFT_KEY), "{damaged");
});

test("a read-only Studio cannot save a Mini Golf draft", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules(false);
  assert.throws(() => miniGolfDraftRepository.save(initialMiniGolfDraft), /read-only/);
  assert.equal(records.has(MINI_GOLF_DRAFT_KEY), false);
});

test("Mini Golf staging and production page drafts remain separate", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, miniGolfStagingDraftRepository } = draftModules();
  const staging = structuredClone(initialMiniGolfDraft);
  staging.documents[0].title = "Staging only";
  miniGolfStagingDraftRepository.save(staging);
  assert.equal(miniGolfDraftRepository.load(), null);
  miniGolfDraftRepository.save(initialMiniGolfDraft);
  assert.equal(miniGolfStagingDraftRepository.load().documents[0].title, "Staging only");
  assert.equal(miniGolfDraftRepository.load().documents[0].title, "Mini Golf Scorecard");
});

test("Mini Golf staging is the primary working copy while production stays a reference", () => {
  const registry = readFileSync(new URL("../app/studio/site-registry.ts", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../app/studio/studio-dashboard.tsx", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../app/studio/mini-golf-site-editor.tsx", import.meta.url), "utf8");
  assert.match(registry, /miniGolfSites = \[miniGolfStagingSite, miniGolfSite\]/);
  assert.match(dashboard, /Primary working draft/);
  assert.match(dashboard, /Production reference/);
  assert.match(editor, /Staging is the working copy for this build/);
  assert.match(editor, /Production remains separate until an explicit synchronisation is reviewed/);
});

test("the inherited page retains the real scorecard and styles without executable scripts", () => {
  const html = readFileSync(new URL("../public/site-previews/mini-golf-scorecard.html", import.meta.url), "utf8");
  assert.match(html, /class="panel score-panel"/);
  assert.match(html, /class="summary-grid"/);
  assert.match(html, /Enter your scores/);
  assert.match(html, /mini-golf-course-background\.png/);
  assert.match(html, /All Rights Reserved/);
  assert.match(html, /script-src 'none'/);
  assert.doesNotMatch(html, /<script\b|<iframe\b|\son[a-z]+\s*=/i);
});

test("explicit section headings including original labels survive saving", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  draft.documents[0].blocks.find((block) => block.id === "scorecard").data.heading = "Scorecard";
  draft.documents[0].blocks.find((block) => block.id === "leaderboard").data.player1 = "Leaderboard";
  miniGolfDraftRepository.save(draft);
  assert.equal(miniGolfDraftRepository.load().documents[0].blocks.find((block) => block.id === "scorecard").data.heading, "Scorecard");
  assert.equal(miniGolfDraftRepository.load().documents[0].blocks.find((block) => block.id === "leaderboard").data.player1, "Leaderboard");
});

test("Mini Golf uses the canonical shared block editor", () => {
  const mainEditor = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
  const siteEditor = readFileSync(new URL("../app/studio/mini-golf-site-editor.tsx", import.meta.url), "utf8");
  assert.match(mainEditor, /from ["']\.\/studio-editor["']/);
  assert.match(siteEditor, /from ["']\.\/studio-editor["']/);
  assert.match(siteEditor, /useStudioWorkspace\([^;]+validateMiniGolfDraft\)/s);
  assert.doesNotMatch(siteEditor, /MiniGolfInheritedPage|mini-golf-inherited-page/);
  const presentation = readFileSync(new URL("../app/studio/mini-golf-presentation.tsx", import.meta.url), "utf8");
  assert.match(siteEditor, /miniGolfPresentation/);
  assert.match(presentation, /0d2df8bd31f277df31522aa47ca6bf785888c460/);
  assert.match(presentation, /mini-golf-scorecard-panel/);
});

test("the current Mini Golf draft exposes each page section as nested blocks", () => {
  const { initialMiniGolfDraft } = draftModules();
  const blocks = initialMiniGolfDraft.documents[0].blocks;
  assert.equal(JSON.stringify(blocks.map((block) => [block.type, block.role])), JSON.stringify([
    ["section", "hero"], ["section", "account"], ["section", "setup"], ["section", "scorecard"], ["section", "leaderboard"], ["section", "share"], ["section", "footer"],
  ]));
  const scorecard = blocks.find((block) => block.role === "scorecard");
  assert.equal(scorecard.children.some((child) => child.type === "table"), true);
  assert.equal(scorecard.source.exportName, "ScoreTable");
});

test("Mini Golf migrates the earlier four-section draft into typed layout blocks", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const legacy = structuredClone(initialMiniGolfDraft);
  legacy.documents[0].blocks = [
    { id: "setup", type: "heading", level: 2, text: "Game setup" },
    { id: "setup-details", type: "paragraph", text: "Course holes · 9 holes · Players · 2 players" },
    { id: "scorecard", type: "heading", level: 2, text: "Enter your scores" },
    { id: "scorecard-table", type: "table", rows: [["Hole", "Player 1", "Player 2", "Total"], ["1", "", "", "—"]], hasHeader: true },
    { id: "leaderboard", type: "heading", level: 2, text: "Leaderboard" },
    { id: "leaderboard-summary", type: "list", style: "unordered", items: ["Player 1 · — strokes", "Player 2 · — strokes"] },
    { id: "share", type: "heading", level: 2, text: "Ready to share?" },
    { id: "share-actions", type: "paragraph", text: "Download for Excel · Copy Screenshot · Copy as HTML" },
  ];
  legacy.documents[0].blocks.reverse();
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 1, workspace: legacy }));
  const migrated = miniGolfDraftRepository.load();
  assert.equal(migrated.documents[0].blocks.length, 6);
  assert.equal(migrated.documents[0].blocks[1].id, "share");
  assert.equal(migrated.documents[0].blocks[1].type, "section");
  assert.equal(migrated.documents[0].blocks[4].id, "setup");
  assert.match(migrated.documents[0].blocks[1].data.legacy, /share-actions/);
  const scorecard = migrated.documents[0].blocks.find((block) => block.id === "scorecard");
  assert.equal(scorecard.type, "section");
  assert.equal(scorecard.children.find((child) => child.id === "scorecard-table").type, "table");
});

test("a version 2 Mini Golf draft does not reinsert blocks that were deliberately removed", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const edited = structuredClone(initialMiniGolfDraft);
  edited.documents[0].blocks = edited.documents[0].blocks.filter((block) => ["setup", "scorecard", "leaderboard", "share"].includes(block.id));
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 2, workspace: edited }));
  assert.equal(miniGolfDraftRepository.load().documents[0].blocks.some((block) => block.id === "account"), false);
});

test("Mini Golf component migrations retain legacy block data and reject unsafe sizes", () => {
  const { initialMiniGolfDraft, validateMiniGolfDraft } = draftModules();
  const migrated = structuredClone(initialMiniGolfDraft);
  migrated.documents[0].blocks[1].data.holes = 999;
  assert.throws(() => validateMiniGolfDraft(migrated));
  const preserved = structuredClone(initialMiniGolfDraft);
  preserved.documents[0].blocks[1].data.legacy = JSON.stringify([{ id: "scorecard-table", type: "table", rows: [["Hole", "Player"]], columnWidths: [40, 60] }]);
  assert.doesNotThrow(() => validateMiniGolfDraft(preserved));
});

test("version 3 component drafts do not reinterpret later user blocks", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const current = structuredClone(initialMiniGolfDraft);
  current.documents[0].blocks.push({ id: "setup-note", type: "paragraph", text: "A deliberate note" });
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 3, workspace: current }));
  const loaded = miniGolfDraftRepository.load();
  assert.equal(loaded.documents[0].blocks.at(-1).id, "setup-note");
});

test("scorecard migration preserves an existing heading child without duplicate IDs", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const current = structuredClone(initialMiniGolfDraft);
  const scorecard = current.documents[0].blocks.find((block) => block.id === "scorecard");
  current.documents[0].blocks = current.documents[0].blocks.map((block) => block.id === "scorecard"
    ? { id: "scorecard", type: "component", component: "mini-golf-scorecard", data: scorecard.data, children: [{ id: "scorecard-heading", type: "heading", level: 2, text: "Custom scores" }] }
    : block);
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 3, workspace: current }));
  const loaded = miniGolfDraftRepository.load();
  const migrated = loaded.documents[0].blocks.find((block) => block.id === "scorecard");
  assert.equal(migrated.type, "section");
  assert.equal(migrated.children.length, 1);
  assert.equal(migrated.children[0].children[0].id, "scorecard-heading");
});

test("version 4 component migrations preserve explicitly empty child lists", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const current = structuredClone(initialMiniGolfDraft);
  current.documents[0].blocks = current.documents[0].blocks.map((block) => block.id === "account"
    ? { id: "account", type: "component", component: "mini-golf-account", data: {}, children: [] }
    : block);
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 4, workspace: current }));
  const loaded = miniGolfDraftRepository.load();
  const account = loaded.documents[0].blocks.find((block) => block.id === "account");
  assert.equal(account.type, "section");
  assert.equal(account.children.some((block) => block.type === "button"), false);
  assert.equal(account.children[0].children.some((block) => block.siteRole === "status"), false);
});

test("source inventory includes application code and images but excludes private and generated files", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../public/site-previews/mini-golf-files.json", import.meta.url), "utf8"));
  assert.equal(snapshot.siteId, "mini-golf-scorecard");
  const page = snapshot.files.find((file) => file.path === "app/page.tsx");
  assert.match(page.content, /GameSetup/);
  assert.ok(snapshot.files.some((file) => file.path === "app/globals.css"));
  const image = snapshot.files.find((file) => file.path === "public/images/mini-golf-course-background.png");
  assert.equal(image.kind, "image");
  assert.equal(Buffer.from(image.data, "base64").length, image.size);
  assert.equal(snapshot.files.some((file) => /(^|\/)(?:\.env|node_modules|dist|\.git|\.wrangler)(\/|\.|$)/.test(file.path)), false);
  assert.equal(new Set(snapshot.files.map((file) => file.path)).size, snapshot.files.length);
});

test("source importer permits intended source only and rejects token literals", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "studio-files-test-"));
  try {
    execFileSync("git", ["init", "-q", directory]);
    execFileSync("git", ["-C", directory, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-qm", "Fixture"]);
    mkdirSync(path.join(directory, "app"));
    writeFileSync(path.join(directory, "app/page.tsx"), "export const title = 'Mini golf';");
    writeFileSync(path.join(directory, "credentials.json"), "private fixture");
    writeFileSync(path.join(directory, "app/service-account.json"), "private fixture");
    writeFileSync(path.join(directory, "app/secret.json"), "private fixture");
    writeFileSync(path.join(directory, ".netrc"), "private fixture");
    const script = new URL("../scripts/import-mini-golf-files.mjs", import.meta.url).pathname;
    const output = execFileSync(process.execPath, [script, directory], { encoding: "utf8" });
    assert.match(output, /app\/page.tsx/);
    assert.doesNotMatch(output, /private fixture|credentials\.json|service-account\.json|\.netrc/);
    for (const content of [
      `export const token = '${"ghp_" + "a".repeat(36)}';`,
      `API_KEY=${"a".repeat(32)}`,
      `export const secret = '${"b".repeat(32)}';`,
      'DATABASE_URL="postgres://fixture:private@localhost/example"',
    ]) {
      writeFileSync(path.join(directory, "app/config.ts"), content);
      const filtered = execFileSync(process.execPath, [script, directory], { encoding: "utf8" });
      assert.match(filtered, /Contents withheld: potential credential detected/);
      assert.equal(filtered.includes(content), false);
      assert.doesNotMatch(filtered, /aaaaaaaaaaaaaaaaaaaaaaaa|bbbbbbbbbbbbbbbbbbbbbbbb|fixture:private/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});


test("version 5 transitional scorecard groups recover their table and become editable sections", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  const section = draft.documents[0].blocks.find((block) => block.id === "scorecard");
  section.type = "group";
  delete section.role;
  section.children = [{ id: "scorecard-heading", type: "heading", level: 2, text: "Our scores" }];
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 5, workspace: draft }));
  const loaded = miniGolfDraftRepository.load();
  const scorecard = loaded.documents[0].blocks.find((block) => block.id === "scorecard");
  assert.equal(scorecard.type, "section");
  assert.equal(scorecard.role, "scorecard");
  assert.equal(scorecard.children[0].children[0].text, "Our scores");
  assert.equal(scorecard.children.find((block) => block.type === "table").rows.length, 11);
  miniGolfDraftRepository.save(loaded);
  assert.equal(JSON.parse(records.get(MINI_GOLF_DRAFT_KEY)).version, 10);
  assert.equal(JSON.stringify(miniGolfDraftRepository.load()), JSON.stringify(loaded));
});

test("current section drafts retain deleted score tables and arbitrary authored columns", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  const section = draft.documents[0].blocks.find((block) => block.id === "scorecard");
  const table = section.children.find((block) => block.type === "table");
  table.rows = [["Hole", "Ada", "Bo", "Cy", "Total"], ["1", "2", "3", "4", "9"], ["Total", "2", "3", "4", "9"]];
  table.columnWidths = [10, 25, 25, 25, 15];
  miniGolfDraftRepository.save(draft);
  assert.equal(JSON.stringify(miniGolfDraftRepository.load()), JSON.stringify(draft));
  section.children = section.children.filter((block) => block.type !== "table");
  miniGolfDraftRepository.save(draft);
  assert.equal(miniGolfDraftRepository.load().documents[0].blocks.find((block) => block.id === "scorecard").children.some((block) => block.type === "table"), false);
});

test("version 7 is a complete typed page and preserves all source-leaf deletions on reload", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  const footer = draft.documents[0].blocks.find((block) => block.role === "footer");
  footer.children = [];
  draft.documents[0].blocks = draft.documents[0].blocks.filter((block) => block.role !== "hero");
  const scorecard = draft.documents[0].blocks.find((block) => block.role === "scorecard");
  scorecard.children = scorecard.children.filter((block) => block.type === "table");
  miniGolfDraftRepository.save(draft);
  assert.equal(JSON.stringify(miniGolfDraftRepository.load()), JSON.stringify(draft));
});

test("version 6 conversion preserves authored names, metadata, removed sections and colliding IDs", () => {
  const { initialMiniGolfDraft, miniGolfDraftRepository, MINI_GOLF_DRAFT_KEY, records } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  draft.documents[0].title = "Our club";
  draft.documents[0].subtitle = "Custom subtitle";
  draft.documents[0].blocks = [{ id: "hero", type: "paragraph", text: "Unrelated block" }, { id: "leaderboard", type: "section", role: "leaderboard", layout: "stack", children: [{ id: "player", type: "paragraph", text: "Ada · 12 strokes · Average 3 · Std deviation 1 · Holes played 4 / 9" }] }];
  records.set(MINI_GOLF_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 6, workspace: draft }));
  const loaded = miniGolfDraftRepository.load();
  const blocks = loaded.documents[0].blocks;
  assert.equal(blocks[0].role, "hero");
  assert.notEqual(blocks[0].id, "hero");
  assert.equal(blocks[1].text, "Unrelated block");
  assert.equal(blocks.some((block) => block.role === "account"), false);
  const flatten = (blocks) => blocks.flatMap((block) => [block, ...flatten(block.children ?? [])]);
  const all = flatten(blocks);
  assert.equal(new Set(all.map((block) => block.id)).size, all.length);
  assert.equal(all.find((block) => block.siteRole === "title").text, "Our club");
  assert.equal(all.find((block) => block.siteRole === "player-name").text, "Ada");
  assert.equal(all.find((block) => block.siteRole === "score-value").text, "12");
  assert.equal(all.find((block) => block.siteRole === "metric-average").text, "3");
  miniGolfDraftRepository.save(loaded);
  assert.equal(JSON.stringify(miniGolfDraftRepository.load()), JSON.stringify(loaded));
});


test("v8 staging defaults update only untouched account actions and persist explicit New Game roles", () => {
  const { initialMiniGolfDraft, miniGolfStagingDraftRepository, MINI_GOLF_STAGING_DRAFT_KEY, records } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  const account = draft.documents[0].blocks.find((block) => block.role === "account");
  records.set(MINI_GOLF_STAGING_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 7, workspace: draft }));
  const loaded = miniGolfStagingDraftRepository.load();
  const action = loaded.documents[0].blocks.find((block) => block.role === "account").children.find((block) => block.type === "button");
  assert.equal(action.label, "Continue with ACM Account");
  assert.equal(action.url, "/api/auth/choose");
  assert.equal(loaded.documents[0].blocks.find((block) => block.role === "setup").children.find((block) => block.label === "New Game").siteRole, "new-game");
  account.children.find((block) => block.type === "button").label = "Custom sign-in";
  records.set(MINI_GOLF_STAGING_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 7, workspace: draft }));
  assert.equal(miniGolfStagingDraftRepository.load().documents[0].blocks.find((block) => block.role === "account").children.find((block) => block.type === "button").label, "Custom sign-in");
});


test("v9 fills only missing footer link labels in existing v8 drafts without repeating account migration", () => {
  const { initialMiniGolfDraft, miniGolfStagingDraftRepository, MINI_GOLF_STAGING_DRAFT_KEY, records } = draftModules();
  const draft = structuredClone(initialMiniGolfDraft);
  const links = draft.documents[0].blocks.find((block) => block.role === "footer").children.find((block) => block.role === "footer-links");
  delete links.data;
  const originalChildren = JSON.stringify(links.children);
  records.set(MINI_GOLF_STAGING_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 8, workspace: draft }));
  const loaded = miniGolfStagingDraftRepository.load();
  const repaired = loaded.documents[0].blocks.find((block) => block.role === "footer").children.find((block) => block.role === "footer-links");
  assert.equal(repaired.data.ariaLabel, "Mini Golf Scorecard links");
  assert.equal(JSON.stringify(repaired.children), originalChildren);
  assert.equal(loaded.documents[0].blocks.find((block) => block.role === "account").children.find((block) => block.type === "button").label, "Sign in with ACM Account");
  links.data = { ariaLabel: "Our custom links" };
  records.set(MINI_GOLF_STAGING_DRAFT_KEY, JSON.stringify({ format: "mini-golf-page-draft", version: 8, workspace: draft }));
  assert.equal(miniGolfStagingDraftRepository.load().documents[0].blocks.find((block) => block.role === "footer").children.find((block) => block.role === "footer-links").data.ariaLabel, "Our custom links");
});
