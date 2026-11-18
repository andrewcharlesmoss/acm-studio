import { iconGeometry, iconMetadata } from "../dist/index.js";
import { macModifierCaptions } from "./keyboard-modifier-captions.js";

const both = ["mac", "windows"];
const key = (id, icon, label, platforms = both, shape = "square", group = "Typing", note = `${label} key for the UK ISO layout.`, aliases = []) => ({ id, icon: icon.includes(".") ? icon : `keyboard.${icon}`, label, platforms, shape, group, note, ...(aliases.length ? { aliases } : {}) });
const legend = (id, label, group = "Typing", shape = "square", aliases = []) => key(id, id, label, both, shape, group, `UK keyboard legend: ${label}.`, aliases);

/** Complete common UK ISO key families; hardware-specific rows are called out in their notes. */
export const keyboardKeys = [
  ..."abcdefghijklmnopqrstuvwxyz".split("").map((letter) => legend(`letter-${letter}`, letter.toUpperCase())),
  ...[
    ["one", "1 / !"], ["two", "2 / \""], ["three", "3 / £"], ["four", "4 / $"], ["five", "5 / %"],
    ["six", "6 / ^"], ["seven", "7 / &"], ["eight", "8 / *"], ["nine", "9 / ("], ["zero", "0 / )"],
  ].flatMap(([id, label]) => {
    if (id === "two") return [
      key("digit-two", "digit-two", label, ["windows"], "square", "Number row", "UK Windows number 2 and shifted double quotation mark."),
      key("mac-digit-two", "mac-digit-two", "2 / @", ["mac"], "square", "Number row", "UK Mac number 2 with @ on Shift and a small euro secondary legend.", ["2", "@", "€", "at", "euro"]),
    ];
    if (id === "three") return [
      key("digit-three", "digit-three", label, ["windows"], "square", "Number row", "UK Windows number 3 and shifted pound sign."),
      key("mac-digit-three", "mac-digit-three", "3 / £", ["mac"], "square", "Number row", "UK Mac number 3 with pound on Shift and a small hash secondary legend.", ["3", "£", "#", "hash", "pound"]),
    ];
    return [legend(`digit-${id}`, label, "Number row")];
  }),
  ...[
    ["backtick", "` / ¬ / ¦"], ["minus", "- / _"], ["equals", "= / +"], ["left-bracket", "[ / {"], ["right-bracket", "] / }"],
    ["semicolon", "; / :"], ["apostrophe", "' / @"], ["hash", "# / ~"], ["backslash", "\\ / |"],
    ["comma", ", / <"], ["period", ". / >"], ["slash", "/ / ?"],
  ].flatMap(([id, label, group = "Punctuation"]) => {
    if (id === "backtick") return [key("punct-backtick", "punct-backtick", label, ["windows"], "square", group, "Windows UK top-left key with grave, shifted not and AltGr broken-bar legends; not the Mac British/Irish marking.", ["grave", "not", "broken bar", "altgr"])];
    if (id === "apostrophe") return [
      key("punct-apostrophe", "punct-apostrophe", label, ["windows"], "square", group, "UK Windows apostrophe key with @ on Shift."),
      key("mac-punct-apostrophe", "mac-punct-apostrophe", "' / \"", ["mac"], "square", group, "UK Mac apostrophe key with double quotation mark on Shift.", ["'", "\"", "quote", "apostrophe"]),
    ];
    return [legend(`punct-${id}`, label, group)];
  }),
  key("mac-punct-section", "mac-punct-section", "§ / ±", ["mac"], "square", "Punctuation", "Apple British/Irish top-left key uses Section and Plus-Minus legends."),
  key("mac-punct-backtick", "mac-punct-backtick", "` / ~", ["mac"], "square", "Punctuation", "Mac British/Irish grave and tilde legends; layout variants exist."),
  ...[
    key("shift", "shift", "Shift", both, "shift-left", "Modifiers"),
    key("enter", "enter", "Return / Enter", both, "iso", "Editing", "Tall ISO Return on UK keyboards; labelled Return on Mac and Enter on Windows."),
    key("command", "mac-command", "Command", ["mac"], "wide", "Modifiers"),
    key("option", "mac-option", "Option", ["mac"], "wide", "Modifiers"),
    key("control", "control", "Ctrl", ["windows"], "wide", "Modifiers", "Windows Control modifier. Ctrl lettering uses Inter outlines."),
    key("windows", "windows", "Windows", ["windows"], "square", "Modifiers", "Windows modifier, represented by a four-pane mark; not an official brand asset."),
    key("mac-control", "mac-control-left", "Control", ["mac"], "wide", "Modifiers"),
    key("windows-alt", "alt", "Alt", ["windows"], "wide", "Modifiers"),
    key("windows-control-left", "control", "Left Ctrl", ["windows"], "wide", "Modifiers"),
    key("windows-control-right", "control", "Right Ctrl", ["windows"], "wide", "Modifiers"),
    key("windows-alt-left", "alt", "Left Alt", ["windows"], "wide", "Modifiers"),
    key("windows-alt-right", "alt", "Right Alt", ["windows"], "wide", "Modifiers"),
    key("windows-altgr", "altgr", "AltGr", ["windows"], "wide", "Modifiers", "Right Alt is labelled AltGr on the UK Windows layout.", ["right alt", "alternate graphic"]),
    key("windows-left", "windows", "Left Windows", ["windows"], "square", "Modifiers"),
    key("windows-right", "windows", "Right Windows", ["windows"], "square", "Modifiers"),
    key("mac-control-right", "mac-control-right", "Right Control", ["mac"], "wide", "Modifiers"),
    key("mac-option-left", "mac-option-left", "Left Option", ["mac"], "wide", "Modifiers"),
    key("mac-command-left", "mac-command-left", "Left Command", ["mac"], "wide", "Modifiers"),
    key("mac-option-right", "mac-option-right", "Right Option", ["mac"], "wide", "Modifiers"),
    key("mac-command-right", "mac-command-right", "Right Command", ["mac"], "wide", "Modifiers"),
    key("mac-shift-left", "mac-shift", "Left Shift", ["mac"], "shift-left", "Modifiers"),
    key("mac-shift-right", "mac-shift", "Right Shift", ["mac"], "shift-right", "Modifiers"),
    key("windows-shift-left", "shift", "Left Shift", ["windows"], "shift-left", "Modifiers"),
    key("windows-shift-right", "shift", "Right Shift", ["windows"], "shift-right", "Modifiers"),
    legend("caps-lock", "Caps Lock", "Modifiers", "wide"),
    legend("tab", "Tab", "Editing", "wide"), legend("escape", "Esc", "Editing", "wide"),
    key("backspace", "backspace", "Backspace", ["windows"], "backspace", "Editing"), key("delete-forward", "delete-forward", "Delete", ["windows"], "backspace", "Editing"),
    legend("space", "Space", "Editing", "spacebar"),
    legend("arrow-up", "↑", "Navigation"), legend("arrow-down", "↓", "Navigation"),
    legend("arrow-left", "←", "Navigation"), legend("arrow-right", "→", "Navigation"),
    key("insert", "insert", "Insert", ["windows"], "wide", "Navigation"), legend("home", "Home", "Navigation", "wide"),
    legend("page-up", "Page Up", "Navigation", "wide"), legend("end", "End", "Navigation", "wide"),
    legend("page-down", "Page Down", "Navigation", "wide"), key("print-screen", "print-screen", "Print Screen", ["windows"], "wide", "Navigation"),
    key("scroll-lock", "scroll-lock", "Scroll Lock", ["windows"], "wide", "Navigation"), key("pause-break", "pause-break", "Pause Break", ["windows"], "wide", "Navigation"),
    key("context-menu", "context-menu", "Context Menu", ["windows"], "square", "Navigation", "Windows Context Menu key shown with a menu-key symbol.", ["menu", "application menu"]),
    ...Array.from({ length: 12 }, (_, index) => key(`f${index + 1}`, `function-${["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"][index]}`, `F${index + 1}`, both, "square", "Function row", `Function key F${index + 1}.`)),
    ..."0123456789".split("").map((digit) => key(`keypad-${digit}`, `keypad-${["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][Number(digit)]}`, digit, both, digit === "0" ? "keypad-zero" : "square", "Numeric keypad", `Numeric keypad ${digit} key.`)),
    ...[
      ["keypad-decimal", "."], ["keypad-divide", "/"], ["keypad-multiply", "×"], ["keypad-subtract", "−"], ["keypad-add", "+"], ["keypad-enter", "Enter"], ["num-lock", "Num Lock"], ["keypad-equals", "="],
    ].map(([id, label]) => id === "num-lock"
      ? key(id, id, label, ["windows"], "square", "Numeric keypad")
      : legend(id, label, "Numeric keypad", id === "keypad-enter" || id === "keypad-add" ? "tall" : "square")),
    key("fn-globe", "mac-fn-globe", "Fn / Globe", ["mac"], "wide", "Mac keys", "Apple Fn or Globe marking. Function-row legends vary between keyboard models."),
    key("touch-id", "mac-touch-id", "Touch ID", ["mac"], "square", "Mac keys", "Touch ID sensor mark on supported Mac keyboards; hardware varies.", ["fingerprint", "biometric"]),
    key("power", "mac-power", "Power", ["mac"], "square", "Mac keys", "Power key marking on supported Mac keyboards; hardware varies."),
    key("copilot", "copilot", "Copilot", ["windows"], "square", "Windows keys", "Optional Copilot key on some Windows keyboards; placement and firmware behaviour vary."),
    key("windows-fn", "fn", "Fn", ["windows"], "wide", "Windows keys", "Optional laptop Fn key; its marking varies by manufacturer."),
    key("windows-menu", "context-menu", "Context Menu", ["windows"], "square", "Windows keys", "Windows Context Menu key where present; some keyboards replace it with Copilot.", ["menu", "application menu"]),
    key("mac-delete", "mac-backspace", "Delete", ["mac"], "backspace", "Mac keys", "Mac Delete key, which acts as Backspace in text fields."),
    key("mac-forward-delete", "mac-delete-forward", "Forward Delete", ["mac"], "backspace", "Mac keys"),
    key("mac-keypad-clear", "clear", "Clear", ["mac"], "square", "Numeric keypad", "Clear key on some Mac numeric keypads; marking varies by model."),
    ...[
      ["brightness-down", "F1 · Brightness Down"], ["brightness-up", "F2 · Brightness Up"], ["mission-control", "F3 · Mission Control"],
      ["spotlight", "F4 · Spotlight"], ["dictation", "F5 · Dictation"], ["focus", "F6 · Focus"], ["media-previous", "F7 · Previous"],
      ["media-play", "F8 · Play / Pause"], ["media-next", "F9 · Next"], ["mute", "F10 · Mute"], ["volume-down", "F11 · Volume Down"], ["volume-up", "F12 · Volume Up"],
    ].map(([id, label]) => key(`mac-${id}`, `mac-${id}`, label, ["mac"], "square", "Mac function row", "Common Mac function-row marking; exact keys vary by keyboard model and macOS version.")),
    ...Array.from({ length: 7 }, (_, index) => key(`mac-f${index + 13}`, `function-${["thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"][index]}`, `F${index + 13}`, ["mac"], "square", "Function row", "Extended Mac keyboard function key.")),
    key("mac-escape", "mac-escape", "Mac Escape", ["mac"], "wide", "Editing", "Lowercase esc legend on the reference Mac keyboard."),
    key("mac-tab", "mac-tab", "Mac Tab", ["mac"], "wide", "Editing", "Right-pointing Tab arrow on the reference Mac keyboard."),
    key("mac-caps-lock", "mac-caps-lock", "Mac Caps Lock", ["mac"], "wide", "Modifiers", "Caps Lock marking on the reference Mac keyboard."),
    key("mac-touch-ring", "mac-touch-ring", "Touch ID Sensor", ["mac"], "square", "Mac keys", "Circular Touch ID sensor appearance on the supplied full-size Mac reference; hardware varies."),
    key("mac-navigation-utility", "mac-navigation-utility", "Mac Navigation Utility", ["mac"], "square", "Navigation", "Reference-only utility-key marking on the supplied full-size Mac keyboard; its function is not established."),
    key("mac-home", "mac-home", "Mac Home", ["mac"], "square", "Navigation", "Home arrow and upper bar on the supplied Mac reference."),
    key("mac-end", "mac-end", "Mac End", ["mac"], "square", "Navigation", "End arrow and lower bar on the supplied Mac reference."),
    key("mac-page-up", "mac-page-up", "Mac Page Up", ["mac"], "square", "Navigation", "Page Up arrow on the supplied Mac reference."),
    key("mac-page-down", "mac-page-down", "Mac Page Down", ["mac"], "square", "Navigation", "Page Down arrow on the supplied Mac reference."),
    key("mac-arrow-up", "mac-arrow-up", "Mac Up Arrow", ["mac"], "square", "Navigation", "Filled up triangle on the supplied Mac reference."),
    key("mac-arrow-down", "mac-arrow-down", "Mac Down Arrow", ["mac"], "square", "Navigation", "Filled down triangle on the supplied Mac reference."),
    key("mac-arrow-left", "mac-arrow-left", "Mac Left Arrow", ["mac"], "square", "Navigation", "Filled left triangle on the supplied Mac reference."),
    key("mac-arrow-right", "mac-arrow-right", "Mac Right Arrow", ["mac"], "square", "Navigation", "Filled right triangle on the supplied Mac reference."),
    key("mac-keypad-clear-symbol", "mac-keypad-clear", "Mac Keypad Clear", ["mac"], "square", "Numeric keypad", "Symbolic Clear key on the supplied Mac keypad reference."),
    key("mac-keypad-multiply", "mac-keypad-multiply", "Mac Keypad Multiply", ["mac"], "square", "Numeric keypad", "Asterisk multiplication legend on the supplied Mac keypad reference."),
    key("mac-keypad-enter", "mac-keypad-enter", "Mac Keypad Enter", ["mac"], "tall", "Numeric keypad", "Symbolic keypad Enter on the supplied Mac reference."),
  ],
  key("mac-punct-minus", "mac-punct-minus", "- / _", ["mac"], "square", "Punctuation", "UK Mac minus and underscore key."),
    key("windows-calculator", "windows-calculator", "Calculator", ["windows"], "square", "Windows keys", "Opens Calculator on some Windows keyboards."),
    key("windows-expressive-input", "windows-expressive-input", "Expressive Input", ["windows"], "square", "Windows keys", "Opens expressive input such as emoji on some Windows keyboards."),
    key("windows-widgets", "windows-widgets", "Widgets", ["windows"], "square", "Windows keys", "Opens Windows Widgets on some keyboards."),
    key("windows-lock", "windows-lock", "Lock", ["windows"], "square", "Windows keys", "Locks the computer on some Windows keyboards."),
    key("windows-keypad-clear", "clear", "Keypad Clear", ["windows"], "square", "Numeric keypad", "Clear key on some Windows numeric keypads."),
];

