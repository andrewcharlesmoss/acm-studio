import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

export const CODE_LANGUAGE_OPTIONS = [
  { value: "text", label: "Plain text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "bash", label: "Bash" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "php", label: "PHP" },
  { value: "go", label: "Go" },
];

const languageAliases = {
  text: "text",
  plain: "text",
  plaintext: "text",
  "plain-text": "text",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  html: "html",
  xml: "html",
  svg: "html",
  css: "css",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  python: "python",
  py: "python",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  java: "java",
  csharp: "csharp",
  "c#": "csharp",
  cpp: "cpp",
  "c++": "cpp",
  php: "php",
  go: "go",
  golang: "go",
};

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("php", php);
hljs.registerLanguage("python", python);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("yaml", yaml);

export function normaliseCodeLanguage(language) {
  const key = (language ?? "text").trim().toLowerCase();
  return languageAliases[key] ?? "text";
}

export function isKnownCodeLanguage(language) {
  const key = (language ?? "text").trim().toLowerCase();
  return key in languageAliases;
}

export function highlightCode(code, language) {
  const normalisedLanguage = normaliseCodeLanguage(language);
  if (normalisedLanguage === "text") return { language: "text", html: escapeHtml(code), highlighted: false };
  try {
    return {
      language: normalisedLanguage,
      html: hljs.highlight(code, { language: normalisedLanguage, ignoreIllegals: true }).value,
      highlighted: true,
    };
  } catch {
    return { language: "text", html: escapeHtml(code), highlighted: false };
  }
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
