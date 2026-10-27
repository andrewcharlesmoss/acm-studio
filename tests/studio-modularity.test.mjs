import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

test("keeps Studio commands behind focused hooks", async () => {
  const [coordinator, workspace, documents, blocks, media, publishing] = await Promise.all([
    readFile(new URL("app/studio/studio-prototype.tsx", root), "utf8"),
    readFile(new URL("app/studio/use-studio-workspace.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-document-commands.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-block-commands.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-media.ts", root), "utf8"),
    readFile(new URL("app/studio/use-studio-publishing.ts", root), "utf8"),
  ]);

  assert.match(coordinator, /useStudioDocumentCommands/);
  assert.match(coordinator, /useStudioBlockCommands/);
  assert.match(coordinator, /useStudioMedia/);
  assert.match(coordinator, /useStudioPublishing/);
  assert.doesNotMatch(coordinator, /getMediaAsset|function updateBlock|function moveBlockTo/);
  assert.match(workspace, /setSaveLabel/);
  assert.match(documents, /publications\.unpublish/);
  assert.match(documents, /moveDocumentToBin/);
  assert.doesNotMatch(documents, /deleteDocumentFromWorkspace/);
  assert.match(blocks, /function insertBlock/);
  assert.match(media, /URL\.revokeObjectURL/);
  assert.match(publishing, /browserPublishingRepository/);
  // Size alone is not a boundary: the shell now coordinates fixture sites and revisions.
  for (const boundary of ["useTestSite", "useTestSiteContext", "useGlobalTemplates", "DocumentRevisionsControl", "restoreCurrentDocumentRevision"]) assert.ok(coordinator.includes(boundary), boundary);
  assert.doesNotMatch(coordinator, /localStorage\.setItem|new BroadcastChannel|indexedDB\.open|function validateStudioWorkspace|function restoreDocumentRevision|function createStudioTransaction/);
  const tree = ts.createSourceFile("studio-prototype.tsx", coordinator, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const shell = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "StudioPrototype");
  assert.ok(shell, "The screen coordinator remains an explicit component");
  assert.ok(shell.getText(tree).split("\n").length < 600, "Keep the expanded screen coordinator bounded; persistence and domain implementations belong to their modules");
});

test("keeps public, Studio, media and backup styles in separate files", async () => {
  const [publicStyles, studioStyles, mediaStyles, backupStyles, responsiveStyles] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/studio/studio.css", root), "utf8"),
    readFile(new URL("app/studio/media.css", root), "utf8"),
    readFile(new URL("app/studio/backup.css", root), "utf8"),
    readFile(new URL("app/studio/responsive.css", root), "utf8"),
  ]);

  assert.doesNotMatch(publicStyles, /\.studio-shell|\.media-manager|\.backup-manager/);
  assert.match(studioStyles, /\.studio-shell/);
  assert.match(mediaStyles, /\.media-manager/);
  assert.match(backupStyles, /\.backup-manager/);
  assert.match(responsiveStyles, /@media \(max-width: 900px\)/);
});
