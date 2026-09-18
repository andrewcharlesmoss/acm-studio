import { readFileSync, writeFileSync } from "node:fs";
import { commandInventory } from "../app/studio/ribbon/catalogue-model.ts";
const path = new URL("../docs/ribbon-command-inventory.md", import.meta.url);
const escape = (text) => String(text ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
const content = "# Ribbon command inventory\n\nGenerated from the same typed definitions used by the tree, inspector and preview.\nRun node scripts/generate-ribbon-inventory.mjs from ACM Studio after an approved\ninventory change; use --check to verify without writing.\n\nProduct snapshots, hashes and verification are documented in [Ribbon Library](ribbon-library.md).\nThe component specimens are included to keep every demonstrated control discoverable.\n\n| Product | Stable command | Label | Kind | Icon and state alternatives | Conditions / states |\n| --- | --- | --- | --- | --- | --- |\n" +
  commandInventory.map((item) => [item.product,item.id,item.label,item.kind,[item.icon,...(item.iconVariants ?? [])].filter(Boolean).join(", ") || "Text only: " + item.textOnlyReason,[item.condition,item.disabled,...(item.states ?? [])].filter(Boolean).join("; ")].map(escape).join(" | ")).map((row) => "| " + row + " |").join("\n") + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(path,"utf8") !== content) throw new Error("Ribbon inventory documentation is stale.");
  console.log("Verified " + commandInventory.length + " command entries.");
} else {
  writeFileSync(path,content);
  console.log("Generated " + commandInventory.length + " command entries.");
}
