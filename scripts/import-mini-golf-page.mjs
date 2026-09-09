// Read the public Mini Golf page and emit an apply_patch patch for its inert
// preview snapshot. No sibling project or hosted state is changed.
import { execFileSync } from "node:child_process";

const origin = "https://mini-golf-scorecard.andrewcharlesmoss.chatgpt.site";
const get = (url) => execFileSync("curl", ["--max-time", "30", "--fail", "--silent", "--show-error", url], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
let html = get(`${origin}/`);
if (!html.includes('class="score-panel"') && !html.includes('class="panel score-panel"')) throw new Error("The source is not the Mini Golf page.");
const stylesheet = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]*\/_next\/static\/css\/[^"]+)"/i)?.[1];
if (!stylesheet) throw new Error("The Mini Golf stylesheet was not found.");
const stylesheetUrl = new URL(stylesheet, origin);
if (stylesheetUrl.origin !== origin) throw new Error("Unexpected stylesheet origin.");
const css = get(stylesheetUrl.href).replace(/url\((["']?)(\/[^)'"\s]+)\1\)/g, (_match, _quote, url) => `url("${origin}${url}")`);
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
  .replace(/<link\b[^>]*>/gi, (tag) => /fonts\.googleapis\.com/.test(tag) ? tag : "")
  .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
  .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "")
  .replace(/\s(href|src)="\/([^"]*)"/g, (_match, attribute, path) => ` ${attribute}="${origin}/${path}"`)
  .replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; img-src ${origin} data:; font-src https://fonts.gstatic.com; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'">`)
  .replace("</head>", `<style>${css}</style><style>html{scrollbar-gutter:stable}body{min-height:100vh}[data-studio-selected]{outline:3px solid #5273ff!important;outline-offset:5px}button:disabled,input:disabled,select:disabled{opacity:1!important;cursor:default!important}</style></head>`);
if (/<script\b/i.test(html)) throw new Error("Scripts remain in snapshot.");
const target = "public/site-previews/mini-golf-scorecard.html";
process.stdout.write(`*** Begin Patch\n*** Add File: ${target}\n${html.split("\n").map((line) => `+${line}`).join("\n")}\n*** End Patch\n`);
