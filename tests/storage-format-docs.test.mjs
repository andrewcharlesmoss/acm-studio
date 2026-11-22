import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadProductionModule } from "./production-module.mjs";

const source = name => readFileSync(new URL(name, import.meta.url), "utf8");
const load = name => loadProductionModule(new URL(name, import.meta.url));

test("the recovery table identifies the current writer for each storage format", async () => {
  const docs = source("../docs/storage-formats.md");
  const rows = new Map(Array.from(docs.matchAll(/^\| ([^|]+?) \| ([.\d]+) \| [.\d]+ \|$/gm), match => [match[1], match[2]]));
  const { initialStudioWorkspace } = await load("../app/studio/editor-model.ts");
  const { PUBLICATION_VERSION } = await load("../app/studio/workspace-validation.ts");
  const { TEMPLATE_VERSION } = await load("../app/studio/template-model.ts");
  const { BLOCK_CLIPBOARD_VERSION } = await load("../app/studio/block-clipboard.ts");
  const { BACKUP_VERSION } = await load("../app/studio/backup-store.ts");
  const { BACKUP_ARCHIVE_VERSION } = await load("../app/studio/backup-archive.ts");
  const { CURRENT_TEST_SITE_VERSION } = await load("../app/studio/test-site/contract.ts");
  const { MEDIA_DATABASE_VERSION } = await load("../app/studio/media-database-migration.ts");

  // These two writers currently put the envelope version directly in their output.
  const literal = (file, pattern) => {
    const match = source(file).match(pattern);
    assert.ok(match, file);
    return match[1];
  };
  const versions = {
    "Browser workspace": initialStudioWorkspace.version,
    "Local publications": PUBLICATION_VERSION,
    "Template packages and stores": TEMPLATE_VERSION,
    "Block clipboard": BLOCK_CLIPBOARD_VERSION,
    "Full backup content": BACKUP_VERSION,
    "Binary backup container": BACKUP_ARCHIVE_VERSION,
    "Test and Test2 fixture source": CURRENT_TEST_SITE_VERSION,
    "Global template library": literal("../app/studio/global-template-contract.ts", /format: "acm-global-templates", version: (\d+), templates, migrations/),
    "Local fixture backup": literal("../app/studio/test-site/test-site-backup.tsx", /exportStudioJson\(\{ format: "acm-local-site-backup", version: (\d+)/),
    "Files IndexedDB": MEDIA_DATABASE_VERSION,
  };
  assert.equal(rows.size, Object.keys(versions).length);
  for (const [name, version] of Object.entries(versions)) assert.equal(rows.get(name), String(version), name);
});