const makeFrame = (width, height, d) => ({ width, height, x: (width - 24) / 2, y: (height - 24) / 2, d });
const frames = {
  square: makeFrame(48, 48, "M 10 3 L 38 3 Q 45 3 45 10 L 45 38 Q 45 45 38 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  wide: makeFrame(72, 48, "M 10 3 L 62 3 Q 69 3 69 10 L 69 38 Q 69 45 62 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  "keypad-zero": makeFrame(96, 48, "M 10 3 L 86 3 Q 93 3 93 10 L 93 38 Q 93 45 86 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  backspace: makeFrame(84, 48, "M 10 3 L 74 3 Q 81 3 81 10 L 81 38 Q 81 45 74 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  spacebar: makeFrame(240, 48, "M 10 3 L 230 3 Q 237 3 237 10 L 237 38 Q 237 45 230 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  "shift-left": makeFrame(84, 48, "M 10 3 L 74 3 Q 81 3 81 10 L 81 38 Q 81 45 74 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  "shift-right": makeFrame(96, 48, "M 10 3 L 86 3 Q 93 3 93 10 L 93 38 Q 93 45 86 45 L 10 45 Q 3 45 3 38 L 3 10 Q 3 3 10 3 Z"),
  tall: makeFrame(48, 72, "M 10 3 L 38 3 Q 45 3 45 10 L 45 62 Q 45 69 38 69 L 10 69 Q 3 69 3 62 L 3 10 Q 3 3 10 3 Z"),
  iso: { width: 60, height: 72, x: 25, y: 27, d: "M 10 3 L 50 3 Q 57 3 57 10 L 57 62 Q 57 69 50 69 L 26 69 Q 19 69 19 62 L 19 35 Q 19 32 16 32 L 10 32 Q 3 32 3 25 L 3 10 Q 3 3 10 3 Z" },
};

export function keyboardAsset(id, { mode = "keycap", scale = "Regular-M", colour, borderColour, fillColour = "none" } = {}) {
  for (const value of [colour, borderColour]) {
    if (value !== undefined && (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value))) throw new Error("Choose a six-digit hex colour.");
  }
  if (fillColour !== "none" && (typeof fillColour !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(fillColour))) throw new Error("Choose a six-digit hex fill colour or none.");
  const key = keyboardKeys.find((entry) => entry.id === id);
  if (!key || !["keycap", "symbol"].includes(mode) || !["Regular-S", "Regular-M", "Regular-L"].includes(scale)) {
    throw new Error("Choose a valid keyboard key, appearance and optical scale.");
  }
  const glyph = iconGeometry[key.icon][scale];
  const frame = frames[key.shape];
  const captionPath = mode === "keycap" ? macModifierCaptions[key.icon]?.[scale] : undefined;
  // The photographed Command legends sit at the outer ends of their captions.
  const symbolX = id === "mac-command-left" ? 17 : id === "mac-command-right" ? 40 : key.icon.endsWith("-left") ? 17 : key.icon.endsWith("-right") ? 31 : 24;
  const symbolY = id === "mac-control" ? 5 : id === "mac-command-left" ? 6 : 8;
  return {
    key, colour: colour ?? "currentColor", borderColour: borderColour ?? colour ?? "currentColor", fillColour, width: mode === "keycap" ? frame.width : 24, height: mode === "keycap" ? frame.height : 24,
    frame: mode === "keycap" ? frame.d : undefined,
    transform: mode === "keycap" ? captionPath ? `translate(${symbolX} ${symbolY})` : `translate(${frame.x} ${frame.y})` : undefined,
    captionPath,
    glyph: mode === "keycap" && id === "space" ? { ...glyph, paths: [] } : glyph,
  };
}

function escapeXml(value) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);
}

