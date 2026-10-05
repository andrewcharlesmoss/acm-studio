import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, overrides = {}, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const dependency = id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.endsWith(".css")) return {};
    if (!id.startsWith(".")) return require(id);
    const base = resolve(dirname(file), id);
    const path = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`].find(existsSync);
    return load(path, overrides, cache);
  };
  vm.runInNewContext(source, { exports, require: dependency, console, URL, Map, Set, structuredClone, crypto: require("node:crypto").webcrypto });
  return exports;
}

const { marksAtCaret, changeCaretMark, formatCaretInsertion } = load("app/content/caret-formatting.ts");
const { highlightRangeAtCaret, updateHighlightColour } = load("app/content/text-highlight.ts");
const { applyTableStructureAction } = load("app/content/table-actions.ts");
const { fieldSelectOptions } = load("app/content/field-options.ts");
const { blockInserterOptions, parentOfNestedBlock, groupAllowsChild, permitsBlockTreeChanges } = load("app/studio/block-inserter-options.ts");
const { editBlockSiblings, moveBlockAmongSiblings, reorderBlockAmongSiblings } = load("app/studio/block-sibling-operations.ts");
const { cloneBlocksForInsertion, copiedBlocksForParent } = load("app/studio/block-copy.ts");
const { availableBlockTransforms, transformBlock } = load("app/studio/block-transforms.ts");
const { withoutInteractiveTextMarks, replaceTextRange } = load("app/content/rich-text.ts");
const { contentMediaIds } = load("app/content/media-references.ts");
const { validContentBlocks } = load("app/studio/workspace-validation.ts");
const { preservesBlockLocks } = load("app/content/block-editorial.ts");
const { createButtonForInsertion, insertedBlockSelectionId } = load("app/studio/button-insertion.ts");
const { createBlock } = load("app/studio/editor-model.ts");
const { useStudioBlockCommands } = load("app/studio/use-studio-block-commands.ts");
const { sameLinkDestination, equivalentLinkDestination, updatedLinkDestination } = load("app/content/link-destination.ts");
const plain = value => JSON.parse(JSON.stringify(value));

test("collapsed rich-text replacement inserts at the caret and preserves surrounding runs", () => {
  const runs = [{ text: "first", marks: ["bold"] }, { text: "second", marks: ["italic"] }];
  const before = structuredClone(runs);
  for (const offset of [0, 2, 5, 8, 11]) {
    const next = replaceTextRange(runs, offset, offset, "X");
    assert.equal(next.map(run => run.text).join(""), `${"firstsecond".slice(0, offset)}X${"firstsecond".slice(offset)}`);
    assert.deepEqual(plain(next.find(run => run.text.includes("X")).marks), [offset <= 5 ? "bold" : "italic"]);
  }
  assert.deepEqual(plain(replaceTextRange(runs, 5, 5, "X")), [{ text: "firstX", marks: ["bold"] }, { text: "second", marks: ["italic"] }]);
  assert.deepEqual(plain(replaceTextRange(runs, 2, 2, "")), runs);
  assert.deepEqual(plain(replaceTextRange([], 0, 0, "X")), [{ text: "X" }]);
  assert.deepEqual(plain(replaceTextRange(runs, -1, -1, "X")), runs);
  assert.deepEqual(plain(replaceTextRange(runs, 12, 12, "X")), runs);
  assert.equal(replaceTextRange(runs, 2, 8, "X").map(run => run.text).join(""), "fiXond");
  assert.deepEqual(runs, before);
});

test("actual Button destination callback rejects stale or unavailable owners and skips no-op history", () => {
  const source = readFileSync("app/studio/studio-canvas.tsx", "utf8");
  const body = source.match(/onApply=\{\(draft, baseline\) => \{([\s\S]*?)\}\} onUnlink=/)?.[1];
  assert.ok(body);
  const button = { id: "owned-button", type: "button", label: "Continue", labelRuns: [{ text: "Continue", marks: ["bold"] }], url: "/next", opensInNewTab: false, rel: "", title: "Keep title" };
  const owner = { id: "owned-document", blocks: [button] };
  const updates = [];
  const context = {
    currentDocumentRef: { current: owner }, activeDocument: owner, writableRef: { current: true }, block: button,
    findBlockById: (blocks, id) => blocks.find(item => item.id === id), sameLinkDestination, equivalentLinkDestination, updatedLinkDestination,
    onUpdateBlock: (id, updater) => updates.push({ id, value: updater(context.currentDocumentRef.current.blocks[0]) }),
  };
  const apply = vm.runInNewContext(`(draft, baseline) => {${body}}`, context);
  const draft = { url: "/next", opensInNewTab: false, nofollow: false };
  assert.equal(apply(draft, button), null);
  assert.equal(updates.length, 0, "unchanged explicit defaults create no history entry");
  for (const changed of [{ url: "/other" }, { opensInNewTab: true }, { rel: "nofollow" }]) {
    context.currentDocumentRef.current = { ...owner, blocks: [{ ...button, ...changed }] };
    assert.match(apply(draft, button), /link changed/);
  }
  context.currentDocumentRef.current = { ...owner, id: "another-document" };
  assert.match(apply(draft, button), /no longer editable/);
  context.currentDocumentRef.current = owner; context.writableRef.current = false;
  assert.match(apply(draft, button), /no longer editable/);
  context.writableRef.current = true;
  assert.match(apply({ ...draft, url: "javascript:alert(1)" }, button), /full URL/);
  assert.equal(updates.length, 0);
  assert.equal(apply({ ...draft, url: "/changed" }, button), null);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].value.url, "/changed");
  assert.deepEqual(updates[0].value.labelRuns, button.labelRuns);
  assert.equal(updates[0].value.title, button.title);
});

test("Button rich labels require a matching plain projection and non-interactive marks", () => {
  const button = { id: "rich-button", type: "button", label: "Continue", url: "/continue", style: "primary" };
  assert.equal(validContentBlocks([button]), true);
  assert.equal(validContentBlocks([{ ...button, labelRuns: [{ text: "Continue", marks: ["bold", "italic"] }] }]), true);
  assert.equal(validContentBlocks([{ ...button, labelRuns: [{ text: "Different" }] }]), false);
  for (const mark of [{ type: "link", url: "/nested" }, { type: "footnote", id: "note" }, "unknown-format"]) {
    assert.equal(validContentBlocks([{ ...button, labelRuns: [{ text: "Continue", marks: [mark] }] }]), false);
  }
});

test("Button formatting strips interactive marks while retaining other text formatting", () => {
  const runs = [{ text: "Continue", marks: ["bold", { type: "link", url: "/nested" }, "italic", { type: "footnote", id: "note" }] }];
  const before = structuredClone(runs);
  assert.deepEqual(plain(withoutInteractiveTextMarks(runs)), [{ text: "Continue", marks: ["bold", "italic"] }]);
  assert.deepEqual(runs, before);
});

test("Button copying and paragraph transformation retain rich labels without copying them into new siblings", () => {
  const source = { id: "source-rich", type: "button", label: "Continue", labelRuns: [{ text: "Continue", marks: ["bold"] }], url: "/continue", style: "primary" };
  const copy = cloneBlocksForInsertion([source])[0];
  assert.notEqual(copy.id, source.id);
  assert.deepEqual(plain(copy.labelRuns), source.labelRuns);
  copy.labelRuns[0].marks.push("italic");
  assert.deepEqual(source.labelRuns[0].marks, ["bold"]);
  const paragraph = transformBlock(source, { id: "paragraph", target: "paragraph", label: "Paragraph", icon: "paragraph" });
  assert.equal(paragraph.text, source.label);
  assert.deepEqual(plain(paragraph.runs), source.labelRuns);
  assert.equal(validContentBlocks([paragraph]), true);
  assert.equal(createButtonForInsertion("empty-rich", source).labelRuns, undefined);
});

test("inline images in nested Button labels are included in media references", () => {
  const button = { id: "image-button", type: "button", label: "Image", labelRuns: [{ text: "Image", marks: [{ type: "inline-image", mediaId: "label-image", alt: "Illustration" }] }], url: "", style: "primary" };
  assert.equal(validContentBlocks([button]), true);
  assert.deepEqual(plain(contentMediaIds([{ id: "buttons-media", type: "buttons", children: [button] }])), ["label-image"]);
});

test("inserted Button focus hand-off preserves a caret already placed in a pasted child", () => {
  const compiled = ts.transpileModule(readFileSync("app/studio/studio-canvas.tsx", "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const effect = compiled.match(/const previous = previousButtonIdsRef\.current;([\s\S]*?)\}, \[activeDocument\.blocks, activeDocument\.id, previewing, selectedBlockId, writable\]\);/);
  assert.ok(effect, "exercise the actual insertion-focus effect body");
  const first = { id: "first", type: "button" };
  const copied = { id: "copied", type: "button" };
  const field = { dataset: { studioBlockId: copied.id }, contains: () => false };
  const state = {
    activeDocument: { id: "document", blocks: [first, copied] }, writable: true, previewing: false, selectedBlockId: "copied-group",
    previousButtonIdsRef: { current: { documentId: "document", ids: new Set([first.id]) } }, pendingButtonFocusRef: { current: new Set() },
    canvasScrollRef: { current: { querySelectorAll: () => [field] } }, document: { activeElement: {} },
    orderedBlockEntries: blocks => blocks.map(block => ({ id: block.id })), findBlockById: (blocks, id) => blocks.find(block => block.id === id),
    focusRichTextEditorAtOffset: (_editor, offset) => focuses.push(offset),
  };
  const focuses = [];
  function render() { vm.runInNewContext(`(() => { const previous = previousButtonIdsRef.current; ${effect[1]} })()`, state); }
  render();
  assert.equal(state.pendingButtonFocusRef.current.has(copied.id), true);
  state.selectedBlockId = copied.id; state.document.activeElement = field;
  render();
  assert.deepEqual(focuses, [], "pointer placement in a copied label is retained");
  assert.equal(state.pendingButtonFocusRef.current.has(copied.id), false);
  const inserted = { id: "inserted", type: "button" };
  state.activeDocument.blocks.push(inserted); state.selectedBlockId = first.id;
  render();
  field.dataset.studioBlockId = inserted.id; state.selectedBlockId = inserted.id; state.document.activeElement = {};
  render();
  assert.deepEqual(focuses, [0], "a separate selection render focuses the new label once");
  render();
  assert.deepEqual(focuses, [0]);
});

test("Button insertion starts empty and selects the Buttons initial child", () => {
  const button = createBlock("button", "new-button");
  assert.deepEqual(plain(button), { id: "new-button", type: "button", label: "", url: "", style: "primary" });
  const group = createBlock("buttons", "new-buttons");
  assert.equal(insertedBlockSelectionId(group), group.children[0].id);
  assert.equal(insertedBlockSelectionId(button), button.id);
  assert.equal(insertedBlockSelectionId({ id: "empty", type: "buttons", children: [] }), "empty");
  assert.equal(validContentBlocks([group, button]), true);
});

test("new Button appearance excludes neighbouring content, anchors and product metadata", () => {
  const source = { id: "source", type: "button", label: "Source", url: "https://example.test/source", style: "secondary", title: "Source title", opensInNewTab: true, rel: "nofollow", width: 50, align: "right", visualStyle: { anchor: "unique", backgroundColor: "#123456", padding: "8px" }, interactionStyles: { hover: { width: 25, textColor: "#FFFFFF" } }, editorial: { name: "Named", note: "Private", hidden: true, lock: { remove: true } }, siteRole: "source-action" };
  const snapshot = structuredClone(source);
  const button = createButtonForInsertion("new", source);
  assert.deepEqual(plain(button), { id: "new", type: "button", label: "", url: "", style: "secondary", width: 50, align: "right", visualStyle: { backgroundColor: "#123456", padding: "8px" }, interactionStyles: { hover: { width: 25, textColor: "#FFFFFF" } } });
  button.visualStyle.padding = "12px";
  button.interactionStyles.hover.width = 75;
  assert.deepEqual(source, snapshot);
});

test("Buttons end appender inherits the last child and replays with stable fresh identity", () => {
  const first = { id: "first", type: "button", label: "First", url: "/first", style: "primary" };
  const last = { id: "last", type: "button", label: "Last", url: "/last", style: "secondary", width: 50, visualStyle: { anchor: "last-anchor", textColor: "#123456" } };
  let document = { blocks: [{ id: "outer", type: "group", layout: "flow", children: [{ id: "buttons", type: "buttons", children: [first, last] }] }] };
  const commands = useStudioBlockCommands({ activeDocument: document, updateActiveDocument: update => {
    const next = update(document);
    assert.deepEqual(plain(update(document)), plain(next));
    document = next;
  } });
  const added = commands.insertBlock("button", null, "buttons");
  const children = document.blocks[0].children[0].children;
  assert.equal(children.length, 3);
  assert.equal(children[2].id, added.id);
  assert.notEqual(added.id, first.id);
  assert.notEqual(added.id, last.id);
  assert.equal(children[2].label, "");
  assert.equal(children[2].url, "");
  assert.equal(children[2].style, "secondary");
  assert.equal(children[2].width, 50);
  assert.equal(children[2].visualStyle.anchor, undefined);
  assert.equal(children[2].visualStyle.textColor, "#123456");
  assert.equal(validContentBlocks(document.blocks), true);
});

test("Button sibling additions keep their owning Buttons list and existing locks", () => {
  const source = { id: "source", type: "button", label: "Keep", url: "/keep", style: "secondary", editorial: { lock: { move: true, remove: true } } };
  const group = { id: "buttons", type: "buttons", children: [source] };
  const tree = [{ id: "outer", type: "group", layout: "flow", children: [group] }, { id: "other", type: "paragraph", text: "Unrelated" }];
  for (const after of [false, true]) {
    const added = createButtonForInsertion(`new-${after}`, source);
    const next = editBlockSiblings(tree, source.id, (siblings, index) => [...siblings.slice(0, index + Number(after)), added, ...siblings.slice(index + Number(after))]);
    assert.deepEqual(next[0].children[0].children.map(button => button.id), after ? ["source", "new-true"] : ["new-false", "source"]);
    assert.equal(next[1], tree[1]);
    assert.equal(preservesBlockLocks(tree, next), true);
    assert.equal(permitsBlockTreeChanges(tree, next), true);
    assert.equal(validContentBlocks(next), true);
  }
});

test("Buttons insertion refuses missing parents, non-Button children and the child limit", () => {
  let writes = 0;
  const full = { id: "full", type: "buttons", children: Array.from({ length: 100 }, (_, index) => createButtonForInsertion(`child-${index}`)) };
  const commands = useStudioBlockCommands({ activeDocument: { blocks: [full] }, updateActiveDocument: () => { writes++; } });
  assert.equal(commands.insertBlock("button", null, "missing"), null);
  assert.equal(commands.insertBlock("paragraph", null, "full"), null);
  assert.equal(commands.insertBlock("button", null, "full"), null);
  assert.equal(writes, 0);
});

test("caret formats toggle without editing existing content, and carry only to insertion at that caret", () => {
  const marks = changeCaretMark(["italic"], "bold");
  assert.deepEqual(plain(marks), ["italic", "bold"]);
  assert.deepEqual(plain(changeCaretMark(marks, "bold")), ["italic"]);
  const next = formatCaretInsertion("ab", [{ text: "aXb" }], 1, marks);
  assert.deepEqual(plain(next), { runs: [{text:"a"},{text:"X",marks:["italic","bold"]},{text:"b"}], offset:2, text:"aXb" });
  assert.equal(formatCaretInsertion("ab", [{text:"abX"}], 1, marks), null);
  assert.equal(formatCaretInsertion("ab", [{text:"a"}], 1, marks), null);
  assert.deepEqual(plain(marksAtCaret([{text:"ab",marks:["bold"]}],1)), ["bold"]);
  assert.deepEqual(plain(formatCaretInsertion("",[{text:"hello"}],0,["keyboard"]).runs), [{text:"hello",marks:["keyboard"]}]);
});

test("explicit removal overrides inherited browser markup on subsequent input", () => {
  const next = formatCaretInsertion("ab", [{text:"aXb",marks:["bold"]}],1,[]);
  assert.deepEqual(plain(next.runs), [{text:"a",marks:["bold"]},{text:"X"},{text:"b",marks:["bold"]}]);
});

test("caret highlight updates the existing contiguous format without losing other marks", () => {
  const highlight = {type:"highlight",textColor:"#FF383C",backgroundColor:"#FFFF00"};
  const runs = [{text:"one",marks:[highlight,"bold"]},{text:"two",marks:[highlight,"italic"]},{text:"rest"}];
  assert.deepEqual(plain(highlightRangeAtCaret(runs,2)),{start:0,end:6});
  assert.equal(highlightRangeAtCaret(runs,6),null);
  const next = updateHighlightColour(runs,0,6,"textColor");
  assert.deepEqual(plain(next[0].marks),["bold",{type:"highlight",backgroundColor:"#FFFF00"}]);
  assert.equal(plain(runs)[0].marks[0].textColor,"#FF383C");
});

test("table structure commands move rich runs, alignments and metadata together without mutating source", () => {
  const table={id:"table",type:"table",rows:[["A","B"],["C","D"]],cellRuns:[[[{text:"A",marks:["bold"]}],[{text:"B"}]],[[{text:"C"}],[{text:"D",marks:["italic"]}]]],columnAlignments:["centre","right"],columnWidths:[40,60],rowHeights:[60,70],cellMetadata:[[{tag:"th",scope:"row"},null],[null,null]]};
  const column=applyTableStructureAction(table,"insert-column-before",{rowIndex:0,columnIndex:0}).block;
  assert.deepEqual(plain(column.rows),[["","A","B"],["","C","D"]]);
  assert.deepEqual(plain(column.columnAlignments),["left","centre","right"]);
  assert.deepEqual(plain(column.cellRuns[0][1]),[{text:"A",marks:["bold"]}]);
  const row=applyTableStructureAction(column,"insert-row-after",{rowIndex:0,columnIndex:0}).block;
  assert.deepEqual(plain(row.cellRuns[2][2]),[{text:"D",marks:["italic"]}]);
  const original=applyTableStructureAction(applyTableStructureAction(row,"delete-row",{rowIndex:1,columnIndex:0}).block,"delete-column",{rowIndex:0,columnIndex:0}).block;
  assert.deepEqual(plain(original),plain(table));
  assert.deepEqual(table.rows,[["A","B"],["C","D"]]);
});

test("last cell deletion clears the table and invalid active cells never mutate it", () => {
  const table = { id: "t", type: "table", rows: [["Only"]] };
  for (const action of ["delete-row", "delete-column"]) {
    const result = applyTableStructureAction(table, action, { rowIndex: 0, columnIndex: 0 });
    assert.deepEqual(plain(result.block.rows), []);
    assert.equal(result.activeCell, null);
  }
  for (const cell of [undefined, null, { rowIndex: -1, columnIndex: 0 }, { rowIndex: 0, columnIndex: -1 }, { rowIndex: 1, columnIndex: 0 }]) {
    assert.equal(applyTableStructureAction(table, "insert-row-before", cell), null);
  }
});

test("Button is offered only inside Buttons; catalogue and legacy data remain untouched", () => {
  const items=[{type:"paragraph",label:"Paragraph",description:""},{type:"buttons",label:"Buttons",description:""},{type:"button",label:"Button",description:""}];
  assert.deepEqual(plain(blockInserterOptions(items,undefined,"").map(item=>item.type)),["paragraph","buttons"]);
  assert.deepEqual(plain(blockInserterOptions(items,{type:"buttons",children:[]},"").map(item=>item.type)),["button"]);
  assert.equal(items.length,3);
});

test("Field option presentation preserves choices and a saved value absent from choices", () => {
  assert.deepEqual(plain(fieldSelectOptions({type:"field",value:"Saved",options:["A","A","B"]})),["Saved","A","B"]);
  assert.deepEqual(plain(fieldSelectOptions({type:"field",value:"B",options:["A","B"]})),["A","B"]);
});

test("caret boundary affinity matches Gutenberg default: outside formatted edges and right on equal counts", () => {
  const red={type:"highlight",textColor:"#FF0000"}, blue={type:"highlight",textColor:"#0000FF"};
  const runs=[{text:"a"},{text:"red",marks:[red]},{text:"blue",marks:[blue]},{text:"z"}];
  assert.deepEqual(plain(marksAtCaret(runs,1)),[]);
  assert.deepEqual(plain(marksAtCaret(runs,4)),[blue]);
  assert.deepEqual(plain(highlightRangeAtCaret(runs,4)),{start:4,end:8});
  assert.deepEqual(plain(marksAtCaret(runs,8)),[]);
  assert.equal(highlightRangeAtCaret(runs,8),null);
  assert.deepEqual(plain(marksAtCaret([{text:"all",marks:[red]}],3)),[]);
  const source=readFileSync("app/studio/studio-canvas.tsx","utf8");
  assert.match(source,/key=\{JSON\.stringify\(\[block\.id, headerRowCount, footerRowCount, block\.rows\.map/);
});


test("nested sibling operations target the owning list and preserve other branches", () => {
  const a={id:"a",type:"paragraph",text:"A"}, b={id:"b",type:"paragraph",text:"B"};
  const group={id:"g",type:"group",layout:"flow",children:[a,b]};
  const other={id:"other",type:"group",layout:"flow",children:[{id:"c",type:"paragraph",text:"C"}]};
  const blocks=[group,other];
  const moved=moveBlockAmongSiblings(blocks,"b",-1);
  assert.deepEqual(plain(moved[0].children.map(block=>block.id)),["b","a"]);
  assert.equal(moved[1],other);
  assert.equal(moveBlockAmongSiblings(blocks,"a",-1),blocks);
  assert.equal(editBlockSiblings(blocks,"missing",()=>[]),blocks);
  assert.equal(reorderBlockAmongSiblings(blocks,"a","c",false),blocks);
  assert.deepEqual(plain(reorderBlockAmongSiblings(blocks,"a","b",true)[0].children.map(block=>block.id)),["b","a"]);
  assert.deepEqual(group.children,[a,b]);
  const locked=[{...group,children:[{...a,editorial:{lock:{move:true}}},b]},other];
  assert.equal(preservesBlockLocks(locked,moveBlockAmongSiblings(locked,"b",-1)),false);
});

test("sibling operations also traverse nested list children without touching items", () => {
  const nested={id:"nested",type:"list",style:"unordered",items:["one"]};
  const sibling={id:"sibling",type:"list",style:"unordered",items:["two"]};
  const item={text:"parent",children:[nested,sibling]};
  const blocks=[{id:"root",type:"list",style:"unordered",items:[item,"outside"]}];
  const next=moveBlockAmongSiblings(blocks,"sibling",-1);
  assert.deepEqual(plain(next[0].items[0].children.map(block=>block.id)),["sibling","nested"]);
  assert.equal(next[0].items[1],"outside");
  assert.deepEqual(item.children,[nested,sibling]);
});

test("all insertion copies clear anchors and remap bundled notes and descendant IDs once", () => {
  const source=[{id:"group",type:"group",layout:"flow",visualStyle:{anchor:"group-anchor"},children:[
    {id:"p",type:"paragraph",text:"ref",style:{anchor:"p-anchor"},runs:[{text:"ref",marks:[{type:"footnote",id:"note"}]}]},
    {id:"notes",type:"footnotes",notes:[{id:"note",text:"Explanation"}]},
    {id:"list",type:"list",style:"unordered",items:[{text:"item",style:{anchor:"item-anchor"},children:[{id:"nested",type:"list",style:"unordered",items:["child"]}]}]}
  ]}];
  let sequence=0;
  const [copy]=cloneBlocksForInsertion(source,prefix=>prefix+"-"+(++sequence));
  assert.equal(copy.visualStyle.anchor,undefined);
  assert.equal(copy.children[0].style.anchor,undefined);
  assert.equal(copy.children[2].items[0].style.anchor,undefined);
  assert.equal(copy.children[0].runs[0].marks[0].id,copy.children[1].notes[0].id);
  assert.notEqual(copy.children[2].items[0].children[0].id,"nested");
  assert.equal(source[0].children[0].runs[0].marks[0].id,"note");
  assert.equal(source[0].visualStyle.anchor,"group-anchor");
});

test("nested toolbar consumers share the renderer, duplication and table focus contract", () => {
  const canvas=readFileSync("app/studio/studio-canvas.tsx","utf8");
  const css=readFileSync("app/studio/studio.css","utf8");
  assert.equal((canvas.match(/className=\{`canvas-block-toolbar/g)||[]).length,1);
  assert.match(canvas,/function renderBlockControls\(block: ContentBlock\)/);
  assert.match(canvas,/renderBlockControls\?\.\(column\)/);
  assert.match(canvas,/props\.renderBlockControls\?\.\(child\)/);
  assert.match(canvas,/void runBlockMenuAction\("duplicate", block\)/);
  assert.equal((canvas.match(/focusTableCell\(block\.id, result\.activeCell\)/g)||[]).length,1);
  assert.match(css,/studio-nested-block\[data-studio-selected="true"\] > \.canvas-block-toolbar/);
  assert.doesNotMatch(css,/canvas-block\.is-selected \.canvas-block-toolbar \{/);
});

