import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../app/studio/studio-prototype.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("studio-prototype.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ["confirmCodeEditorDiscard", "switchStudioMode", "selectLibraryKind", "selectDocument", "openTool"];
const declarations = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) declarations.push(node.getText(ast));
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "openTemplateTarget") declarations.push(`const ${node.getText(ast)};`);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.length, names.length + 1);
const code = ts.transpileModule(declarations.join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

// Execute the actual screen commands; state setters stand in for a React render.
function fixture({ dirty = false, discard = true, preview = false } = {}) {
  const calls = [];
  const state = { codeEditorDirty: dirty, previewWindow: preview, studioSection: "templates", libraryKind: "templates",
    activeDocument: { id: "post", kind: "post" }, inspectorTab: "block", templateInspectorTab: "block",
    selectedBlockId: "selected", documentFieldSelection: null, templateTarget: { setId: "set", targetId: "part" },
    window: { confirm() { calls.push(["confirm"]); return discard; } },
    writeStudioNavigation(...args) { calls.push(["navigate", ...args]); },
    documentCommands: { selectDocument(document) { calls.push(["document", document.id]); } },
    ...Object.fromEntries(["setCodeEditorDirty", "setInspectorTab", "setStudioSection", "setPreviewing", "setShowInserter", "setLibraryKind", "setTemplateTarget", "setDocumentFieldSelection", "setSelectedBlockId"].map(name => [name, value => calls.push([name, value])])),
  };
  const commands = new Function("state", `with (state) { ${code}; return { ${names.join(", ")}, openTemplateTarget }; }`)(state);
  return { commands, calls };
}

test("declined dirty-code navigation preserves screen, selection, document and URL", () => {
  for (const action of [commands => commands.switchStudioMode("content"), commands => commands.selectLibraryKind("page"), commands => commands.selectDocument({ id: "page", kind: "page" }), commands => commands.openTemplateTarget("other", "part"), commands => commands.openTool("backup")]) {
    const h = fixture({ dirty: true, discard: false }); action(h.commands);
    assert.deepEqual(h.calls, [["confirm"]]);
  }
});

test("accepted document selection asks about dirty code once and restores Content URL", () => {
  const h = fixture({ dirty: true });
  assert.equal(h.commands.selectDocument({ id: "page", kind: "page" }), true);
  assert.equal(h.calls.filter(call => call[0] === "confirm").length, 1);
  assert.ok(h.calls.some(call => call[0] === "navigate" && call[1] === "content"));
  assert.ok(h.calls.some(call => call[0] === "document" && call[1] === "page"));
  assert.ok(h.calls.some(call => call[0] === "setLibraryKind" && call[1] === "page"));
});

test("explicit template targets and library tabs use the same mode history owner", () => {
  const template = fixture(); template.commands.openTemplateTarget("chosen", "header");
  assert.deepEqual(template.calls.at(-1), ["navigate", "templates", { setId: "chosen", targetId: "header" }]);
  const tab = fixture(); tab.commands.selectLibraryKind("page");
  assert.deepEqual(tab.calls.at(-1), ["setLibraryKind", "page"]);
  assert.ok(tab.calls.some(call => call[0] === "navigate" && call[1] === "content"));
});

test("read-only preview browsing never writes an authoring navigation URL", () => {
  const h = fixture({ preview: true }); h.commands.switchStudioMode("templates"); h.commands.openTemplateTarget("chosen", "header");
  assert.ok(!h.calls.some(call => call[0] === "navigate"));
});

test("Backup and Bin use the same indexed navigation owner as Content and Templates", () => {
  const backup = fixture(); backup.commands.openTool("backup");
  assert.deepEqual(backup.calls, [["setStudioSection", "backup"], ["setPreviewing", false], ["navigate", "content"]]);
  const bin = fixture(); bin.commands.openTool("bin");
  assert.deepEqual(bin.calls.at(-1), ["navigate", "bin"]);
  assert.doesNotMatch(source, /window\.history\.(?:replaceState|pushState)/);
});

test("initial navigation state matches between server and browser hydration", () => {
  assert.match(source, /useState<StudioTemplateTarget>\(\{ setId: null, targetId: null \}\)/);
  assert.match(source, /useState<StudioDocumentKind \| "templates">\("page"\)/);
  assert.match(source, /useStudioScreenNavigation\(\{ setStudioSection, setLibraryKind, setPreviewing, setTemplateTarget/);
});
