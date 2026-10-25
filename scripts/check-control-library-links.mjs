import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// These are document editing/rendering contracts, rather than ordinary UI fields.
export const specialisedFieldOwners = {
  "app/studio/studio-canvas.tsx": "Canonical code, appender, footnote, embed and authored form-block editors; search controls use SearchInput.",
  "app/studio/blocks/editors/rich-text.tsx": "Rich-text textarea owns selection, composition, auto-height and document history.",
  "app/studio/template-renderer.tsx": "Template title/subtitle fields inherit authored block presentation.",
  "app/studio/test-site/render.tsx": "Static local publication and password gate renderer.",
};
const primitives = new Set(["TextInput", "TextArea", "SelectControl", "SearchInput", "NumberInput", "CheckboxControl", "RangeControl"]);
// Only these native choice/range foundations own specialist input presentation.
export const specialisedChoiceOwners = {
  "app/studio/controls/checkbox-control.tsx": { checkbox: "Shared native CheckboxControl foundation." },
  "app/studio/controls/toggle-setting.tsx": { checkbox: "ToggleSetting retains its switch track and thumb." },
  "app/studio/controls/range-control.tsx": { range: "Shared RangeControl foundation." },
  "app/studio/controls/revision-slider.tsx": { range: "RevisionSlider owns chronological revision markers and value presentation." },
  "app/studio/controls/gradient-stop-colour.tsx": { range: "Hue and transparency require specialist colour tracks." },
};
export function inspectControlSource(source, file) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const linked = [], unlinked = [], exceptions = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
      if (primitives.has(tag)) linked.push({ file, line, control: tag });
      if (["input", "textarea", "select"].includes(tag)) {
        const type = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(tree) === "type");
        const dynamic = type?.initializer && !ts.isStringLiteral(type.initializer);
        const common = dynamic || tag !== "input" || !type || (type.initializer && ts.isStringLiteral(type.initializer) && ["text", "email", "url", "tel", "search", "number"].includes(type.initializer.text));
        const choiceType = tag === "input" && type?.initializer && ts.isStringLiteral(type.initializer) && ["checkbox", "range"].includes(type.initializer.text) ? type.initializer.text : null;
        if (choiceType) {
          const item = { file, line, control: choiceType };
          const reason = specialisedChoiceOwners[file]?.[choiceType];
          if (reason) exceptions.push({ ...item, reason });
          else unlinked.push(item);
        }
        if (common && file !== "app/studio/controls/native-fields.tsx") {
          const item = { file, line, control: tag };
          const passwordOwner = ["app/studio/blocks/inspectors/document-inspector.tsx"].includes(file)
            && dynamic && ts.isJsxExpression(type.initializer) && type.initializer.expression
            && ts.isConditionalExpression(type.initializer.expression)
            && [type.initializer.expression.whenTrue, type.initializer.expression.whenFalse].every(value => ts.isStringLiteral(value) && ["password", "text"].includes(value.text))
            && [type.initializer.expression.whenTrue, type.initializer.expression.whenFalse].some(value => value.text === "password");
          if (passwordOwner) exceptions.push({ ...item, reason: "Password visibility field retains its existing security-specific contract." });
          else if (specialisedFieldOwners[file]) exceptions.push({ ...item, reason: specialisedFieldOwners[file] });
          else unlinked.push(item);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { linked, unlinked, exceptions };
}
export function auditControlLibraryLinks(root) {
  const result = { linked: [], unlinked: [], exceptions: [] };
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith(".tsx") && !/ \d+\./.test(entry.name)) {
        const file = path.relative(root, absolute).split(path.sep).join("/");
        const found = inspectControlSource(fs.readFileSync(absolute, "utf8"), file);
        for (const key of Object.keys(result)) result[key].push(...found[key]);
      }
    }
  }
  walk(path.join(root, "app/studio"));
  return result;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const result = auditControlLibraryLinks(root);
  console.log(`${result.linked.length} shared field instances; ${result.exceptions.length} documented specialised fields; ${result.unlinked.length} unlinked ordinary fields.`);
  for (const item of result.unlinked) console.error(`${item.file}:${item.line} — native ${item.control} should use its shared control.`);
  process.exitCode = result.unlinked.length ? 1 : 0;
}
