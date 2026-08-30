import assert from "node:assert/strict";
import test from "node:test";
import { CODE_LANGUAGE_OPTIONS, highlightCode, isKnownCodeLanguage, normaliseCodeLanguage } from "../app/content/code-highlighting.mjs";

test("offers the initial practical code language set", () => {
  assert.deepEqual(CODE_LANGUAGE_OPTIONS.map((option) => option.value), [
    "text", "javascript", "typescript", "html", "css", "json", "markdown", "python", "bash", "sql", "yaml", "java", "csharp", "cpp", "php", "go",
  ]);
});

test("normalises common aliases while treating unknown languages as plain text", () => {
  assert.equal(normaliseCodeLanguage("JS"), "javascript");
  assert.equal(normaliseCodeLanguage("c#"), "csharp");
  assert.equal(normaliseCodeLanguage("excel"), "text");
  assert.equal(isKnownCodeLanguage("yml"), true);
  assert.equal(isKnownCodeLanguage("excel"), false);
});

test("highlights supported languages and safely escapes plain or unknown code", () => {
  const snippets = {
    javascript: "const answer = true;",
    typescript: "const answer: boolean = true;",
    html: "<button>Save</button>",
    css: ".button { color: red; }",
    json: '{"enabled": true}',
    markdown: "# Heading",
    python: "def hello():\n    return True",
    bash: "echo \"hello\"",
    sql: "SELECT * FROM users;",
    yaml: "enabled: true",
    java: "public class Demo {}",
    csharp: "public class Demo {}",
    cpp: "int main() { return 0; }",
    php: "<?php echo 'hello';",
    go: "package main",
  };
  for (const [language, code] of Object.entries(snippets)) {
    const result = highlightCode(code, language);
    assert.equal(result.language, language);
    assert.equal(result.highlighted, true);
  }

  const raw = "<script>alert('unsafe')</script>\n  keep spacing";
  const plain = highlightCode(raw, "text");
  const unknown = highlightCode(raw, "excel");
  assert.equal(plain.highlighted, false);
  assert.equal(unknown.language, "text");
  assert.equal(unknown.html, plain.html);
  assert.match(plain.html, /&lt;script&gt;/);
  assert.doesNotMatch(plain.html, /<script>/);
  assert.match(plain.html, /keep spacing/);
});