/** Font-independent; the area outside the key remains transparent. */
export function createKeyboardSvg(id, { mode = "keycap", scale = "Regular-M", height = 128, colour = "#1C1C1E", borderColour, fillColour = "none" } = {}) {
  if (!Number.isInteger(height) || height < 24 || height > 512 || !/^#[0-9A-Fa-f]{6}$/.test(colour)) {
    throw new Error("Choose a height from 24 to 512 pixels and a six-digit hex colour.");
  }
  const asset = keyboardAsset(id, { mode, scale, colour, borderColour, fillColour });
  const width = Math.round(height * asset.width / asset.height);
  const notice = iconMetadata[asset.key.icon].licenceNotice;
  const paths = asset.glyph.paths.map(({ d, fill, stroke }) => `<path d="${d}"${fill ? ` fill="${colour}"` : ""}${stroke ? ` stroke="${stroke}"` : ""} />`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${asset.width} ${asset.height}" fill="none" stroke="${colour}" stroke-linecap="round" stroke-linejoin="round"><title>${escapeXml(asset.key.label)}</title>${notice ? `<metadata>${escapeXml(notice)}</metadata>` : ""}${asset.frame ? `<path d="${asset.frame}" stroke-width="1.5" stroke="${asset.borderColour}" fill="${asset.fillColour}" />` : ""}<g stroke-width="${asset.glyph.strokeWidth}"${asset.transform ? ` transform="${asset.transform}"` : ""}>${paths}</g>${asset.captionPath ? `<path d="${asset.captionPath}" fill="${colour}" stroke="none" />` : ""}</svg>\n`;
}