test("transform options honour structural parents and restricted Group choices", () => {
  const paragraph={id:"p",type:"paragraph",text:"Text"};
  assert.equal(availableBlockTransforms(paragraph,{id:"g",type:"group",layout:"flow",allowedBlocks:["paragraph"],children:[paragraph]}).length,0);
  assert.deepEqual(plain(availableBlockTransforms(paragraph,{id:"g",type:"group",layout:"flow",allowedBlocks:["heading"],children:[paragraph]}).map(option=>option.target)),Array(6).fill("heading"));
  assert.equal(availableBlockTransforms({id:"b",type:"button",label:"Button",url:"",style:"primary"},{id:"bs",type:"buttons",children:[]}).length,0);
  assert.equal(groupAllowsChild({type:"columns"},"paragraph"),false);
  assert.equal(groupAllowsChild({type:"social-icons"},"heading"),false);
  const nested={id:"nested",type:"list",style:"unordered",items:["Text"]};
  const outer={id:"outer",type:"list",style:"unordered",items:[{text:"Item",children:[nested]}]};
  assert.equal(parentOfNestedBlock([outer],"nested"),outer);
  assert.equal(availableBlockTransforms(nested,outer).length,0);
});

test("copied Column and Social Link fragments retain content and acquire required parents only when needed", () => {
  const column={id:"c",type:"column",children:[{id:"p",type:"paragraph",text:"Keep"}]};
  const columns=copiedBlocksForParent([column],undefined,type=>type+"-wrapper");
  assert.equal(validContentBlocks(columns),true);
  assert.equal(columns[0].children[0],column);
  assert.deepEqual(plain(copiedBlocksForParent([column],"columns")),[column]);
  const social={id:"s",type:"social-linkedin",url:"https://www.linkedin.com/",label:"Link"};
  const links=copiedBlocksForParent([social],undefined,type=>type+"-wrapper");
  assert.equal(validContentBlocks(links),true);
  assert.equal(links[0].children[0],social);
  assert.deepEqual(plain(copiedBlocksForParent([social],"social-icons")),[social]);
  assert.equal(validContentBlocks(copiedBlocksForParent([{...column,width:-1}])),false);
  assert.equal(validContentBlocks(copiedBlocksForParent([{...social,url:7}])),false);
  assert.equal(validContentBlocks(copiedBlocksForParent([column,social])),false);
});

