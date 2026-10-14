import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {accordionControl} from "./accordion-harness.mjs";
const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node?.props?[node,...nodes(node.props.children)]:[];
test("shared accordion owns disclosure, visibility, accessible relationships, and change callbacks",()=>{
 const changes=[];const control=accordionControl({title:"Sites",label:"Sites",children:"Content",onOpenChange:open=>changes.push(open)});
 let tree=control.render(),button=nodes(tree).find(node=>node.type==="button");
 assert.equal(tree.props["aria-label"],"Sites");assert.equal(button.props["aria-expanded"],true);assert.equal(button.props["aria-controls"],"accordion-content");
 button.props.onClick();tree=control.render();assert.equal(nodes(tree).find(node=>node.props.id==="accordion-content").props.hidden,true);assert.deepEqual(changes,[false]);
 nodes(tree).find(node=>node.type==="button").props.onClick();assert.equal(nodes(control.render()).find(node=>node.type==="button").props["aria-expanded"],true);assert.deepEqual(changes,[false,true]);
});
test("queued shared toggles preserve state and fire each callback once",()=>{
 const changes=[];const control=accordionControl({title:"Example",onOpenChange:value=>changes.push(value)});const button=nodes(control.render()).find(node=>node.type==="button");
 button.props.onClick();button.props.onClick();assert.deepEqual(changes,[false,true]);assert.equal(nodes(control.render()).find(node=>node.type==="button").props["aria-expanded"],true);
});
test("existing defaults, disabled fieldsets, closed initial state, and Advanced artwork remain compatible",()=>{
 const control=accordionControl({title:"Advanced",defaultOpen:false,children:"Content"},true);let tree=control.render();assert.equal(nodes(tree).find(node=>node.type==="fieldset").props.disabled,true);assert.equal(nodes(tree).find(node=>node.props.id==="accordion-content").props.hidden,true);
 nodes(tree).find(node=>node.type==="button").props.onClick();tree=control.render();assert.equal(nodes(tree).find(node=>node.type==="svg").props.className,"is-expanded-advanced");
 const defaults=accordionControl({title:"Example"});assert.equal(nodes(defaults.render()).find(node=>node.type==="button").props["aria-expanded"],true);
});
test("Sites and the UI Library inherit the same accordion and its styling",()=>{
 const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
 const sites=read("app/studio/project-local-links.tsx"),css=read("app/studio/studio.css");assert.match(sites,/<InspectorAccordionSection className="studio-local-sites"/);assert.doesNotMatch(sites,/<details|<summary/);assert.doesNotMatch(css,/\.studio-local-sites summary/);assert.match(read("app/studio/ui/controls/control-specimen.tsx"),/<InspectorAccordionSection title="Example settings"/);
});