test("nested HTML edits validate the document proposal and Social children share hidden presentation", () => {
  const html=readFileSync("app/studio/studio-html-editor.ts","utf8");
  const canvas=readFileSync("app/studio/studio-canvas.tsx","utf8");
  assert.match(html,/contextBlocks \? editBlockSiblings\(contextBlocks, original\.id/);
  assert.match(html,/validContentBlocks\(proposal\)/);
  assert.match(canvas,/parseHtmlToBlock\(htmlEditor\.draft, block, activeDocument\.blocks\)/);
  assert.match(canvas,/if \(!applyBlockList\(next, true\)\) return/);
  assert.match(canvas,/htmlEditorBlockId === child\.id \? null : child\.editorial\?\.hidden \? <HiddenBlockPlaceholder/);
});


test("all proposal paths enforce allowed children while retaining existing excluded content", () => {
  const p={id:"p",type:"paragraph",text:"Keep"};
  const oldHeading={id:"existing",type:"heading",level:2,text:"Saved"};
  const group={id:"g",type:"group",layout:"flow",allowedBlocks:["paragraph"],children:[p,oldHeading]};
  assert.equal(permitsBlockTreeChanges([group],[{...group,children:[{...p,text:"Edited"},oldHeading]}]),true);
  assert.equal(permitsBlockTreeChanges([group],[{...group,children:[oldHeading,p]}]),true);
  assert.equal(permitsBlockTreeChanges([group],[{...group,children:[p,oldHeading,{...oldHeading,id:"new"}]}]),false);
  assert.equal(permitsBlockTreeChanges([group],[{...group,children:[{...oldHeading,id:"p"},oldHeading]}]),false);
  const columns={id:"cols",type:"columns",children:[{...group,id:"col",type:"column",layout:undefined}]};
  assert.equal(permitsBlockTreeChanges([columns],[{...columns,children:[{...columns.children[0],children:[p,oldHeading,{...oldHeading,id:"new"}]}]}]),false);
  const newGroup={id:"new-group",type:"group",layout:"flow",allowedBlocks:["paragraph"],children:[oldHeading]};
  assert.equal(permitsBlockTreeChanges([], [newGroup]),false);
  assert.match(readFileSync("app/studio/studio-canvas.tsx","utf8"),/!permitsBlockTreeChanges\(activeDocument\.blocks, blocks\)/);
});


test("Column HTML preserves implicit width and shares its Advanced serialisation", () => {
  const {blockToHtml}=load("app/studio/studio-html-editor.ts");
  const column={id:"c",type:"column",style:{anchor:"column-anchor",className:"column-custom"},children:[{id:"p",type:"paragraph",text:"Keep"}]};
  const direct=blockToHtml(column);
  assert.doesNotMatch(direct,/data-column-width=/);
  assert.match(direct,/data-html-anchor="column-anchor"/);
  assert.match(direct,/data-additional-classes="column-custom"/);
  const container=blockToHtml({id:"cols",type:"columns",children:[column]});
  assert.ok(container.includes(direct));
  assert.match(blockToHtml({...column,width:40}),/data-column-width="40"/);
});

const commands = load("app/studio/studio-command-operations.mjs");
const selection = load("app/studio/block-selection.mjs");
const { childContentBlocks } = load("app/content/block-tree.ts");
function nestedLists() {
  const list = (id, text = id) => ({ id, type: "list", style: "unordered", items: [text] });
  return [{ id: "root-list", type: "list", style: "ordered", items: [
    { text: "Owner one", style: { anchor: "owner-one" }, children: [
      { ...list("one"), visualStyle: { anchor: "nested-anchor", backgroundColor: "#fff3cd" }, items: [{ text: "Nested", children: [list("deep")] }] },
      list("two"),
    ] },
    { text: "Owner two", children: [list("other")] },
  ] }];
}

test("shared block traversal includes every nested List with its block ancestry", () => {
  const blocks = nestedLists();
  assert.deepEqual(plain(childContentBlocks(blocks[0]).map(block => block.id)), ["one", "two", "other"]);
  assert.equal(commands.findBlockById(blocks, "deep").id, "deep");
  assert.equal(commands.findBlockById(blocks, "missing"), null);
  assert.deepEqual(plain(selection.orderedBlockEntries(blocks).map(entry => [entry.id, entry.ancestors])), [
    ["root-list", []], ["one", ["root-list"]], ["deep", ["root-list", "one"]], ["two", ["root-list"]], ["other", ["root-list"]],
  ]);
  assert.deepEqual(plain(selection.normaliseBlockSelection(blocks, ["deep", "one", "other"])), ["one", "other"]);
});

test("nested List updates, copies and removal preserve item ownership and valid storage", () => {
  const document = { blocks: nestedLists() };
  const updated = commands.updateBlockById(document, "deep", block => ({ ...block, style: "ordered", start: 7 }));
  assert.equal(commands.findBlockById(updated.blocks, "deep").start, 7);
  assert.equal(updated.blocks[0].items[1], document.blocks[0].items[1]);
  assert.equal(commands.updateBlockById(document, "missing", block => block), document);
  let count = 0;
  const copied = commands.duplicateNestedBlockById(updated, "one", type => `${type}-${++count}`);
  const siblings = copied.blocks[0].items[0].children;
  assert.equal(siblings.length, 3);
  assert.notEqual(siblings[1].id, siblings[0].id);
  assert.notEqual(siblings[1].items[0].children[0].id, "deep");
  assert.equal(siblings[1].visualStyle.anchor, undefined);
  assert.equal(siblings[0].visualStyle.anchor, "nested-anchor");
  assert.equal(validContentBlocks(copied.blocks), true);
  const removed = commands.removeBlocksByIds(document, ["one", "two"]);
  assert.equal(removed.blocks[0].items[0].children, undefined);
  assert.equal(removed.blocks[0].items[0].style.anchor, "owner-one");
  assert.equal(removed.blocks[0].items[1], document.blocks[0].items[1]);
  assert.equal(validContentBlocks(removed.blocks), true);
  const siblingRemoved = editBlockSiblings(document.blocks, "other", (siblings, index) => siblings.filter((_block, position) => position !== index));
  assert.equal(siblingRemoved[0].items[1].children, undefined);
  assert.equal(validContentBlocks(siblingRemoved), true);
});

test("nested List movements stay within one item and protect locked descendants", () => {
  const blocks = nestedLists();
  assert.equal(moveBlockAmongSiblings(blocks, "two", 1), blocks);
  assert.equal(reorderBlockAmongSiblings(blocks, "two", "other", true), blocks);
  assert.deepEqual(plain(moveBlockAmongSiblings(blocks, "two", -1)[0].items[0].children.map(block => block.id)), ["two", "one"]);
  const locked = commands.updateBlockById({ blocks }, "deep", block => ({ ...block, editorial: { lock: { remove: true } } }));
  assert.equal(commands.removeBlocksByIds(locked, ["root-list"]), locked);
  assert.equal(commands.removeNestedBlockById(locked, "one"), locked);
  const removed = commands.removeNestedBlockById({ blocks }, "other");
  const history = commands.commitHistory({ blocks }, []);
  assert.deepEqual(plain(commands.undoHistory(removed, history.history, history.future).workspace), plain({ blocks }));
});

test("all duplication entry points share fresh IDs and anchor clearing", () => {
  const document = { id: "doc", kind: "page", title: "Example", slug: "example", blocks: nestedLists() };
  let count = 0;
  const copied = commands.duplicateBlockAt(document, 0, type => `${type}-${++count}`).blocks[1];
  assert.equal(copied.items[0].style.anchor, undefined);
  assert.equal(copied.items[0].children[0].visualStyle.anchor, undefined);
  assert.equal(copied.items[0].children[0].visualStyle.backgroundColor, "#fff3cd");
  assert.equal(document.blocks[0].items[0].style.anchor, "owner-one");
  const whole = commands.duplicateDocumentWithIds(document, () => "new-doc", type => `${type}-${++count}`);
  assert.equal(whole.id, "new-doc");
  assert.equal(validContentBlocks(whole.blocks), true);
  assert.equal(whole.blocks[0].items[0].children[0].visualStyle.anchor, undefined);
});

test("nested List edit, preview, outline and specimens share identity and presentation contracts", () => {
  const canvas = readFileSync("app/studio/studio-canvas.tsx", "utf8");
  const renderer = readFileSync("app/components/content.tsx", "utf8");
  const specimen = readFileSync("app/studio/ui/blocks/block-specimen-catalogue.tsx", "utf8");
  assert.match(canvas, /list-field-nested studio-nested-block/);
  assert.match(canvas, /data-studio-block-id=\{list.id\}/);
  assert.match(canvas, /selectedEditor.dataset.studioBlockId === target.id/);
  assert.match(canvas, /if \(editor\) restoreEditorSelection\(editor, targetSelection\)/);
  assert.match(canvas, /delete next\[blockId\]/);
  assert.match(canvas, /canMoveItem\(block.id, -1\)/);
  assert.match(renderer, /renderListBlock\(block, studio, mediaUrls, footnoteNumbers, child => renderBlock\(child\)\)/);
  assert.match(specimen, /childContentBlocks\(block\).forEach\(visit\)/);
  assert.match(specimen, /editBlockSiblings\(blocks, replacement.id/);
});
